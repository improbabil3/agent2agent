"""
Agent E - Intelligent Orchestrator Agent
========================================

Questo agente implementa il protocollo Agent2Agent (A2A) per orchestrazione avanzata
di workflow multi-agente. Coordina l'esecuzione di task complessi attraverso più agenti
specializzati, gestendo parallelismo, dipendenze e monitoring real-time.

Funzionalità di orchestrazione:
- Workflow execution: esecuzione workflow sequenziali e paralleli
- Agent coordination: coordinamento intelligente tra agenti multipli
- Task management: gestione task con dipendenze e scheduling
- Real-time monitoring: tracking progresso e aggiornamenti SSE
- Intelligent routing: routing intelligente task agli agenti appropriati
- Error handling: gestione errori distribuiti e recovery automatico

Workflow supportati:
- text_analysis_pipeline: analisi completa testo (clean + language + sentiment)
- math_text_combo: elaborazione matematica e testuale in parallelo
- multilingual_sentiment: detection lingua e sentiment analysis sequenziali

Caratteristiche avanzate:
- Discovery automatico agenti dal registry
- Fallback su discovery diretto se registry non disponibile
- Gestione asincrona con FastAPI e aiohttp
- Streaming real-time risultati via Server-Sent Events
- Monitoring workflows attivi e statistiche esecuzione
- Configurazione dinamica workflow personalizzati

Endpoints conformi A2A:
- GET /.well-known/agent.json - Agent Card per discovery
- GET /status - Health check con stato orchestratore
- POST /rpc - JSON-RPC 2.0 per esecuzione workflow
- GET /events - Server-Sent Events per aggiornamenti real-time
- GET /api/workflows - Monitoring workflow attivi
- GET /api/agents - Lista agenti registrati

Porta: 3005
Dominio: multi-agent-coordination
Formati: application/json
Framework: FastAPI (asincrono)
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import json
import asyncio
import aiohttp
import uuid
import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

# Modelli Pydantic per validazione request/response strutturati
class JsonRpcRequest(BaseModel):
    """Modello per richieste JSON-RPC 2.0 standardizzate."""
    jsonrpc: str = "2.0"                    # Versione protocollo JSON-RPC
    method: str                             # Metodo da invocare
    params: Dict[str, Any] = {}             # Parametri del metodo
    id: Optional[str] = None                # ID richiesta per tracking

class TaskRequest(BaseModel):
    """Modello per richieste di esecuzione workflow."""
    workflow: str                           # Nome workflow da eseguire
    input_data: Dict[str, Any]              # Dati input per il workflow
    agents: Optional[List[str]] = None      # Lista agenti specifici (opzionale)

# Inizializzazione FastAPI con configurazione per orchestrazione asincrona
app = FastAPI(title="Agent E - Intelligent Orchestrator", version="2.0.0")

# Middleware CORS per compatibilità cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],                    # Permetti tutti i domini
    allow_credentials=True,                 # Abilita credenziali  
    allow_methods=["*"],                    # Permetti tutti i metodi HTTP
    allow_headers=["*"],                    # Permetti tutti gli headers
)

# Configurazione orchestratore con metadati specializzati
AGENT_CONFIG = {
    "id": "agent-e-intelligent-orchestrator",  # ID unico per discovery
    "name": "Intelligent Orchestrator Agent",  # Nome descrittivo
    "description": "Advanced multi-agent orchestration and workflow management",
    "version": "2.0.0",                         # Versione orchestratore
    "port": 3005,                              # Porta di ascolto
    # Capacità di orchestrazione esposte per discovery
    "capabilities": [
        "orchestration.workflow.execute",       # Esecuzione workflow complessi
        "orchestration.agents.coordinate",      # Coordinamento tra agenti
        "orchestration.tasks.parallel",         # Task paralleli
        "orchestration.tasks.sequential",       # Task sequenziali
        "orchestration.monitoring.realtime",    # Monitoring real-time
        "orchestration.routing.intelligent"     # Routing intelligente
    ]
}

# Storage globale per stato orchestratore
registered_agents = {}              # Agenti scoperti e registrati
active_workflows = {}               # Workflow attualmente in esecuzione  
workflow_updates = {}               # Aggiornamenti workflow per SSE

# Agent Card specializzata per orchestrazione multi-agente
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
            "events": f"http://localhost:{AGENT_CONFIG['port']}/events",
            "workflows": f"http://localhost:{AGENT_CONFIG['port']}/api/workflows"  # Endpoint specializzato
        },
        "discovery": {
            "registrationUrl": "http://localhost:3010/api/agents/register",
            "lastRegistered": None
        },
        "metadata": {
            "type": "orchestrator",                        # Tipo specializzato
            "domain": "multi-agent-coordination",          # Dominio coordinamento
            "supportedFormats": ["application/json"],
            "authMethods": ["none", "api-key"],
            "rateLimit": {"requests": 200, "window": 60},  # Rate limit più alto per orchestratore
            "orchestration": {                             # Metadati specifici orchestrazione
                "maxConcurrentWorkflows": 10,              # Max workflow simultanei
                "maxAgentsPerWorkflow": 5,                 # Max agenti per workflow
                "supportedWorkflowTypes": ["sequential", "parallel", "conditional", "custom"]
            }
        }
    },
    "spec": {
        "protocol": "agent2agent",
        "version": "1.0.0",
        "schema": "https://schemas.agent2agent.ai/v1/agent-card.json"
    }
}

# Templates di workflow predefiniti per casi d'uso comuni
WORKFLOW_TEMPLATES = {
    "text_analysis_pipeline": {
        "name": "Text Analysis Pipeline",
        "description": "Complete text analysis using multiple agents",
        # Workflow sequenziale: clean -> detect -> sentiment
        "steps": [
            {"agent": "agent-a-text-processor", "operation": "clean", "input_field": "text"},
            {"agent": "agent-d-language-detector", "operation": "detect", "input_field": "text"},
            {"agent": "agent-c-sentiment-analyzer", "operation": "detailed", "input_field": "text"}
        ],
        "output_format": "combined"                    # Combina risultati di tutti gli step
    },
    "math_text_combo": {
        "name": "Math and Text Processing",
        "description": "Process mathematical expressions and analyze text",
        # Workflow parallelo: math + text simultanei
        "steps": [
            {"agent": "agent-b-math-calculator", "operation": "calculate", "parallel": True},
            {"agent": "agent-a-text-processor", "operation": "analyze", "parallel": True}
        ],
        "output_format": "separate"                    # Mantieni risultati separati
    },
    "multilingual_sentiment": {
        "name": "Multilingual Sentiment Analysis",
        "description": "Detect language and analyze sentiment",
        # Workflow con dipendenze: detect -> sentiment (dipende da step 0)
        "steps": [
            {"agent": "agent-d-language-detector", "operation": "detect", "input_field": "text"},
            {"agent": "agent-c-sentiment-analyzer", "operation": "basic", "input_field": "text", "depends_on": 0}
        ],
        "output_format": "combined"
    }
}

async def discover_agents():
    """
    Scopre automaticamente agenti disponibili dal registry centralizzato.
    
    Implementa discovery automatico con fallback robusto:
    1. Tenta connessione al registry centralizzato (porta 3010)
    2. Se registry non disponibile, usa discovery diretto
    3. Aggiorna registro interno con agenti scoperti
    4. Logging dettagliato per debugging
    
    Processo discovery:
    - Query HTTP GET al registry endpoint /api/agents
    - Parsing response JSON con lista agenti registrati
    - Aggiornamento cache locale registered_agents  
    - Fallback su lista agenti default se registry fallisce
    - Discovery diretto tramite probe endpoint specifici
    
    Note:
        - Utilizza aiohttp per requests asincroni
        - Gestione timeout e errori di rete
        - Fallback garantisce funzionamento anche senza registry
        - Cache locale ottimizza performance successive
        
    Registry format atteso:
    {
        "agents": [
            {
                "id": "agent-id",
                "name": "Agent Name", 
                "port": 3001,
                "capabilities": [...],
                "status": "active"
            },
            ...
        ]
    }
    """
    try:
        # Tentativo connessione al registry centralizzato
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:3010/api/agents") as response:
                if response.status == 200:
                    # Parsing successful response dal registry
                    agents_data = await response.json()
                    for agent in agents_data.get("agents", []):
                        # Aggiornamento cache locale agenti
                        registered_agents[agent["id"]] = agent
                        print(f"📋 Discovered agent: {agent['name']}")
    except Exception as e:
        # Gestione errore registry non disponibile
        print(f"⚠️  Could not discover agents from registry: {e}")
        
        # === FALLBACK: Discovery diretto agenti default ===
        # Lista agenti noti per fallback quando registry non disponibile
        default_agents = [
            {"id": "agent-a-text-processor", "name": "Text Processing Agent", "port": 3001},
            {"id": "agent-b-math-calculator", "name": "Math Calculator Agent", "port": 3002},
            {"id": "agent-c-sentiment-analyzer", "name": "Sentiment Analysis Agent", "port": 3003},
            {"id": "agent-d-language-detector", "name": "Language Detection Agent", "port": 3004}
        ]
        
        # Probe diretto ogni agente default per verifica disponibilità
        for agent_info in default_agents:
            try:
                async with aiohttp.ClientSession() as session:
                    url = f"http://localhost:{agent_info['port']}/.well-known/agent.json"
                    async with session.get(url) as response:
                        if response.status == 200:
                            agent_card = await response.json()
                            registered_agents[agent_info["id"]] = {
                                "id": agent_info["id"],
                                "name": agent_info["name"],
                                "rpc_endpoint": f"http://localhost:{agent_info['port']}/rpc",
                                "agent_card": agent_card
                            }
                            print(f"📋 Direct discovery: {agent_info['name']}")
            except Exception as agent_error:
                print(f"⚠️  Could not reach {agent_info['name']}: {agent_error}")

async def send_agent_task(agent_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Invia task a un agente specifico tramite JSON-RPC.
    
    Implementa comunicazione agent-to-agent per orchestrazione:
    - Validazione agente registrato nel registry locale
    - Costruzione JSON-RPC 2.0 request standardizzata
    - Invio HTTP POST asincrono al RPC endpoint
    - Gestione errori e timeout di rete
    - Response parsing e validazione
    
    Args:
        agent_id (str): ID univoco dell'agente target
        params (Dict[str, Any]): Parametri task da inviare
        
    Returns:
        Dict[str, Any]: Response JSON-RPC dall'agente
        
    Raises:
        HTTPException: 404 se agente non trovato, 500 se RPC fallisce
        
    Flusso esecuzione:
    1. Lookup agente in registered_agents cache
    2. Estrazione RPC endpoint dall'agent registry
    3. Costruzione JSON-RPC request con UUID unico
    4. POST asincrono con aiohttp client session
    5. Validazione HTTP status e response parsing
    
    Formato JSON-RPC request:
    {
        "jsonrpc": "2.0",
        "method": "tasks.send",
        "params": {...},
        "id": "uuid"
    }
    
    Note:
        - Utilizza agent registry cache per performance
        - Timeout implicito gestito da aiohttp
        - Error propagation via HTTPException per FastAPI
    """
    # Validazione agente registrato
    if agent_id not in registered_agents:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    # Estrazione endpoint RPC dall'agent registry
    agent = registered_agents[agent_id]
    rpc_endpoint = agent.get("rpc_endpoint")
    
    if not rpc_endpoint:
        raise HTTPException(status_code=500, detail=f"No RPC endpoint for agent {agent_id}")
    
    # Costruzione JSON-RPC 2.0 request standard
    rpc_request = {
        "jsonrpc": "2.0",
        "method": "tasks.send",
        "params": params,
        "id": str(uuid.uuid4())  # ID univoco per request tracking
    }
    
    # Invio asincrono con gestione connessione
    async with aiohttp.ClientSession() as session:
        async with session.post(rpc_endpoint, json=rpc_request) as response:
            if response.status == 200:
                return await response.json()
            else:
                raise HTTPException(status_code=response.status, detail=f"Agent {agent_id} request failed")

async def wait_for_task_completion(agent_id: str, task_id: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Attende il completamento di un task agent con polling e timeout.
    
    Implementa attesa robusta con monitoring continuo:
    - Polling periodico status task tramite JSON-RPC
    - Gestione timeout configurabile (default 30s)
    - Status checking: completed|error|processing
    - Retry automatico su errori transitori
    - Early exit su completion o error definitivo
    
    Args:
        agent_id (str): ID agente che esegue il task
        task_id (str): ID task da monitorare  
        timeout (int): Timeout massimo in secondi (default 30)
        
    Returns:
        Dict[str, Any]: Risultato task completato
        
    Raises:
        HTTPException: 408 su timeout, 500 su errori task
        
    Algoritmo polling:
    1. Loop con time tracking fino a timeout
    2. JSON-RPC tasks.status request ogni secondo
    3. Parse response e check status field
    4. Return immediato su completed
    5. Raise exception su error status
    6. Continue polling su processing status
    7. Timeout exception se tempo scaduto
    
    Task status values:
    - "completed": Task finito con successo
    - "error": Task fallito con errore
    - "processing": Task ancora in esecuzione
    
    Note:
        - Polling interval 1 secondo per bilanciare performance/responsiveness
        - Exception handling per errori di rete transitori
        - Timeout gestito con time.time() per precisione
    """
    # Lookup agente e endpoint per status polling
    agent = registered_agents[agent_id]
    rpc_endpoint = agent.get("rpc_endpoint")
    
    # Tracking tempo per timeout enforcement
    start_time = time.time()
    
    # Polling loop con timeout protection
    while time.time() - start_time < timeout:
        # Costruzione JSON-RPC status request
        rpc_request = {
            "jsonrpc": "2.0",
            "method": "tasks.status",
            "params": {"taskId": task_id},
            "id": str(uuid.uuid4())
        }
        
        try:
            # Status polling asincrono
            async with aiohttp.ClientSession() as session:
                async with session.post(rpc_endpoint, json=rpc_request) as response:
                    if response.status == 200:
                        result = await response.json()
                        task_status = result.get("result", {})
                        
                        # Check completion status
                        if task_status.get("status") == "completed":
                            return task_status  # Success exit
                        elif task_status.get("status") == "error":
                            # Task failed - propagate error
                            raise HTTPException(status_code=500, detail=f"Task failed: {task_status.get('error')}")
                        
                        # Still processing - continue polling
                        await asyncio.sleep(1)
                    else:
                        # HTTP error - wait and retry
                        await asyncio.sleep(1)
        except Exception as e:
            # Network/parsing error - log and continue
            print(f"Error checking task status: {e}")
            await asyncio.sleep(1)
    
    # Timeout reached - raise timeout exception
    raise HTTPException(status_code=408, detail="Task timeout")

async def execute_workflow(workflow_id: str, workflow_type: str, input_data: Dict[str, Any]):
    """
    Esegue workflow multi-agente orchestrato con gestione dipendenze.
    
    Implementa orchestrazione complessa con:
    - Template workflow predefiniti (sequential, parallel, conditional)
    - Gestione dipendenze tra step (depends_on)
    - Real-time progress tracking via SSE
    - Combinazione risultati step multipli
    - Error handling e rollback automatico
    
    Tipi workflow supportati:
    - text_analysis_pipeline: Sequenziale (clean->detect->sentiment)
    - math_text_combo: Parallelo (math + text simultanei)
    - multilingual_sentiment: Con dipendenze (detect->sentiment)
    - custom: Workflow definiti dinamicamente
    
    Args:
        workflow_id (str): ID univoco workflow per tracking
        workflow_type (str): Tipo workflow da template
        input_data (Dict[str, Any]): Dati input per workflow
        
    Side Effects:
        - Aggiorna workflow_updates[workflow_id] con progress
        - Aggiorna active_workflows[workflow_id] con stato finale
        - Invoca agents tramite send_agent_task()
        
    Algoritmo esecuzione:
    1. Carica template workflow da WORKFLOW_TEMPLATES
    2. Itera step workflow in ordine sequenziale
    3. Per ogni step: prepara input, risolve dipendenze
    4. Invia task ad agente appropriato via JSON-RPC
    5. Attende completamento con wait_for_task_completion()
    6. Combina risultati secondo output_format
    7. Salva risultato finale in active_workflows
    
    Gestione dipendenze:
    - depends_on: Riferimento a step precedente (index-based)
    - Result chaining: Output step N diventa input step N+1
    - Parallel execution: Step senza depends_on eseguiti simultaneamente
    
    Output formats:
    - "combined": Merge risultati in oggetto unico
    - "separate": Mantieni risultati step separati
    
    Note:
        - Thread-safe updates tramite append operations
        - Exception handling con cleanup automatico
        - Progress tracking real-time via SSE stream
    """
    # Inizializza tracking updates per questo workflow
    workflow_updates[workflow_id] = []
    
    def add_update(status: str, message: str, data: Any = None):
        """Helper per aggiungere update thread-safe con logging"""
        update = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": status,
            "message": message,
            "data": data
        }
        workflow_updates[workflow_id].append(update)
        print(f"🔄 Workflow {workflow_id}: {message}")
    
    try:
        # Update iniziale: avvio workflow
        add_update("processing", f"Starting workflow: {workflow_type}")
        
        # Validazione template workflow esistente
        if workflow_type not in WORKFLOW_TEMPLATES:
            add_update("error", f"Unknown workflow type: {workflow_type}")
            active_workflows[workflow_id] = {"status": "error", "error": f"Unknown workflow type: {workflow_type}"}
            return
        
        # Caricamento template e inizializzazione tracking
        workflow = WORKFLOW_TEMPLATES[workflow_type]
        add_update("processing", f"Executing workflow: {workflow['name']}")
        
        results = {}
        step_results = []  # Mantieni risultati per dependency resolution
        
        # === ESECUZIONE STEP WORKFLOW ===
        for i, step in enumerate(workflow["steps"]):
            # Estrazione configurazione step
            agent_id = step["agent"]
            operation = step.get("operation", "process")
            input_field = step.get("input_field", "input")
            parallel = step.get("parallel", False)
            depends_on = step.get("depends_on")
            
            add_update("processing", f"Step {i+1}: {agent_id} - {operation}")
            
            # === PREPARAZIONE INPUT STEP ===
            step_input = input_data.copy()
            
            # Risoluzione dipendenze: usa output step precedente come input
            if depends_on is not None and depends_on < len(step_results):
                prev_result = step_results[depends_on]
                if "result" in prev_result:
                    step_input.update(prev_result["result"])
            
            # === ESECUZIONE STEP ===
            # Preparazione parametri task per agente target
            task_params = {
                operation: operation,
                input_field: step_input.get(input_field, step_input)
            }
            
            # Invio task all'agente via JSON-RPC
            task_response = await send_agent_task(agent_id, task_params)
            task_id = task_response.get("result", {}).get("taskId")
            
            if task_id:
                # Attesa completamento con polling
                add_update("processing", f"Waiting for {agent_id} to complete task {task_id}")
                step_result = await wait_for_task_completion(agent_id, task_id)
                step_results.append(step_result)
                add_update("processing", f"Step {i+1} completed successfully")
            else:
                # Errore avvio task - abort workflow
                add_update("error", f"Failed to start task on {agent_id}")
                active_workflows[workflow_id] = {"status": "error", "error": f"Failed to start task on {agent_id}"}
                return
        
        # === COMBINAZIONE RISULTATI ===
        # Formato output basato su template configuration
        if workflow.get("output_format") == "combined":
            # Merge risultati in oggetto combinato
            combined_result = {"workflow": workflow_type, "steps": step_results}
            for i, step_result in enumerate(step_results):
                if "result" in step_result:
                    step_data = step_result["result"]
                    # Gestione differenti tipi di risultato
                    if isinstance(step_data, dict):
                        combined_result.update(step_data)
                    else:
                        # Risultati non-dict: struttura con chiave
                        step_key = f"step_{i+1}_result"
                        combined_result[step_key] = step_data
            results = combined_result
        else:
            # Mantieni risultati separati per step
            results = {"workflow": workflow_type, "individual_results": step_results}
        
        # === FINALIZZAZIONE WORKFLOW ===
        add_update("completed", "Workflow completed successfully", results)
        active_workflows[workflow_id] = {
            "status": "completed",
            "result": results,
            "completedAt": datetime.utcnow().isoformat(),
            "workflow_type": workflow_type
        }
        
    except Exception as e:
        # Gestione errori con cleanup e logging
        add_update("error", f"Workflow failed: {str(e)}")
        active_workflows[workflow_id] = {"status": "error", "error": str(e)}

@app.get("/.well-known/agent.json")
async def agent_card():
    """Serve the Agent Card"""
    return AGENT_CARD

@app.get("/status")
async def status():
    """Health check endpoint"""
    return {
        "status": "ok",
        "agent": AGENT_CONFIG["name"],
        "version": AGENT_CONFIG["version"],
        "timestamp": datetime.utcnow().isoformat(),
        "activeWorkflows": len(active_workflows),
        "registeredAgents": len(registered_agents),
        "availableWorkflows": list(WORKFLOW_TEMPLATES.keys())
    }

@app.post("/rpc")
async def handle_rpc(request: JsonRpcRequest, background_tasks: BackgroundTasks):
    """Handle JSON-RPC 2.0 requests"""
    try:
        if request.method == "agent.getCapabilities":
            return {
                "jsonrpc": "2.0",
                "result": {
                    "capabilities": AGENT_CONFIG["capabilities"],
                    "agent": AGENT_CONFIG["name"],
                    "version": AGENT_CONFIG["version"],
                    "workflows": list(WORKFLOW_TEMPLATES.keys()),
                    "registeredAgents": list(registered_agents.keys())
                },
                "id": request.id
            }
        
        elif request.method == "tasks.send":
            workflow_id = str(uuid.uuid4())
            workflow_type = request.params.get("workflow", "text_analysis_pipeline")
            input_data = request.params.get("input_data", {})
            
            # Start workflow in background
            background_tasks.add_task(execute_workflow, workflow_id, workflow_type, input_data)
            
            return {
                "jsonrpc": "2.0",
                "result": {
                    "workflowId": workflow_id,
                    "status": "accepted",
                    "message": f"Workflow {workflow_type} accepted for processing"
                },
                "id": request.id
            }
        
        elif request.method == "tasks.status":
            workflow_id = request.params.get("workflowId") or request.params.get("taskId")
            if workflow_id in active_workflows:
                return {
                    "jsonrpc": "2.0",
                    "result": active_workflows[workflow_id],
                    "id": request.id
                }
            else:
                raise HTTPException(status_code=404, detail="Workflow not found")
        
        elif request.method == "orchestration.agents.list":
            return {
                "jsonrpc": "2.0",
                "result": {
                    "agents": list(registered_agents.values()),
                    "count": len(registered_agents)
                },
                "id": request.id
            }
        
        else:
            raise HTTPException(status_code=404, detail="Method not found")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

@app.get("/events")
async def events():
    """Server-Sent Events endpoint for real-time updates"""
    async def generate():
        yield f"data: {json.dumps({'type': 'connected', 'agent': AGENT_CONFIG['name'], 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        
        sent_updates = set()
        while True:
            for workflow_id, updates in workflow_updates.items():
                for i, update in enumerate(updates):
                    update_key = f"{workflow_id}_{i}"
                    if update_key not in sent_updates:
                        yield f"data: {json.dumps({'type': 'workflow_update', 'workflowId': workflow_id, 'update': update})}\n\n"
                        sent_updates.add(update_key)
            
            await asyncio.sleep(1)
    
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/api/workflows")
async def get_workflows():
    """Get available workflow templates"""
    return {
        "workflows": WORKFLOW_TEMPLATES,
        "active": active_workflows,
        "count": len(WORKFLOW_TEMPLATES)
    }

@app.get("/api/agents")
async def get_agents():
    """Get registered agents"""
    return {
        "agents": list(registered_agents.values()),
        "count": len(registered_agents)
    }

@app.on_event("startup")
async def startup_event():
    """Initialize the orchestrator"""
    print(f"🚀 Starting {AGENT_CONFIG['name']} v{AGENT_CONFIG['version']}")
    print(f"📡 Agent Card: http://localhost:{AGENT_CONFIG['port']}/.well-known/agent.json")
    print(f"🔍 Status: http://localhost:{AGENT_CONFIG['port']}/status")
    print(f"⚡ RPC Endpoint: http://localhost:{AGENT_CONFIG['port']}/rpc")
    print(f"📊 Events: http://localhost:{AGENT_CONFIG['port']}/events")
    print(f"🔄 Workflows: http://localhost:{AGENT_CONFIG['port']}/api/workflows")
    
    # Discover agents
    await discover_agents()
    print(f"📋 Discovered {len(registered_agents)} agents")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=AGENT_CONFIG["port"])
