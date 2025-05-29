"""
Agent A - Text Processing Agent
==============================

Questo agente implementa il protocollo Agent2Agent (A2A) di Google per il processing di testo.
L'agente offre diverse capacità di trasformazione e analisi testuale attraverso JSON-RPC 2.0.

Funzionalità principali:
- Trasformazioni testo: uppercase, lowercase, reverse
- Analisi testuale: conteggio caratteri, parole, frasi
- Pulizia testo: rimozione spazi extra
- Esposizione Agent Card per discovery automatico
- Server-Sent Events per aggiornamenti real-time
- Conformità completa protocollo A2A

Endpoints:
- GET /.well-known/agent.json - Agent Card per discovery
- GET /status - Health check
- POST /rpc - JSON-RPC 2.0 endpoint principale
- GET /events - Server-Sent Events stream
- GET /api/tasks - Lista task attivi

Porta: 3001
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import time
import threading
import uuid
from datetime import datetime

# Inizializzazione Flask app con CORS per compatibilità cross-origin
app = Flask(__name__)
CORS(app)  # Abilita CORS per permettere richieste da altri domini

# Configurazione dell'agente con metadati e capacità
# Questo dizionario definisce l'identità e le funzionalità dell'agente
AGENT_CONFIG = {
    "id": "agent-a-text-processor",           # Identificativo unico
    "name": "Text Processing Agent",          # Nome descrittivo
    "description": "Advanced text processing with transformations, analysis, and formatting",
    "version": "2.0.0",                       # Versione dell'agente
    "port": 3001,                            # Porta di ascolto
    # Lista delle capacità esposte - usate per discovery automatico
    "capabilities": [
        "text.transform.uppercase",           # Trasformazione in maiuscolo
        "text.transform.lowercase",           # Trasformazione in minuscolo  
        "text.transform.reverse",             # Inversione del testo
        "text.analyze.length",                # Analisi lunghezza
        "text.analyze.words",                 # Analisi parole
        "text.format.json",                   # Formattazione JSON
        "text.clean.whitespace"               # Pulizia spazi
    ]
}

# Storage per task attivi - utilizzato per tracking asincrono
# Chiave: task_id, Valore: stato e risultato del task
active_tasks = {}

# Storage per aggiornamenti task - utilizzato per Server-Sent Events
# Chiave: task_id, Valore: lista di aggiornamenti temporali
task_updates = {}

# Agent Card - Documento JSON per discovery automatico
# Definisce identità, capacità ed endpoints dell'agente secondo protocollo A2A
AGENT_CARD = {
    "agent": {
        "id": AGENT_CONFIG["id"],                        # Identificativo unico dell'agente
        "name": AGENT_CONFIG["name"],                    # Nome descrittivo
        "description": AGENT_CONFIG["description"],      # Descrizione funzionalità
        "version": AGENT_CONFIG["version"],              # Versione agente
        "capabilities": AGENT_CONFIG["capabilities"],    # Lista capacità esposte
        "endpoints": {
            # Endpoint principale JSON-RPC 2.0
            "rpc": f"http://localhost:{AGENT_CONFIG['port']}/rpc",
            # Endpoint health check
            "status": f"http://localhost:{AGENT_CONFIG['port']}/status",
            # Endpoint Server-Sent Events per aggiornamenti real-time
            "events": f"http://localhost:{AGENT_CONFIG['port']}/events"
        },
        "discovery": {
            # URL del servizio di discovery centralizzato
            "registrationUrl": "http://localhost:3010/api/agents/register",
            "lastRegistered": None                       # Timestamp ultima registrazione
        },
        "metadata": {
            "type": "text-processor",                    # Tipologia agente
            "domain": "natural-language",                # Dominio di competenza  
            "supportedFormats": ["text/plain", "application/json"],  # Formati supportati
            "authMethods": ["none", "api-key"],          # Metodi autenticazione
            "rateLimit": {"requests": 100, "window": 60} # Limiti di rate (100 req/min)
        }
    },
    "spec": {
        # Specifica protocollo A2A utilizzato
        "protocol": "agent2agent",
        "version": "1.0.0",
        "schema": "https://schemas.agent2agent.ai/v1/agent-card.json"
    }
}

def process_text_task(task_id, method, params):
    """
    Processa task di trasformazione testo in modo asincrono.
    
    Questa funzione gestisce le operazioni di text processing supportate dall'agente:
    - Trasformazioni: uppercase, lowercase, reverse
    - Analisi: length, words, analyze
    - Pulizia: clean (rimozione spazi extra)
    
    Args:
        task_id (str): Identificativo unico del task
        method (str): Metodo JSON-RPC chiamato
        params (dict): Parametri del task contenenti 'text' e 'operation'
    
    Note:
        - Aggiorna task_updates con progressi real-time per SSE
        - Aggiorna active_tasks con risultato finale
        - Gestisce errori e li traccia negli aggiornamenti
    """
    try:
        # Inizializza lista aggiornamenti per questo task
        task_updates[task_id] = []
        
        def add_update(status, message, data=None):
            """
            Aggiunge aggiornamento di stato per Server-Sent Events.
            
            Args:
                status (str): Stato corrente ('processing', 'completed', 'error')
                message (str): Messaggio descrittivo dell'operazione
                data (dict, optional): Dati aggiuntivi (risultati, errori)
            """
            update = {
                "timestamp": datetime.utcnow().isoformat(),
                "status": status,
                "message": message,
                "data": data
            }
            task_updates[task_id].append(update)
        
        add_update("processing", "Starting text processing task")
        
        # Estrazione parametri con valori di default
        text = params.get("text", "")
        operation = params.get("operation", "uppercase")
        
        # Validazione input - testo è obbligatorio
        if not text:
            add_update("error", "No text provided")
            active_tasks[task_id] = {"status": "error", "error": "No text provided"}
            return
        
        add_update("processing", f"Applying operation: {operation}")
        
        # Switch delle operazioni di processamento testo supportate
        if operation == "uppercase":
            # Trasformazione in maiuscolo
            result = {"original": text, "result": text.upper()}
        elif operation == "lowercase":
            # Trasformazione in minuscolo
            result = {"original": text, "result": text.lower()}
        elif operation == "reverse":
            # Inversione caratteri del testo
            result = {"original": text, "result": text[::-1]}
        elif operation == "length":
            # Analisi lunghezza caratteri
            result = {"text": text, "length": len(text), "characters": len(text)}
        elif operation == "words":
            # Analisi parole - split su spazi bianchi
            words = text.split()
            result = {"text": text, "words": words, "wordCount": len(words)}
        elif operation == "clean":
            # Pulizia spazi extra - normalizza whitespace
            cleaned_text = " ".join(text.split())
            result = {"original": text, "cleaned": cleaned_text}
        elif operation == "analyze":
            # Analisi completa del testo
            words = text.split()
            result = {
                "text": text,
                "length": len(text),                                                    # Caratteri totali
                "words": len(words),                                                   # Parole totali
                "sentences": text.count('.') + text.count('!') + text.count('?'),    # Frasi (punteggiatura)
                "paragraphs": text.count('\n\n') + 1                                 # Paragrafi (doppio newline)
            }
        else:
            # Operazione non supportata
            add_update("error", f"Unknown operation: {operation}")
            active_tasks[task_id] = {"status": "error", "error": f"Unknown operation: {operation}"}
            return
        
        # Task completato con successo
        add_update("processing", "Text processing completed")
        add_update("completed", "Task completed successfully", result)
        
        # Salva risultato finale nel storage task attivi
        active_tasks[task_id] = {
            "status": "completed",
            "result": result,
            "completedAt": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        # Gestione errori generici con logging
        add_update("error", f"Processing failed: {str(e)}")
        active_tasks[task_id] = {"status": "error", "error": str(e)}

@app.route('/.well-known/agent.json')
def agent_card():
    """
    Endpoint per esporre l'Agent Card secondo protocollo A2A.
    
    L'Agent Card è un documento JSON standardizzato che descrive:
    - Identità e metadati dell'agente
    - Capacità e funzionalità disponibili  
    - Endpoints per comunicazione
    - Informazioni per discovery automatico
    
    Returns:
        dict: Agent Card completa in formato JSON
        
    Note:
        Questo endpoint è standard A2A e deve essere disponibile su
        /.well-known/agent.json per discovery automatico
    """
    return jsonify(AGENT_CARD)

@app.route('/status')
def status():
    """
    Endpoint di health check per verificare stato dell'agente.
    
    Fornisce informazioni sullo stato operativo dell'agente inclusi:
    - Status operativo ('ok' se funzionante)
    - Informazioni agente (nome, versione)
    - Timestamp corrente
    - Numero task attivi in elaborazione
    
    Returns:
        dict: Stato agente con metadati operativi
        
    Note:
        Utilizzato da client per verificare disponibilità dell'agente
        prima di inviare task o richieste
    """
    return jsonify({
        "status": "ok",
        "agent": AGENT_CONFIG["name"],
        "version": AGENT_CONFIG["version"],
        "timestamp": datetime.utcnow().isoformat(),
        "activeTasks": len(active_tasks)
    })

@app.route('/rpc', methods=['POST'])
def handle_rpc():
    """
    Endpoint principale per gestire richieste JSON-RPC 2.0.
    
    Gestisce i metodi standard del protocollo A2A:
    - agent.getCapabilities: Ritorna lista capacità dell'agente
    - tasks.send: Accetta nuovo task per elaborazione asincrona
    - tasks.status: Verifica stato di un task specifico
    
    Formato richiesta JSON-RPC 2.0:
    {
        "jsonrpc": "2.0",
        "method": "nome_metodo",
        "params": {...},
        "id": "request_id"
    }
    
    Returns:
        dict: Risposta JSON-RPC 2.0 con risultato o errore
        
    Errors:
        -32600: Invalid Request (formato JSON-RPC non valido)
        -32601: Method not found (metodo non supportato)
        -32602: Invalid params (parametri non validi)
        -32603: Internal error (errore interno server)
        
    Note:
        - Task vengono processati in background con thread separati
        - Stato task tracciato in active_tasks per query successive
        - Aggiornamenti real-time disponibili via SSE su /events
    """
    try:
        # Parsing e validazione richiesta JSON-RPC 2.0
        data = request.get_json()
        
        # Validazione formato JSON-RPC 2.0 obbligatorio
        if not data or data.get('jsonrpc') != '2.0':
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32600, "message": "Invalid Request"},
                "id": data.get('id') if data else None
            }), 400
        
        # Estrazione parametri richiesta
        method = data.get('method')
        params = data.get('params', {})
        request_id = data.get('id')
        
        # Gestione metodo: ottenimento capacità agente
        if method == 'agent.getCapabilities':
            return jsonify({
                "jsonrpc": "2.0",
                "result": {
                    "capabilities": AGENT_CONFIG["capabilities"],  # Lista capacità
                    "agent": AGENT_CONFIG["name"],                # Nome agente
                    "version": AGENT_CONFIG["version"]            # Versione
                },
                "id": request_id
            })
        
        # Gestione metodo: invio nuovo task
        elif method == 'tasks.send':
            # Generazione ID unico per tracking task
            task_id = str(uuid.uuid4())
            
            # Avvio processamento in background per non bloccare risposta
            thread = threading.Thread(
                target=process_text_task,
                args=(task_id, method, params)
            )
            thread.start()
            
            # Risposta immediata con ID task per tracking asincrono
            return jsonify({
                "jsonrpc": "2.0",
                "result": {
                    "taskId": task_id,
                    "status": "accepted",
                    "message": "Task accepted for processing"
                },
                "id": request_id
            })
        
        # Gestione metodo: verifica stato task
        elif method == 'tasks.status':
            task_id = params.get('taskId')
            
            # Ricerca task nei task attivi
            if task_id in active_tasks:
                return jsonify({
                    "jsonrpc": "2.0",
                    "result": active_tasks[task_id],
                    "id": request_id
                })
            else:
                # Task non trovato
                return jsonify({
                    "jsonrpc": "2.0",
                    "error": {"code": -32602, "message": "Task not found"},
                    "id": request_id
                }), 404
        
        # Metodo non supportato
        else:
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": "Method not found"},
                "id": request_id
            }), 404
            
    except Exception as e:
        # Gestione errori interni del server
        return jsonify({
            "jsonrpc": "2.0",
            "error": {"code": -32603, "message": f"Internal error: {str(e)}"},
            "id": data.get('id') if 'data' in locals() else None
        }), 500

@app.route('/events')
def events():
    """
    Endpoint Server-Sent Events per aggiornamenti real-time sui task.
    
    Implementa streaming HTTP per fornire aggiornamenti in tempo reale
    sull'avanzamento dei task elaborati dall'agente. Utilizza il formato
    SSE (Server-Sent Events) standard per compatibilità con browser.
    
    Flusso eventi:
    1. Connessione: messaggio di benvenuto con info agente
    2. Task updates: aggiornamenti progressi task in corso
    3. Completamento: risultati finali e stato completato
    
    Formato eventi SSE:
    data: {"type": "event_type", "taskId": "...", "update": {...}}
    
    Returns:
        Response: Stream SSE con Content-Type text/event-stream
        
    Note:
        - Mantiene connessione aperta per aggiornamenti continui
        - Evita duplicazione eventi con tracking sent_updates
        - Polling ogni secondo per nuovi aggiornamenti
        - Compatible con EventSource API JavaScript
    """
    def generate():
        """
        Generatore per stream SSE con aggiornamenti task real-time.
        
        Yields:
            str: Messaggi SSE formattati secondo standard
        """
        # Messaggio iniziale di connessione stabilita
        yield "data: " + json.dumps({
            "type": "connected",
            "agent": AGENT_CONFIG["name"],
            "timestamp": datetime.utcnow().isoformat()
        }) + "\n\n"
        
        # Set per tracciare aggiornamenti già inviati (evita duplicati)
        sent_updates = set()
        
        # Loop infinito per streaming continuo
        while True:
            # Itera su tutti i task con aggiornamenti disponibili
            for task_id, updates in task_updates.items():
                # Itera su tutti gli aggiornamenti del task
                for i, update in enumerate(updates):
                    # Crea chiave unica per evitare duplicati
                    update_key = f"{task_id}_{i}"
                    
                    # Invia solo aggiornamenti non ancora trasmessi
                    if update_key not in sent_updates:
                        yield "data: " + json.dumps({
                            "type": "task_update",
                            "taskId": task_id,
                            "update": update
                        }) + "\n\n"
                        sent_updates.add(update_key)
            
            # Pausa 1 secondo prima del prossimo controllo
            time.sleep(1)
    
    # Ritorna Response con streaming e headers SSE corretti
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    Endpoint per ottenere snapshot di tutti i task attivi.
    
    Fornisce vista completa dello stato corrente di tutti i task
    gestiti dall'agente, inclusi task in corso e completati.
    
    Returns:
        dict: Dizionario con task attivi e conteggio totale
        
    Formato risposta:
    {
        "tasks": {
            "task_id_1": {"status": "...", "result": {...}},
            "task_id_2": {"status": "...", "error": "..."}
        },
        "count": 2
    }
    
    Note:
        - Utilizzato per debugging e monitoring
        - Complementare al tracking real-time via SSE
        - Include sia task completati che in elaborazione
    """
    return jsonify({
        "tasks": active_tasks,
        "count": len(active_tasks)
    })

if __name__ == '__main__':
    """
    Punto di ingresso principale dell'applicazione Agent A.
    
    Avvia il server Flask con configurazione per sviluppo che include:
    - Host binding su tutte le interfacce (0.0.0.0)
    - Porta configurabile tramite AGENT_CONFIG
    - Modalità debug abilitata per sviluppo
    - Logging startup con informazioni endpoints
    
    Endpoints disponibili all'avvio:
    - Agent Card: /.well-known/agent.json (discovery A2A)
    - Status: /status (health check)
    - RPC: /rpc (JSON-RPC 2.0 principale)
    - Events: /events (Server-Sent Events)
    - Tasks: /api/tasks (monitoring task)
    """
    print(f"🚀 Starting {AGENT_CONFIG['name']} v{AGENT_CONFIG['version']}")
    print(f"📡 Agent Card: http://localhost:{AGENT_CONFIG['port']}/.well-known/agent.json")
    print(f"🔍 Status: http://localhost:{AGENT_CONFIG['port']}/status")
    print(f"⚡ RPC Endpoint: http://localhost:{AGENT_CONFIG['port']}/rpc")
    print(f"📊 Events: http://localhost:{AGENT_CONFIG['port']}/events")
    
    # Avvio server Flask in modalità sviluppo
    app.run(host='0.0.0.0', port=AGENT_CONFIG['port'], debug=True)
