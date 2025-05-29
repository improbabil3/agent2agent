"""
Agent B - Math Calculator Agent
===============================

Questo agente implementa il protocollo Agent2Agent (A2A) per calcoli matematici avanzati.
Fornisce capacità di calcolo matematico attraverso JSON-RPC 2.0 con supporto real-time.

Funzionalità matematiche:
- Operazioni base: add, subtract, multiply, divide
- Operazioni avanzate: power, sqrt, factorial
- Funzioni trigonometriche: sin, cos, tan (in gradi)
- Gestione errori matematici (divisione per zero, radici negative, etc.)
- Validazione input e controllo tipi

Endpoints conformi A2A:
- GET /.well-known/agent.json - Agent Card per discovery
- GET /status - Health check con statistiche
- POST /rpc - JSON-RPC 2.0 per calcoli
- GET /events - Server-Sent Events per aggiornamenti
- GET /api/tasks - Monitoring task matematici

Porta: 3002
Dominio: mathematics
Formati: application/json
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import time
import threading
import uuid
import math
from datetime import datetime

# Inizializzazione Flask con CORS per cross-origin requests
app = Flask(__name__)
CORS(app)  # Abilita CORS per compatibilità multi-dominio

# Configurazione agente matematico con metadati specifici
AGENT_CONFIG = {
    "id": "agent-b-math-calculator",          # ID unico per discovery
    "name": "Math Calculator Agent",          # Nome descrittivo
    "description": "Advanced mathematical calculations and operations",
    "version": "2.0.0",                       # Versione agente
    "port": 3002,                            # Porta di ascolto
    # Capacità matematiche esposte per discovery automatico
    "capabilities": [
        "math.basic.add",                     # Addizione
        "math.basic.subtract",                # Sottrazione  
        "math.basic.multiply",                # Moltiplicazione
        "math.basic.divide",                  # Divisione
        "math.advanced.power",                # Elevamento a potenza
        "math.advanced.sqrt",                 # Radice quadrata
        "math.advanced.factorial",            # Fattoriale
        "math.trigonometry.sin",              # Seno (gradi)
        "math.trigonometry.cos",              # Coseno (gradi)
        "math.trigonometry.tan"               # Tangente (gradi)
    ]
}

# Storage per task matematici attivi - tracking asincrono
active_tasks = {}

# Storage per aggiornamenti task - utilizzato per Server-Sent Events
task_updates = {}

# Agent Card specializzata per dominio matematico
AGENT_CARD = {
    "agent": {
        "id": AGENT_CONFIG["id"],
        "name": AGENT_CONFIG["name"],
        "description": AGENT_CONFIG["description"],
        "version": AGENT_CONFIG["version"],
        "capabilities": AGENT_CONFIG["capabilities"],
        "endpoints": {
            "rpc": f"http://localhost:{AGENT_CONFIG['port']}/rpc",
            "status": f"http://localhost:{AGENT_CONFIG['port']}/status",
            "events": f"http://localhost:{AGENT_CONFIG['port']}/events"
        },
        "discovery": {
            "registrationUrl": "http://localhost:3010/api/agents/register",
            "lastRegistered": None
        },
        "metadata": {
            "type": "math-calculator",                          # Tipo specializzato
            "domain": "mathematics",                            # Dominio matematico
            "supportedFormats": ["application/json"],           # Solo JSON
            "authMethods": ["none", "api-key"],
            "rateLimit": {"requests": 100, "window": 60}
        }
    },
    "spec": {
        "protocol": "agent2agent",
        "version": "1.0.0",
        "schema": "https://schemas.agent2agent.ai/v1/agent-card.json"
    }
}

def process_math_task(task_id, method, params):
    """
    Processa task di calcolo matematico in modo asincrono.
    
    Gestisce tutte le operazioni matematiche supportate dall'agente:
    - Operazioni base: add, subtract, multiply, divide
    - Operazioni avanzate: power, sqrt, factorial  
    - Funzioni trigonometriche: sin, cos, tan
    
    Caratteristiche:
    - Validazione rigorosa input (controllo tipi, divisione per zero)
    - Gestione errori matematici specifici
    - Conversione gradi->radianti per trigonometria
    - Tracking progressi real-time per SSE
    
    Args:
        task_id (str): Identificativo unico del task matematico
        method (str): Metodo JSON-RPC chiamato  
        params (dict): Parametri contenenti 'operation' e 'numbers'
        
    Parametri supportati:
        operation (str): Tipo operazione matematica
        numbers (list): Lista numeri per calcolo
        
    Note:
        - Risultati includono timestamp e input originali
        - Errori matematici gestiti con messaggi specifici
        - Aggiornamenti real-time via task_updates per SSE
    """
    try:
        # Inizializza tracking aggiornamenti per questo task
        task_updates[task_id] = []
        
        def add_update(status, message, data=None):
            """
            Aggiunge aggiornamento di stato per tracking real-time.
            
            Args:
                status (str): Stato operazione ('processing', 'completed', 'error')
                message (str): Messaggio descrittivo progresso
                data (dict, optional): Dati aggiuntivi (risultati calcolo)
            """
            update = {
                "timestamp": datetime.utcnow().isoformat(),
                "status": status,
                "message": message,
                "data": data
            }
            task_updates[task_id].append(update)
        
        add_update("processing", "Starting mathematical calculation")
        
        # Estrazione parametri con default sicuri
        operation = params.get("operation", "add")
        numbers = params.get("numbers", [])
        
        # Validazione input - numeri obbligatori per calcoli
        if not numbers:
            add_update("error", "No numbers provided")
            active_tasks[task_id] = {"status": "error", "error": "No numbers provided"}
            return
        
        add_update("processing", f"Performing operation: {operation}")
        
        # Engine di calcolo matematico con gestione errori specializzata
        try:
            # === OPERAZIONI ARITMETICHE BASE ===
            if operation == "add":
                # Somma di tutti i numeri nella lista
                result = sum(numbers)
                
            elif operation == "subtract":
                # Sottrazione sequenziale: primo - secondo - terzo...
                result = numbers[0]
                for num in numbers[1:]:
                    result -= num
                    
            elif operation == "multiply":
                # Moltiplicazione di tutti i numeri
                result = 1
                for num in numbers:
                    result *= num
                    
            elif operation == "divide":
                # Divisione sequenziale con controllo divisione per zero
                result = numbers[0]
                for num in numbers[1:]:
                    if num == 0:
                        raise ValueError("Division by zero")
                    result /= num
                    
            # === OPERAZIONI AVANZATE ===
            elif operation == "power":
                # Elevamento a potenza: base^esponente
                if len(numbers) < 2:
                    raise ValueError("Power operation requires base and exponent")
                result = numbers[0] ** numbers[1]
                
            elif operation == "sqrt":
                # Radice quadrata con controllo numeri negativi
                if len(numbers) != 1:
                    raise ValueError("Square root requires exactly one number")
                if numbers[0] < 0:
                    raise ValueError("Cannot calculate square root of negative number")
                result = math.sqrt(numbers[0])
                
            elif operation == "factorial":
                # Fattoriale con controllo intero non negativo
                if len(numbers) != 1:
                    raise ValueError("Factorial requires exactly one number")
                if numbers[0] < 0 or not isinstance(numbers[0], int):
                    raise ValueError("Factorial requires a non-negative integer")
                result = math.factorial(int(numbers[0]))
                
            # === FUNZIONI TRIGONOMETRICHE (gradi -> radianti) ===
            elif operation == "sin":
                # Seno con conversione automatica gradi->radianti
                if len(numbers) != 1:
                    raise ValueError("Sine requires exactly one number")
                result = math.sin(math.radians(numbers[0]))
                
            elif operation == "cos":
                # Coseno con conversione automatica gradi->radianti  
                if len(numbers) != 1:
                    raise ValueError("Cosine requires exactly one number")
                result = math.cos(math.radians(numbers[0]))
                
            elif operation == "tan":
                # Tangente con conversione automatica gradi->radianti
                if len(numbers) != 1:
                    raise ValueError("Tangent requires exactly one number")
                result = math.tan(math.radians(numbers[0]))
                
            else:
                # Operazione non supportata
                add_update("error", f"Unknown operation: {operation}")
                active_tasks[task_id] = {"status": "error", "error": f"Unknown operation: {operation}"}
                return
              # Costruzione risultato strutturato con metadati
            calculation_result = {
                "operation": operation,                        # Operazione eseguita
                "inputs": numbers,                            # Input originali
                "result": result,                             # Risultato calcolo
                "timestamp": datetime.utcnow().isoformat()    # Timestamp esecuzione
            }
            
            # Task completato con successo
            add_update("processing", "Mathematical calculation completed")
            add_update("completed", "Task completed successfully", calculation_result)
            
            # Salva risultato finale nel storage task attivi
            active_tasks[task_id] = {
                "status": "completed",
                "result": calculation_result,
                "completedAt": datetime.utcnow().isoformat()
            }
            
        except Exception as calc_error:
            # Gestione errori di calcolo specifici (matematici)
            add_update("error", f"Calculation failed: {str(calc_error)}")
            active_tasks[task_id] = {"status": "error", "error": str(calc_error)}
        
    except Exception as e:
        # Gestione errori generali di processamento
        add_update("error", f"Processing failed: {str(e)}")
        active_tasks[task_id] = {"status": "error", "error": str(e)}

@app.route('/.well-known/agent.json')
def agent_card():
    """Serve the Agent Card"""
    return jsonify(AGENT_CARD)

@app.route('/status')
def status():
    """Health check endpoint"""
    return jsonify({
        "status": "ok",
        "agent": AGENT_CONFIG["name"],
        "version": AGENT_CONFIG["version"],
        "timestamp": datetime.utcnow().isoformat(),
        "activeTasks": len(active_tasks)
    })

@app.route('/rpc', methods=['POST'])
def handle_rpc():
    """Handle JSON-RPC 2.0 requests"""
    try:
        data = request.get_json()
        
        if not data or data.get('jsonrpc') != '2.0':
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32600, "message": "Invalid Request"},
                "id": data.get('id') if data else None
            }), 400
        
        method = data.get('method')
        params = data.get('params', {})
        request_id = data.get('id')
        
        if method == 'agent.getCapabilities':
            return jsonify({
                "jsonrpc": "2.0",
                "result": {
                    "capabilities": AGENT_CONFIG["capabilities"],
                    "agent": AGENT_CONFIG["name"],
                    "version": AGENT_CONFIG["version"]
                },
                "id": request_id
            })
        
        elif method == 'tasks.send':
            task_id = str(uuid.uuid4())
            
            # Start processing in background
            thread = threading.Thread(
                target=process_math_task,
                args=(task_id, method, params)
            )
            thread.start()
            
            return jsonify({
                "jsonrpc": "2.0",
                "result": {
                    "taskId": task_id,
                    "status": "accepted",
                    "message": "Math task accepted for processing"
                },
                "id": request_id
            })
        
        elif method == 'tasks.status':
            task_id = params.get('taskId')
            if task_id in active_tasks:
                return jsonify({
                    "jsonrpc": "2.0",
                    "result": active_tasks[task_id],
                    "id": request_id
                })
            else:
                return jsonify({
                    "jsonrpc": "2.0",
                    "error": {"code": -32602, "message": "Task not found"},
                    "id": request_id
                }), 404
        
        else:
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": "Method not found"},
                "id": request_id
            }), 404
            
    except Exception as e:
        return jsonify({
            "jsonrpc": "2.0",
            "error": {"code": -32603, "message": f"Internal error: {str(e)}"},
            "id": data.get('id') if 'data' in locals() else None
        }), 500

@app.route('/events')
def events():
    """Server-Sent Events endpoint for real-time updates"""
    def generate():
        yield "data: " + json.dumps({
            "type": "connected",
            "agent": AGENT_CONFIG["name"],
            "timestamp": datetime.utcnow().isoformat()
        }) + "\n\n"
        
        # Send task updates
        sent_updates = set()
        while True:
            for task_id, updates in task_updates.items():
                for i, update in enumerate(updates):
                    update_key = f"{task_id}_{i}"
                    if update_key not in sent_updates:
                        yield "data: " + json.dumps({
                            "type": "task_update",
                            "taskId": task_id,
                            "update": update
                        }) + "\n\n"
                        sent_updates.add(update_key)
            
            time.sleep(1)
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """Get all active tasks"""
    return jsonify({
        "tasks": active_tasks,
        "count": len(active_tasks)
    })

if __name__ == '__main__':
    print(f"🚀 Starting {AGENT_CONFIG['name']} v{AGENT_CONFIG['version']}")
    print(f"📡 Agent Card: http://localhost:{AGENT_CONFIG['port']}/.well-known/agent.json")
    print(f"🔍 Status: http://localhost:{AGENT_CONFIG['port']}/status")
    print(f"⚡ RPC Endpoint: http://localhost:{AGENT_CONFIG['port']}/rpc")
    print(f"📊 Events: http://localhost:{AGENT_CONFIG['port']}/events")
    
    app.run(host='0.0.0.0', port=AGENT_CONFIG['port'], debug=True)
