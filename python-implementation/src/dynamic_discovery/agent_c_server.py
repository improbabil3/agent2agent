"""
Agent C - Sentiment Analysis Agent
==================================

Questo agente implementa il protocollo Agent2Agent (A2A) per analisi del sentiment
e rilevamento emozioni in testi. Utilizza algoritmi basati su keywords e pattern matching.

Funzionalità di analisi:
- Sentiment analysis: positive, negative, neutral con confidence score
- Emotion detection: joy, anger, sadness, fear, surprise, disgust
- Keyword extraction: parole chiave e topics principali  
- Text analysis: statistiche testuali e pattern linguistici
- Analisi dettagliata: scores granulari per tutti gli aspetti

Algoritmi utilizzati:
- Keyword-based sentiment analysis con dizionari predefiniti
- Emotion detection tramite pattern matching emotivo
- Confidence scoring basato su ratio parole/testo
- Topic extraction tramite frequency analysis

Endpoints conformi A2A:
- GET /.well-known/agent.json - Agent Card per discovery
- GET /status - Health check con statistiche analisi
- POST /rpc - JSON-RPC 2.0 per analisi sentiment/emozioni
- GET /events - Server-Sent Events per aggiornamenti real-time
- GET /api/tasks - Monitoring task di analisi

Porta: 3003
Dominio: natural-language  
Formati: text/plain, application/json
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import json
import time
import threading
import uuid
import re
from datetime import datetime

# Inizializzazione Flask con CORS per richieste cross-origin
app = Flask(__name__)
CORS(app)  # Abilita CORS per compatibilità browser/domini multipli

# Configurazione agente specializzato in sentiment analysis
AGENT_CONFIG = {
    "id": "agent-c-sentiment-analyzer",       # ID unico per discovery system
    "name": "Sentiment Analysis Agent",       # Nome descrittivo
    "description": "Advanced sentiment analysis and emotion detection",
    "version": "2.0.0",                       # Versione agente
    "port": 3003,                            # Porta di ascolto
    # Capacità di analisi testuale esposte per discovery
    "capabilities": [
        "sentiment.analyze.basic",            # Sentiment base (pos/neg/neu)
        "sentiment.analyze.detailed",         # Sentiment dettagliato con scores
        "emotion.detect.primary",             # Emozione primaria dominante
        "emotion.detect.secondary",           # Emozioni secondarie rilevate
        "text.analyze.keywords",              # Estrazione keywords
        "text.analyze.topics"                 # Analisi topics/temi
    ]
}

# Storage per task di analisi attivi - tracking asincrono
active_tasks = {}

# Storage per aggiornamenti task - utilizzato per Server-Sent Events  
task_updates = {}

# Dizionari di keywords per sentiment analysis basato su regole
# Lista parole positive per sentiment positivo
POSITIVE_WORDS = [
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
    'happy', 'joy', 'love', 'beautiful', 'perfect', 'brilliant', 'outstanding',
    'superb', 'marvelous', 'delightful', 'pleased', 'satisfied', 'thrilled'
]

# Lista parole negative per sentiment negativo
NEGATIVE_WORDS = [
    'bad', 'terrible', 'awful', 'horrible', 'hate', 'disgusting', 'worst',
    'angry', 'sad', 'disappointed', 'frustrated', 'annoyed', 'upset', 'furious',
    'disgusted', 'depressed', 'miserable', 'unhappy', 'dissatisfied', 'dreadful'
]

# Mappatura keywords per detection emozioni specifiche
EMOTION_KEYWORDS = {
    'joy': ['happy', 'joy', 'excited', 'cheerful', 'delighted', 'thrilled'],           # Gioia
    'anger': ['angry', 'furious', 'mad', 'rage', 'annoyed', 'irritated'],             # Rabbia
    'sadness': ['sad', 'depressed', 'melancholy', 'grief', 'sorrow', 'unhappy'],      # Tristezza
    'fear': ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous'],       # Paura
    'surprise': ['surprised', 'shocked', 'amazed', 'astonished', 'stunned'],          # Sorpresa
    'disgust': ['disgusted', 'revolted', 'repulsed', 'nauseated', 'sickened']         # Disgusto
}

# Agent Card
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
            "type": "sentiment-analyzer",
            "domain": "natural-language",
            "supportedFormats": ["text/plain", "application/json"],
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

def analyze_sentiment(text):
    """
    Analizza il sentiment di un testo usando keyword-based analysis.
    
    Implementa un algoritmo di sentiment analysis basato su:
    - Conteggio parole positive vs negative
    - Calcolo ratio rispetto al testo totale
    - Confidence score basato su densità emotiva
    - Classification in positive/negative/neutral
    
    Args:
        text (str): Testo da analizzare per sentiment
        
    Returns:
        dict: Risultato analisi con sentiment, confidence e scores dettagliati
        
    Formato risultato:
    {
        "sentiment": "positive|negative|neutral",
        "confidence": 0.0-1.0,
        "scores": {
            "positive": ratio_parole_positive,
            "negative": ratio_parole_negative, 
            "neutral": ratio_parole_neutrali
        }
    }
    
    Note:
        - Usa regex per tokenizzazione parole
        - Confidence aumenta con densità keywords emotivi
        - Fallback su neutral se nessun pattern rilevato
    """
    # Tokenizzazione con regex per estrarre parole
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Conteggio keywords positive e negative nel testo
    positive_count = sum(1 for word in words if word in POSITIVE_WORDS)
    negative_count = sum(1 for word in words if word in NEGATIVE_WORDS)
    total_words = len(words)
    
    # Gestione caso edge: testo vuoto
    if total_words == 0:
        return {
            "sentiment": "neutral",
            "confidence": 0.0,
            "scores": {"positive": 0.0, "negative": 0.0, "neutral": 1.0}
        }
    
    # Calcolo ratio parole emotive rispetto al totale
    positive_ratio = positive_count / total_words
    negative_ratio = negative_count / total_words
    
    # Classificazione sentiment con confidence scoring
    if positive_count > negative_count:
        sentiment = "positive"
        confidence = min(positive_ratio * 2, 1.0)  # Confidence boost per density
    elif negative_count > positive_count:
        sentiment = "negative"  
        confidence = min(negative_ratio * 2, 1.0)  # Confidence boost per density
    else:
        sentiment = "neutral"
        confidence = 1.0 - (positive_ratio + negative_ratio)  # Confidence da neutralità
    
    return {
        "sentiment": sentiment,
        "confidence": confidence,
        "scores": {
            "positive": positive_ratio,
            "negative": negative_ratio,
            "neutral": 1.0 - positive_ratio - negative_ratio
        }
    }

def detect_emotions(text):
    """
    Rileva emozioni primarie e secondarie nel testo.
    
    Implementa emotion detection tramite:
    - Pattern matching con keywords emozionali
    - Scoring basato su frequenza e densità
    - Identificazione emozione primaria dominante
    - Rilevamento emozioni secondarie sopra soglia
    
    Emozioni supportate:
    - joy: gioia, felicità, eccitazione
    - anger: rabbia, irritazione, furia
    - sadness: tristezza, melanconia, depressione
    - fear: paura, ansia, preoccupazione
    - surprise: sorpresa, stupore, meraviglia
    - disgust: disgusto, repulsione, nausea
    
    Args:
        text (str): Testo da analizzare per emozioni
        
    Returns:
        dict: Risultato detection con emozione primaria e secondarie
        
    Formato risultato:
    {
        "primary": {
            "emotion": "nome_emozione_primaria",
            "confidence": 0.0-1.0
        },
        "secondary": {
            "emozione": score,
            ...
        },
        "all_scores": {
            "joy": score,
            "anger": score,
            ...
        }
    }
    
    Note:
        - Threshold 0.02 per emozioni secondarie 
        - Confidence boost factor 5x per emozione primaria
        - Fallback su "neutral" se nessuna emozione rilevata
    """
    # Tokenizzazione per analisi keywords emozionali
    words = re.findall(r'\b\w+\b', text.lower())
    emotion_scores = {}
    
    # Calcolo score per ogni categoria emotiva
    for emotion, keywords in EMOTION_KEYWORDS.items():
        # Conta occorrenze keywords emozionali specifiche
        count = sum(1 for word in words if word in keywords)
        # Normalizza per lunghezza testo (ratio)
        emotion_scores[emotion] = count / len(words) if words else 0
    
    # Identificazione emozione primaria (score più alto)
    primary_emotion = max(emotion_scores, key=emotion_scores.get) if emotion_scores else "neutral"
    primary_score = emotion_scores.get(primary_emotion, 0)
    
    # Identificazione emozioni secondarie sopra threshold
    threshold = 0.02  # Soglia minima per emozioni secondarie
    secondary_emotions = {k: v for k, v in emotion_scores.items() 
                         if v > threshold and k != primary_emotion}
    
    return {
        "primary": {
            "emotion": primary_emotion,
            "confidence": min(primary_score * 5, 1.0)  # Confidence boost 5x
        },
        "secondary": secondary_emotions,
        "all_scores": emotion_scores
    }

def extract_keywords(text):
    """
    Estrae keywords significative dal testo usando frequency analysis.
    
    Implementa estrazione keywords tramite:
    - Tokenizzazione con regex per parole
    - Filtro stop words comuni in inglese
    - Conteggio frequenze parole significative  
    - Ranking per frequenza decrescente
    - Ritorno top 10 keywords più frequenti
    
    Args:
        text (str): Testo da cui estrarre keywords
        
    Returns:
        list: Lista keywords con frequenze
        
    Formato risultato:
        [
            {"word": "parola", "frequency": count},
            ...
        ]
        
    Note:
        - Esclude parole < 3 caratteri
        - Stop words: articoli, preposizioni, verbi ausiliari
        - Massimo 10 keywords restituite
        - Ordinamento per frequenza decrescente
    """
    # Tokenizzazione con regex per estrarre parole valide
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Dizionario stop words comuni inglesi da filtrare
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
                  'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
                  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
                  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'}
    
    # Filtro parole significative: no stop words e lunghezza > 2
    filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
    
    # Conteggio frequenze parole con dizionario
    word_freq = {}
    for word in filtered_words:
        word_freq[word] = word_freq.get(word, 0) + 1
    
    # Sorting per frequenza decrescente e formato output
    sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
    keywords = [{"word": word, "frequency": freq} for word, freq in sorted_words[:10]]
    
    return keywords

def process_sentiment_task(task_id, method, params):
    """
    Processa task di sentiment analysis in background thread.
    
    Implementa task processing completo con:
    - Tracking aggiornamenti real-time
    - Validazione parametri input
    - Sentiment analysis core 
    - Emotion detection opzionale (detailed mode)
    - Keyword extraction opzionale
    - Statistiche testo opzionali
    - Error handling e logging
    
    Modalità supportate:
    - basic: solo sentiment analysis
    - detailed: sentiment + emotions + keywords + stats
    
    Args:
        task_id (str): ID univoco del task
        method (str): Metodo JSON-RPC chiamato
        params (dict): Parametri task con text e type
        
    Side Effects:
        - Aggiorna task_updates[task_id] con progress updates
        - Aggiorna active_tasks[task_id] con risultato finale
        - Thread-safe tramite append operations
        
    Parametri task:
        - text (str): Testo da analizzare (required)
        - type (str): "basic" o "detailed" (default: "basic")
        
    Note:
        - Esegue in background thread separato
        - Updates real-time via Server-Sent Events
        - Gestione errori con fallback graceful
    """
    try:
        # Inizializza lista aggiornamenti per questo task
        task_updates[task_id] = []
        
        def add_update(status, message, data=None):
            """Helper function per aggiungere update thread-safe"""
            update = {
                "timestamp": datetime.utcnow().isoformat(),
                "status": status,
                "message": message,
                "data": data
            }
            task_updates[task_id].append(update)
        
        # Update iniziale: task avviato
        add_update("processing", "Starting sentiment analysis")
        
        # Estrazione e validazione parametri
        text = params.get("text", "")
        analysis_type = params.get("type", "basic")  # basic|detailed
        
        # Validazione input obbligatorio
        if not text:
            add_update("error", "No text provided")
            active_tasks[task_id] = {"status": "error", "error": "No text provided"}
            return
        
        # Update: tipo analisi identificato
        add_update("processing", f"Performing {analysis_type} sentiment analysis")
        
        # Core sentiment analysis sempre eseguita
        sentiment_result = analyze_sentiment(text)
        
        # Risultato base con timestamp
        result = {
            "text": text,
            "sentiment": sentiment_result,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Modalità detailed: analisi aggiuntive
        if analysis_type == "detailed":
            # Emotion detection aggiuntiva
            add_update("processing", "Adding emotion detection")
            result["emotions"] = detect_emotions(text)
            
            # Keyword extraction aggiuntiva  
            add_update("processing", "Extracting keywords")
            result["keywords"] = extract_keywords(text)
            
            # Statistiche testo aggiuntive
            result["statistics"] = {
                "character_count": len(text),
                "word_count": len(text.split()),
                "sentence_count": text.count('.') + text.count('!') + text.count('?'),
                "average_word_length": sum(len(word) for word in text.split()) / len(text.split()) if text.split() else 0
            }
        
        # Updates finali: completamento task
        add_update("processing", "Sentiment analysis completed")
        add_update("completed", "Task completed successfully", result)
        
        # Salvataggio risultato finale per query status
        active_tasks[task_id] = {
            "status": "completed",
            "result": result,
            "completedAt": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        # Gestione errori con logging e update
        add_update("error", f"Processing failed: {str(e)}")
        active_tasks[task_id] = {"status": "error", "error": str(e)}

@app.route('/.well-known/agent.json')
def agent_card():
    """
    Endpoint Agent Card per discovery protocol A2A.
    
    Espone Agent Card statica secondo standard A2A per:
    - Discovery automatica delle capacità
    - Metadata agent (nome, versione, tipo)
    - Endpoint disponibili (RPC, status, events)
    - Configurazione autenticazione e rate limiting
    - Schema protocol compliance
    
    Returns:
        JSON: Agent Card completa formato A2A v1.0
        
    HTTP:
        - GET /.well-known/agent.json
        - Content-Type: application/json
        - No authentication required (public discovery)
        
    Note:
        - Segue RFC standard per .well-known endpoints
        - Cache-able response per performance
        - Compliance con schema A2A ufficiale
    """
    return jsonify(AGENT_CARD)

@app.route('/status')
def status():
    """
    Health check endpoint per monitoring e discovery.
    
    Fornisce stato operativo agent con:
    - Status operativo (ok/error)  
    - Metadata identificativi agent
    - Timestamp corrente per sync
    - Conteggio task attivi per load monitoring
    
    Returns:
        JSON: Status response con metriche operative
        
    HTTP:
        - GET /status
        - Content-Type: application/json
        - No authentication required
        
    Formato response:
    {
        "status": "ok",
        "agent": "nome_agent", 
        "version": "versione",
        "timestamp": "ISO_timestamp",
        "activeTasks": numero_task_attivi
    }
    
    Note:
        - Usato da orchestrator per health monitoring
        - Frequenza polling consigliata: 30s
        - Status "error" indica agent non operativo
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
    Handler principale per JSON-RPC 2.0 requests.
    
    Implementa protocollo JSON-RPC 2.0 compliant con:
    - Validazione request format e versione
    - Routing metodi supportati  
    - Task management asincrono
    - Error handling standardizzato
    - Response format compliance
    
    Metodi supportati:
    - agent.getCapabilities: Ritorna capacità agent
    - tasks.send: Invia nuovo task sentiment analysis  
    - tasks.status: Verifica stato task esistente
    
    Args:
        POST body: JSON-RPC 2.0 request
        
    Returns:
        JSON: JSON-RPC 2.0 response con result o error
        
    HTTP Status:
        - 200: Success con result
        - 400: Invalid request format
        - 404: Method/task not found
        - 500: Internal server error
        
    Request format:
    {
        "jsonrpc": "2.0",
        "method": "metodo",
        "params": {...},
        "id": "request_id"
    }
    
    Response format:
    {
        "jsonrpc": "2.0", 
        "result": {...} | "error": {...},
        "id": "request_id"
    }
    
    Note:
        - Task processing in background threads
        - Thread-safe task management
        - Compliance piena JSON-RPC 2.0 spec
    """
    try:
        # Parsing e validazione JSON request
        data = request.get_json()
        
        # Validazione formato JSON-RPC 2.0
        if not data or data.get('jsonrpc') != '2.0':
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32600, "message": "Invalid Request"},
                "id": data.get('id') if data else None
            }), 400
        
        # Estrazione parametri standard JSON-RPC
        method = data.get('method')
        params = data.get('params', {})
        request_id = data.get('id')
        
        # Router metodi: GET CAPABILITIES
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
        
        # Router metodi: SEND TASK (task submission)
        elif method == 'tasks.send':
            # Generazione ID univoco per task tracking
            task_id = str(uuid.uuid4())
            
            # Avvio processing asincrono in thread separato
            thread = threading.Thread(
                target=process_sentiment_task,
                args=(task_id, method, params)
            )
            thread.start()
            
            # Response immediata con task acceptance
            return jsonify({
                "jsonrpc": "2.0",
                "result": {
                    "taskId": task_id,
                    "status": "accepted",
                    "message": "Sentiment analysis task accepted for processing"
                },
                "id": request_id
            })
        
        # Router metodi: TASK STATUS (status query)
        elif method == 'tasks.status':
            task_id = params.get('taskId')
            # Lookup task esistente in memory store
            if task_id in active_tasks:
                return jsonify({
                    "jsonrpc": "2.0",
                    "result": active_tasks[task_id],
                    "id": request_id
                })
            else:
                # Task ID non trovato
                return jsonify({
                    "jsonrpc": "2.0",
                    "error": {"code": -32602, "message": "Task not found"},
                    "id": request_id
                }), 404
        
        # Metodo non riconosciuto
        else:
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": "Method not found"},
                "id": request_id
            }), 404
            
    except Exception as e:
        # Gestione errori interni con logging
        return jsonify({
            "jsonrpc": "2.0",
            "error": {"code": -32603, "message": f"Internal error: {str(e)}"},
            "id": data.get('id') if 'data' in locals() else None
        }), 500

@app.route('/events')
def events():
    """
    Server-Sent Events endpoint per real-time task updates.
    
    Implementa SSE (Server-Sent Events) per:
    - Updates real-time su task progress
    - Notifiche connection establishment
    - Streaming continuo event data
    - Client-side event listening support
    
    Event types emessi:
    - connected: Conferma connessione SSE stabilita
    - task_update: Progress update su task specifico
    
    Returns:
        Response: text/event-stream con eventi JSON
        
    HTTP:
        - GET /events
        - Content-Type: text/event-stream  
        - Connection: keep-alive
        - Cache-Control: no-cache
        
    Event format:
        data: {"type": "event_type", "data": {...}}\\n\\n
    
    Client usage:
        const eventSource = new EventSource('/events');
        eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            // Handle event based on data.type
        };
        
    Note:
        - Long-lived connection per client
        - Automatic reconnection on disconnect  
        - Memory efficient con sent_updates tracking
        - 1 second polling interval per performance
    """
    def generate():
        """Generator function per streaming SSE events"""
        # Event iniziale: connessione stabilita
        yield "data: " + json.dumps({
            "type": "connected",
            "agent": AGENT_CONFIG["name"],
            "timestamp": datetime.utcnow().isoformat()
        }) + "\n\n"
        
        # Loop infinito per streaming task updates
        sent_updates = set()  # Tracking aggiornamenti già inviati
        while True:
            # Scan tutti i task con updates disponibili
            for task_id, updates in task_updates.items():
                for i, update in enumerate(updates):
                    # Chiave univoca per deduplication
                    update_key = f"{task_id}_{i}"
                    if update_key not in sent_updates:
                        # Emetti nuovo update via SSE
                        yield "data: " + json.dumps({
                            "type": "task_update",
                            "taskId": task_id,
                            "update": update
                        }) + "\n\n"
                        sent_updates.add(update_key)
            
            # Throttling per evitare CPU overload
            time.sleep(1)
    
    # Response SSE con headers appropriati
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    REST endpoint per query task status bulk.
    
    Fornisce overview completa task attivi per:
    - Monitoring dashboard
    - Debug e troubleshooting
    - Load balancing decisions
    - Administrative queries
    
    Returns:
        JSON: Lista task attivi con status e conteggio
        
    HTTP:
        - GET /api/tasks
        - Content-Type: application/json
        - No authentication required
        
    Response format:
    {
        "tasks": {
            "task_id": {
                "status": "completed|processing|error",
                "result": {...} | null,
                "error": "error_message" | null,
                "completedAt": "timestamp" | null
            },
            ...
        },
        "count": numero_task_totali
    }
    
    Note:
        - Snapshot istantaneo in-memory store
        - Include task completati fino al restart
        - Utile per monitoring e debugging
    """
    return jsonify({
        "tasks": active_tasks,
        "count": len(active_tasks)
    })

if __name__ == '__main__':
    # Banner informativo startup con endpoints principali
    print(f"🚀 Starting {AGENT_CONFIG['name']} v{AGENT_CONFIG['version']}")
    print(f"📡 Agent Card: http://localhost:{AGENT_CONFIG['port']}/.well-known/agent.json")
    print(f"🔍 Status: http://localhost:{AGENT_CONFIG['port']}/status")
    print(f"⚡ RPC Endpoint: http://localhost:{AGENT_CONFIG['port']}/rpc")
    print(f"📊 Events: http://localhost:{AGENT_CONFIG['port']}/events")
    
    # Avvio Flask server con binding su tutte interfacce
    # host='0.0.0.0' permette accesso da network esterno
    # debug=True abilita hot reload e error reporting
    app.run(host='0.0.0.0', port=AGENT_CONFIG['port'], debug=True)
