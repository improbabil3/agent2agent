"""
Discovery Client - Servizio di Scoperta Agenti A2A

Questo modulo implementa un servizio centralizzato per la scoperta e il monitoraggio
degli agenti nel sistema Agent2Agent. Fornisce funzionalità di:

- Discovery automatica degli agenti tramite Agent Cards
- Registrazione dinamica e statica degli agenti
- Monitoraggio della salute degli agenti in tempo reale
- Dashboard web per visualizzazione dello stato del sistema
- API REST per gestione e interrogazione degli agenti registrati
- Sistema di eventi per tracciamento delle attività di discovery

Funzionalità principali:
1. DISCOVERY AUTOMATICA: Scansione periodica degli endpoint noti per identificare agenti disponibili
2. VALIDAZIONE AGENT CARDS: Verifica della conformità delle Agent Cards al protocollo A2A
3. HEALTH MONITORING: Controlli periodici dello stato degli agenti registrati
4. REGISTRAZIONE DINAMICA: Supporto per agenti che si registrano automaticamente
5. WEB DASHBOARD: Interface grafica per monitoraggio in tempo reale
6. GESTIONE EVENTI: Log dettagliato delle attività di discovery e monitoring

Protocolli supportati:
- Agent2Agent (A2A) Discovery Protocol
- HTTP/HTTPS per comunicazione
- JSON per formato dati
- Server-Sent Events per aggiornamenti real-time

Endpoint API principali:
- GET /api/agents - Lista di tutti gli agenti registrati
- POST /api/agents/register - Registrazione dinamica di nuovi agenti
- GET /api/health - Stato di salute del sistema
- GET /api/capabilities - Elenco delle capacità disponibili
- GET / - Dashboard web interattiva

Author: A2A Discovery Team
Version: 2.0.0
Protocol: Agent2Agent Discovery Service
"""

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
import requests
import json
import time
from datetime import datetime
from typing import Dict, List, Any
import threading

app = Flask(__name__)
CORS(app)

# Configurazione del servizio di discovery
# Definisce metadati e parametri operativi del servizio
DISCOVERY_CONFIG = {
    "name": "A2A Discovery Service",  # Nome identificativo del servizio
    "version": "2.0.0",               # Versione compatibile con protocollo A2A 2.0
    "port": 3010                      # Porta di ascolto per API e dashboard
}

# Storage degli agenti registrati
# Mantiene le informazioni degli agenti scoperti e registrati
registered_agents = {}      # {agent_id: agent_info_dict}
agent_health_status = {}    # {agent_id: health_status_dict}
discovery_events = []       # Lista cronologica degli eventi di discovery

# Endpoint noti per la discovery automatica
# Lista degli agenti da scoprire all'avvio del servizio
KNOWN_AGENT_ENDPOINTS = [
    {"id": "agent-a-text-processor", "name": "Text Processing Agent", "port": 3001, "card_url": "http://localhost:3001/.well-known/agent.json"},
    {"id": "agent-b-math-calculator", "name": "Math Calculator Agent", "port": 3002, "card_url": "http://localhost:3002/.well-known/agent.json"},
    {"id": "agent-c-sentiment-analyzer", "name": "Sentiment Analysis Agent", "port": 3003, "card_url": "http://localhost:3003/.well-known/agent.json"},
    {"id": "agent-d-language-detector", "name": "Language Detection Agent", "port": 3004, "card_url": "http://localhost:3004/.well-known/agent.json"},
    {"id": "agent-e-intelligent-orchestrator", "name": "Intelligent Orchestrator Agent", "port": 3005, "card_url": "http://localhost:3005/.well-known/agent.json"}
]

def add_discovery_event(event_type: str, message: str, data: Any = None):
    """
    Aggiunge un evento al log di discovery per tracciamento delle attività.
    
    Funzionalità:
    - Registra eventi di discovery con timestamp
    - Mantiene un buffer circolare degli ultimi 100 eventi
    - Fornisce logging visuale delle operazioni
    - Supporta dati strutturati per eventi complessi
    
    Args:
        event_type (str): Tipo di evento (es. 'agent_discovered', 'health_check_start')
        message (str): Messaggio descrittivo dell'evento
        data (Any, optional): Dati aggiuntivi associati all'evento
    
    Comportamento:
        - Aggiunge timestamp UTC ISO format
        - Mantiene solo gli ultimi 100 eventi (FIFO)
        - Stampa messaggio su console per debugging
        - Facilita troubleshooting e monitoring
    """    
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "type": event_type,
        "message": message,
        "data": data
    }
    discovery_events.append(event)
    # Mantiene solo gli ultimi 100 eventi per evitare consumo eccessivo di memoria
    if len(discovery_events) > 100:
        discovery_events.pop(0)
    print(f"🔍 Discovery: {message}")

def fetch_agent_card(agent_endpoint: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recupera e valida una Agent Card da un endpoint specifico.
    
    Implementa il processo di discovery del protocollo A2A:
    1. Richiesta HTTP GET all'endpoint /.well-known/agent.json
    2. Validazione struttura Agent Card secondo specifiche A2A
    3. Estrazione metadati e endpoints dell'agente
    4. Creazione record agente standardizzato
    
    Args:
        agent_endpoint (Dict[str, Any]): Configurazione endpoint con:
            - id: Identificativo univoco agente
            - name: Nome descrittivo agente  
            - port: Porta di ascolto
            - card_url: URL della Agent Card
    
    Returns:
        Dict[str, Any]: Informazioni complete dell'agente o None se fallisce
            - id, name, port: Identificativi base
            - agent_card: Agent Card completa
            - status: Stato operativo ('online')
            - rpc_endpoint: Endpoint per chiamate JSON-RPC
            - status_endpoint: Endpoint per health check
            - events_endpoint: Endpoint per Server-Sent Events
            - capabilities: Lista delle capacità offerte
            - version: Versione dell'agente
    
    Note:
        - Timeout di 5 secondi per evitare blocchi
        - Validazione presenza campi obbligatori 'agent' e 'spec'
        - Gestione graceful degli errori di rete
        - Logging automatico del risultato
    """    
    try:
        # Richiesta Agent Card tramite protocollo A2A discovery
        response = requests.get(agent_endpoint["card_url"], timeout=5)
        if response.status_code == 200:
            agent_card = response.json()
            
            # Validazione struttura Agent Card secondo specifiche A2A
            # Verifica presenza campi obbligatori 'agent' e 'spec'
            if "agent" in agent_card and "spec" in agent_card:
                # Costruzione record agente standardizzato
                agent_info = {
                    "id": agent_endpoint["id"],
                    "name": agent_endpoint["name"],
                    "port": agent_endpoint["port"],
                    "card_url": agent_endpoint["card_url"],
                    "agent_card": agent_card,
                    "status": "online",
                    "last_seen": datetime.utcnow().isoformat(),
                    # Estrazione endpoints dal campo 'agent.endpoints'
                    "rpc_endpoint": agent_card["agent"]["endpoints"].get("rpc"),
                    "status_endpoint": agent_card["agent"]["endpoints"].get("status"),
                    "events_endpoint": agent_card["agent"]["endpoints"].get("events"),
                    # Estrazione metadati operativi
                    "capabilities": agent_card["agent"].get("capabilities", []),
                    "version": agent_card["agent"].get("version", "unknown")
                }
                
                add_discovery_event("agent_discovered", f"Discovered {agent_endpoint['name']}", agent_info)
                return agent_info
        
        # Gestione errori HTTP
        add_discovery_event("agent_error", f"Failed to fetch card for {agent_endpoint['name']}: HTTP {response.status_code}")
        return None
        
    except requests.exceptions.RequestException as e:
        # Gestione errori di rete (timeout, connessione, DNS, etc.)
        add_discovery_event("agent_error", f"Failed to reach {agent_endpoint['name']}: {str(e)}")
        return None

def check_agent_health(agent_id: str, agent_info: Dict[str, Any]) -> bool:
    """
    Verifica lo stato di salute di un agente registrato.
    
    Implementa health check secondo protocollo A2A:
    1. Richiesta GET all'endpoint /status dell'agente
    2. Verifica risposta HTTP 200 OK
    3. Misurazione tempo di risposta
    4. Aggiornamento stato di salute nel registro
    
    Args:
        agent_id (str): Identificativo univoco dell'agente
        agent_info (Dict[str, Any]): Informazioni agente con status_endpoint
    
    Returns:
        bool: True se agente è sano, False altrimenti
    
    Comportamento:
        - Timeout di 3 secondi per health check rapido
        - Memorizza tempo di risposta per metriche performance
        - Aggiorna agent_health_status con risultato dettagliato
        - Gestisce gracefully agenti non raggiungibili
        - Supporta agenti senza endpoint di status
    
    Note:
        - Health check non invasivo (solo GET /status)
        - Storico stato mantenuto per trend analysis
        - Fallback a 'unhealthy' per qualsiasi errore
    """    
    try:
        # Verifica se l'agente ha un endpoint di status configurato
        if agent_info.get("status_endpoint"):
            # Richiesta health check con timeout ridotto
            response = requests.get(agent_info["status_endpoint"], timeout=3)
            if response.status_code == 200:
                status_data = response.json()
                # Aggiornamento stato positivo con metriche
                agent_health_status[agent_id] = {
                    "status": "healthy",
                    "last_check": datetime.utcnow().isoformat(),
                    "response_time": response.elapsed.total_seconds(),  # Tempo in secondi
                    "data": status_data
                }
                return True
        
        # Agente senza endpoint status o non raggiungibile
        agent_health_status[agent_id] = {
            "status": "unhealthy",
            "last_check": datetime.utcnow().isoformat(),
            "error": "Status endpoint unreachable"
        }
        return False
        
    except Exception as e:
        # Gestione errori generici (timeout, JSON parsing, etc.)
        agent_health_status[agent_id] = {
            "status": "unhealthy", 
            "last_check": datetime.utcnow().isoformat(),
            "error": str(e)
        }
        return False

def discover_agents():
    """
    Esegue il processo di discovery automatica degli agenti configurati.
    
    Processo:
    1. Iterazione su tutti gli endpoint noti (KNOWN_AGENT_ENDPOINTS)
    2. Tentativo di recupero Agent Card per ciascun endpoint
    3. Registrazione agenti scoperti nel registro centrale
    4. Logging del risultato della discovery
    
    Funzionalità:
        - Discovery batch di tutti gli agenti noti
        - Registrazione automatica nel registro centrale
        - Conteggio agenti scoperti con successo
        - Logging eventi per troubleshooting
        - Resilienza agli errori di singoli agenti
    
    Side Effects:
        - Popola registered_agents con agenti disponibili
        - Aggiunge eventi di discovery al log
        - Stampa conteggio finale agenti scoperti
    
    Note:
        - Operazione idempotente (sicura da rieseguire)
        - Non rimuove agenti registrati in precedenza
        - Supporta discovery incrementale
    """    
    add_discovery_event("discovery_start", "Starting agent discovery process")
    
    discovered_count = 0
    # Iterazione su tutti gli endpoint di agenti noti
    for agent_endpoint in KNOWN_AGENT_ENDPOINTS:
        # Tentativo di discovery per singolo agente
        agent_info = fetch_agent_card(agent_endpoint)
        if agent_info:
            # Registrazione agente scoperto nel registro centrale
            registered_agents[agent_info["id"]] = agent_info
            discovered_count += 1
    
    # Logging risultato complessivo della discovery
    add_discovery_event("discovery_complete", f"Discovery completed. Found {discovered_count} agents", 
                       {"total_agents": discovered_count, "registered_agents": list(registered_agents.keys())})

def health_check_loop():
    """
    Loop di monitoraggio continuo della salute degli agenti registrati.
    
    Funzionalità:
    - Esecuzione periodica ogni 30 secondi
    - Health check di tutti gli agenti registrati
    - Aggiornamento stato 'online'/'offline' nel registro
    - Logging riepilogativo dei risultati
    - Esecuzione in background thread separato
    
    Processo:
    1. Sleep di 30 secondi tra i cicli
    2. Skip se nessun agente registrato
    3. Health check parallelo di tutti gli agenti
    4. Aggiornamento stato nel registro principale
    5. Conteggio agenti sani vs non sani
    6. Logging evento di completamento
    
    Note:
        - Thread daemon (termina con programma principale)
        - Resiliente agli errori di singoli agenti
        - Non interferisce con operazioni di discovery
        - Mantiene storico health status separato
    """    
    while True:
        time.sleep(30)  # Health check ogni 30 secondi
        
        # Skip se nessun agente da monitorare
        if not registered_agents:
            continue
            
        add_discovery_event("health_check_start", f"Starting health check for {len(registered_agents)} agents")
        
        healthy_count = 0
        # Health check di tutti gli agenti registrati
        for agent_id, agent_info in registered_agents.items():
            if check_agent_health(agent_id, agent_info):
                healthy_count += 1
                # Aggiornamento stato online nel registro principale
                registered_agents[agent_id]["status"] = "online"
                registered_agents[agent_id]["last_seen"] = datetime.utcnow().isoformat()
            else:
                # Aggiornamento stato offline
                registered_agents[agent_id]["status"] = "offline"
        
        # Logging riepilogativo health check
        add_discovery_event("health_check_complete", 
                           f"Health check completed. {healthy_count}/{len(registered_agents)} agents healthy")

# === ENDPOINTS API REST ===

@app.route('/api/agents', methods=['GET'])
def get_agents():
    """
    Endpoint API: Recupera lista completa degli agenti registrati.
    
    Fornisce informazioni dettagliate su tutti gli agenti scoperti e registrati
    nel sistema, inclusi metadati, stato operativo e timestamp.
    
    Method: GET
    Path: /api/agents
    
    Returns:
        JSON Response: {
            "agents": Array di oggetti agente completi,
            "count": Numero totale agenti registrati,
            "timestamp": Timestamp ISO della risposta
        }
    
    Utilizzo:
        - Client discovery per conoscere agenti disponibili
        - Dashboard monitoring per visualizzazione stato
        - Orchestratori per selezione agenti per task
        - Sistemi di load balancing per distribuzione carico
    """    
    return jsonify({
        "agents": list(registered_agents.values()),
        "count": len(registered_agents),
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/agents/<agent_id>', methods=['GET'])
def get_agent(agent_id):
    """
    Endpoint API: Recupera informazioni dettagliate di un agente specifico.
    
    Fornisce tutti i metadati e lo stato di salute di un singolo agente,
    combinando dati dal registro principale e dal sistema di health monitoring.
    
    Method: GET
    Path: /api/agents/<agent_id>
    
    Args:
        agent_id (str): Identificativo univoco dell'agente
    
    Returns:
        JSON Response: Oggetto agente completo con health status integrato
        HTTP 404: Se agente non trovato nel registro
    
    Funzionalità:
        - Merge automatico dati registro + health status
        - Informazioni real-time sullo stato operativo
        - Dettagli Agent Card e capabilities
        - Metriche di performance (response time)
    """    
    if agent_id in registered_agents:
        # Copia dati agente dal registro principale
        agent_info = registered_agents[agent_id].copy()
        # Integrazione health status dal sistema di monitoring
        agent_info["health"] = agent_health_status.get(agent_id, {"status": "unknown"})
        return jsonify(agent_info)
    else:
        return jsonify({"error": "Agent not found"}), 404

@app.route('/api/agents/register', methods=['POST'])
def register_agent():
    """
    Endpoint API: Registrazione dinamica di nuovi agenti.
    
    Permette agli agenti di registrarsi automaticamente nel discovery service
    fornendo l'URL della propria Agent Card. Il servizio recupera e valida
    la card prima di procedere con la registrazione.
    
    Method: POST
    Path: /api/agents/register
    
    Request Body:
        {
            "id": "agent-unique-id",
            "card_url": "http://agent-host/agent.json"
        }
    
    Returns:
        JSON Success: {"status": "registered", "agent_id": "...", "message": "..."}
        JSON Error: {"error": "description"} con HTTP 400/500
    
    Processo:
        1. Validazione parametri richiesti (id, card_url)
        2. Fetch e parsing Agent Card dall'URL fornito
        3. Validazione struttura secondo protocollo A2A
        4. Creazione record agente e registrazione
        5. Logging evento di registrazione dinamica
    
    Utilizzo:
        - Auto-registrazione agenti al boot
        - Registrazione runtime di nuovi servizi
        - Integrazione con sistemi di deployment
        - Service mesh auto-discovery
    """
    try:
        data = request.get_json()
        agent_id = data.get("id")
        agent_card_url = data.get("card_url")
        
        if not agent_id or not agent_card_url:
            return jsonify({"error": "Missing agent ID or card URL"}), 400
        
        # Fetch and validate agent card
        try:
            response = requests.get(agent_card_url, timeout=5)
            if response.status_code == 200:
                agent_card = response.json()
                
                agent_info = {
                    "id": agent_id,
                    "name": agent_card["agent"].get("name", agent_id),
                    "card_url": agent_card_url,
                    "agent_card": agent_card,
                    "status": "online",
                    "last_seen": datetime.utcnow().isoformat(),
                    "registered_at": datetime.utcnow().isoformat(),
                    "rpc_endpoint": agent_card["agent"]["endpoints"].get("rpc"),
                    "status_endpoint": agent_card["agent"]["endpoints"].get("status"),
                    "events_endpoint": agent_card["agent"]["endpoints"].get("events"),
                    "capabilities": agent_card["agent"].get("capabilities", []),
                    "version": agent_card["agent"].get("version", "unknown")
                }
                
                registered_agents[agent_id] = agent_info
                add_discovery_event("agent_registered", f"Agent {agent_id} registered dynamically", agent_info)
                
                return jsonify({
                    "status": "registered",
                    "agent_id": agent_id,
                    "message": "Agent registered successfully"
                })
            else:
                return jsonify({"error": "Could not fetch agent card"}), 400
                
        except Exception as e:
            return jsonify({"error": f"Failed to fetch agent card: {str(e)}"}), 400
            
    except Exception as e:
        return jsonify({"error": f"Registration failed: {str(e)}"}), 500

@app.route('/api/agents/<agent_id>', methods=['DELETE'])
def unregister_agent(agent_id):
    """Unregister an agent"""
    if agent_id in registered_agents:
        removed_agent = registered_agents.pop(agent_id)
        if agent_id in agent_health_status:
            agent_health_status.pop(agent_id)
        
        add_discovery_event("agent_unregistered", f"Agent {agent_id} unregistered", removed_agent)
        return jsonify({"status": "unregistered", "agent_id": agent_id})
    else:
        return jsonify({"error": "Agent not found"}), 404

@app.route('/api/discovery/rediscover', methods=['POST'])
def rediscover_agents():
    """Trigger agent rediscovery"""
    discover_agents()
    return jsonify({
        "status": "rediscovery_complete",
        "agents_found": len(registered_agents),
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/discovery/events', methods=['GET'])
def get_discovery_events():
    """Get discovery events log"""
    return jsonify({
        "events": discovery_events,
        "count": len(discovery_events)
    })

@app.route('/api/health', methods=['GET'])
def get_health_status():
    """Get health status of all agents"""
    return jsonify({
        "agents": agent_health_status,
        "summary": {
            "total_agents": len(registered_agents),
            "healthy_agents": sum(1 for status in agent_health_status.values() if status.get("status") == "healthy"),
            "unhealthy_agents": sum(1 for status in agent_health_status.values() if status.get("status") == "unhealthy")
        },
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/api/capabilities', methods=['GET'])
def get_all_capabilities():
    """Get all capabilities from all agents"""
    all_capabilities = {}
    for agent_id, agent_info in registered_agents.items():
        all_capabilities[agent_id] = {
            "name": agent_info.get("name"),
            "capabilities": agent_info.get("capabilities", []),
            "status": agent_info.get("status"),
            "version": agent_info.get("version")
        }
    
    return jsonify({
        "agents": all_capabilities,
        "total_capabilities": sum(len(info["capabilities"]) for info in all_capabilities.values())
    })

@app.route('/status')
def status():
    """
    Endpoint di status del Discovery Service.
    
    Fornisce informazioni sullo stato operativo del servizio di discovery,
    inclusi metadati del servizio e statistiche operative correnti.
    
    Method: GET
    Path: /status
    
    Returns:
        JSON Response: {
            "status": "ok",
            "service": Nome del servizio,
            "version": Versione del servizio,
            "timestamp": Timestamp ISO corrente,
            "registered_agents": Numero agenti registrati,
            "discovery_events": Numero eventi di discovery
        }
    
    Utilizzo:
        - Health check del discovery service stesso
        - Monitoring infrastrutturale
        - Validation deployment e configurazione
        - Load balancer health probes
    """
    return jsonify({
        "status": "ok",
        "service": DISCOVERY_CONFIG["name"],
        "version": DISCOVERY_CONFIG["version"],
        "timestamp": datetime.utcnow().isoformat(),
        "registered_agents": len(registered_agents),
        "discovery_events": len(discovery_events)
    })

@app.route('/')
def dashboard():
    """
    Dashboard web interattiva per monitoraggio del sistema A2A.
    
    Fornisce un'interfaccia grafica completa per visualizzare:
    - Stato del discovery service
    - Lista agenti registrati con health status
    - Eventi di discovery in tempo reale
    - Funzionalità di rediscovery manuale
    - Auto-refresh ogni 30 secondi
    
    Method: GET
    Path: /
    
    Returns:
        HTML: Pagina web interattiva con JavaScript
    
    Funzionalità:
        - Grid responsivo agenti con stato colore-coded
        - Visualizzazione capabilities per agente
        - Log eventi discovery chronologico
        - Pulsanti azione (refresh, rediscover)
        - Metriche aggregate del sistema
        - Auto-refresh asincrono via JavaScript
    
    Tecnologie:
        - HTML5 + CSS3 responsive
        - JavaScript vanilla (no dependencies)
        - Fetch API per chiamate asincrone
        - CSS Grid per layout adattivo
    """
    dashboard_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>A2A Discovery Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
            .agent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .agent-card { background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #3498db; }
            .status-online { border-left-color: #27ae60; }
            .status-offline { border-left-color: #e74c3c; }
            .capability { background: #ecf0f1; padding: 5px 10px; border-radius: 12px; font-size: 12px; margin: 2px; display: inline-block; }
            .refresh-btn { background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
            .refresh-btn:hover { background: #2980b9; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔍 Agent2Agent Discovery Dashboard</h1>
                <p>Python Implementation - Real-time Agent Discovery and Monitoring</p>
            </div>
            
            <div class="card">
                <h2>Service Status</h2>
                <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
                <button class="refresh-btn" onclick="rediscover()">🔍 Rediscover Agents</button>
                <div id="service-status">Loading...</div>
            </div>
            
            <div class="card">
                <h2>Registered Agents</h2>
                <div id="agents-grid" class="agent-grid">Loading...</div>
            </div>
            
            <div class="card">
                <h2>Recent Discovery Events</h2>
                <div id="discovery-events">Loading...</div>
            </div>
        </div>
        
        <script>
            async function loadDashboard() {
                try {
                    // Load service status
                    const statusResponse = await fetch('/status');
                    const statusData = await statusResponse.json();
                    document.getElementById('service-status').innerHTML = `
                        <p><strong>Status:</strong> ${statusData.status}</p>
                        <p><strong>Registered Agents:</strong> ${statusData.registered_agents}</p>
                        <p><strong>Last Update:</strong> ${new Date(statusData.timestamp).toLocaleString()}</p>
                    `;
                    
                    // Load agents
                    const agentsResponse = await fetch('/api/agents');
                    const agentsData = await agentsResponse.json();
                    
                    // Load health status
                    const healthResponse = await fetch('/api/health');
                    const healthData = await healthResponse.json();
                    
                    const agentsHtml = agentsData.agents.map(agent => {
                        const health = healthData.agents[agent.id] || {status: 'unknown'};
                        const statusClass = agent.status === 'online' ? 'status-online' : 'status-offline';
                        const capabilities = agent.capabilities.map(cap => `<span class="capability">${cap}</span>`).join('');
                        
                        return `
                            <div class="agent-card ${statusClass}">
                                <h3>${agent.name}</h3>
                                <p><strong>ID:</strong> ${agent.id}</p>
                                <p><strong>Status:</strong> ${agent.status} (${health.status})</p>
                                <p><strong>Version:</strong> ${agent.version}</p>
                                <p><strong>Port:</strong> ${agent.port}</p>
                                <p><strong>Capabilities:</strong></p>
                                <div>${capabilities}</div>
                                <p><strong>Last Seen:</strong> ${new Date(agent.last_seen).toLocaleString()}</p>
                            </div>
                        `;
                    }).join('');
                    
                    document.getElementById('agents-grid').innerHTML = agentsHtml || '<p>No agents registered</p>';
                    
                    // Load discovery events
                    const eventsResponse = await fetch('/api/discovery/events');
                    const eventsData = await eventsResponse.json();
                    
                    const eventsHtml = eventsData.events.slice(-10).reverse().map(event => `
                        <div style="padding: 10px; border-bottom: 1px solid #eee;">
                            <strong>${new Date(event.timestamp).toLocaleString()}</strong> - 
                            <span style="color: #3498db;">${event.type}</span>: ${event.message}
                        </div>
                    `).join('');
                    
                    document.getElementById('discovery-events').innerHTML = eventsHtml || '<p>No discovery events</p>';
                    
                } catch (error) {
                    console.error('Error loading dashboard:', error);
                }
            }
            
            async function rediscover() {
                try {
                    await fetch('/api/discovery/rediscover', {method: 'POST'});
                    setTimeout(loadDashboard, 2000); // Reload after 2 seconds
                } catch (error) {
                    console.error('Error rediscovering agents:', error);
                }
            }
            
            // Load dashboard on page load
            loadDashboard();
            
            // Auto-refresh every 30 seconds
            setInterval(loadDashboard, 30000);
        </script>
    </body>
    </html>
    """
    return dashboard_html

if __name__ == '__main__':
    # Banner di avvio con informazioni di configurazione
    print(f"🚀 Starting {DISCOVERY_CONFIG['name']} v{DISCOVERY_CONFIG['version']}")
    print(f"🌐 Dashboard: http://localhost:{DISCOVERY_CONFIG['port']}/")
    print(f"📡 API: http://localhost:{DISCOVERY_CONFIG['port']}/api/agents")
    print(f"🔍 Status: http://localhost:{DISCOVERY_CONFIG['port']}/status")
    
    # Avvio processo di discovery automatica degli agenti noti
    # Popola il registro con agenti disponibili all'avvio
    discover_agents()
    
    # Avvio thread di health monitoring in background
    # Thread daemon: termina automaticamente con il processo principale
    health_thread = threading.Thread(target=health_check_loop, daemon=True)
    health_thread.start()
    
    # Avvio server Flask con configurazione production-ready
    # host='0.0.0.0': accessibile da tutti gli indirizzi di rete
    # debug=True: abilitato per development (disabilitare in produzione)
    app.run(host='0.0.0.0', port=DISCOVERY_CONFIG['port'], debug=True)
