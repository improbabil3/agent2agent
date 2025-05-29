"""
Agent D - Language Detection Agent  
===================================

Questo agente implementa il protocollo Agent2Agent (A2A) per rilevamento automatico
della lingua e analisi linguistica di testi. Utilizza pattern matching e analisi statistica.

Funzionalità di detection:
- Language detection: identificazione lingua primaria e secondarie
- Character analysis: analisi set caratteri e encoding
- Text validation: verifica formato e struttura testo
- Statistical analysis: frequenze linguistiche e patterns
- Multi-language support: supporto per lingue europee principali

Lingue supportate:
- English: rilevamento tramite articoli e preposizioni comuni
- Italian: rilevamento tramite articoli e congiunzioni italiane  
- Spanish: rilevamento tramite articoli e particelle spagnole
- French: rilevamento tramite articoli e ausiliari francesi
- German: rilevamento tramite articoli e preposizioni tedesche

Algoritmi utilizzati:
- Pattern-based detection con regex per words comuni
- Statistical frequency analysis per confidence scoring
- Character set analysis per encoding detection
- Multi-language scoring con threshold configurabili

Endpoints conformi A2A:
- GET /.well-known/agent.json - Agent Card per discovery
- GET /status - Health check con statistiche detection
- POST /rpc - JSON-RPC 2.0 per language detection
- GET /events - Server-Sent Events per aggiornamenti real-time
- GET /api/tasks - Monitoring task di analisi linguistica

Porta: 3004
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

# Inizializzazione Flask con CORS per richieste multi-dominio
app = Flask(__name__)
CORS(app)  # Abilita CORS per compatibilità browser cross-origin

# Configurazione agente specializzato in language detection
AGENT_CONFIG = {
    "id": "agent-d-language-detector",        # ID unico per discovery system
    "name": "Language Detection Agent",       # Nome descrittivo
    "description": "Language detection and text analysis services",
    "version": "2.0.0",                       # Versione agente
    "port": 3004,                            # Porta di ascolto
    # Capacità di detection linguistico esposte per discovery
    "capabilities": [
        "language.detect.primary",            # Lingua primaria dominante
        "language.detect.secondary",          # Lingue secondarie rilevate
        "text.analyze.characters",            # Analisi caratteri e encoding
        "text.analyze.encoding",              # Detection encoding testo
        "text.validate.format"                # Validazione formato testo
    ]
}

# Storage per task di detection attivi - tracking asincrono
active_tasks = {}

# Storage per aggiornamenti task - utilizzato per Server-Sent Events
task_updates = {}

# Database patterns linguistici per detection automatico
# Configurazione pattern e keywords per ogni lingua supportata
LANGUAGE_PATTERNS = {
    'english': {
        # Regex patterns per identification rapida
        'patterns': [r'\b(the|and|or|but|in|on|at|to|for|of|with|by)\b'],
        # Words comuni per statistical analysis  
        'common_words': ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'],
        'character_set': 'latin'              # Set caratteri utilizzato
    },
    'italian': {
        'patterns': [r'\b(il|la|di|che|e|a|per|con|da|su|in)\b'],
        'common_words': ['il', 'la', 'di', 'che', 'e', 'a', 'per', 'con', 'da', 'su', 'in', 'del', 'delle', 'della'],
        'character_set': 'latin'
    },
    'spanish': {
        'patterns': [r'\b(el|la|de|que|y|en|un|es|se|no|te|lo)\b'],
        'common_words': ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'para', 'con'],
        'character_set': 'latin'
    },
    'french': {
        'patterns': [r'\b(le|de|et|à|un|il|être|et|en|avoir|que|pour)\b'],
        'common_words': ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce'],
        'character_set': 'latin'
    },
    'german': {
        'patterns': [r'\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf)\b'],
        'common_words': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist'],
        'character_set': 'latin'
    }
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
            "type": "language-detector",
            "domain": "natural-language",
            "supportedFormats": ["text/plain", "application/json"],
            "authMethods": ["none", "api-key"],
            "rateLimit": {"requests": 100, "window": 60},
            "supportedLanguages": ["english", "italian", "spanish", "french", "german"]
        }
    },
    "spec": {
        "protocol": "agent2agent",
        "version": "1.0.0",
        "schema": "https://schemas.agent2agent.ai/v1/agent-card.json"
    }
}

def detect_language(text):
    """
    Rileva la lingua di un testo usando pattern matching e analisi statistica.
    
    Implementa language detection tramite:
    - Tokenizzazione testo in parole
    - Matching contro dizionari common words per lingua
    - Calcolo score basato su frequenza matches
    - Confidence boosting per migliorare affidabilità
    - Threshold filtering per lingue secondarie
    
    Lingue supportate:
    - english, italian, spanish, french, german
    - Estensibile aggiungendo pattern a LANGUAGE_PATTERNS
    
    Args:
        text (str): Testo da analizzare per language detection
        
    Returns:
        dict: Risultato detection con lingua primaria e secondarie
        
    Formato risultato:
    {
        "primary_language": "lingua_principale",
        "confidence": 0.0-1.0,
        "detected_languages": [
            {"language": "lingua", "confidence": score, "matches": count}
        ],
        "method": "pattern_matching",
        "total_words_analyzed": numero_parole
    }
    
    Algoritmo:
    1. Tokenizza testo con regex \b\w+\b
    2. Per ogni lingua: conta matches common words
    3. Calcola ratio matches/total_words per lingua
    4. Identifica lingua con score massimo
    5. Applica confidence boost (score * 3)
    6. Filtra lingue secondarie sopra threshold 0.05
    
    Note:
        - Fallback su "unknown" per testo vuoto
        - Confidence boost factor 3x per compensare sparsity
        - Threshold 5% per evitare false positive secondarie
    """
    # Gestione edge case: testo vuoto o solo whitespace
    if not text.strip():
        return {
            "primary_language": "unknown",
            "confidence": 0.0,
            "detected_languages": [],
            "method": "pattern_matching"
        }
    
    # Normalizzazione e tokenizzazione
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)  # Estrae solo parole valide
    total_words = len(words)
    
    # Edge case: nessuna parola estratta
    if total_words == 0:
        return {
            "primary_language": "unknown",
            "confidence": 0.0,
            "detected_languages": [],
            "method": "pattern_matching"
        }
    
    # Calcolo score per ogni lingua supportata
    language_scores = {}
    
    # Analisi pattern matching per linguaggi configurati
    for language, data in LANGUAGE_PATTERNS.items():
        common_words = data['common_words']
        # Conta quante parole del testo matchano common words della lingua
        matches = sum(1 for word in words if word in common_words)
        # Normalizza per lunghezza testo (ratio 0-1)
        score = matches / total_words if total_words > 0 else 0
        language_scores[language] = score
    
    # Identificazione lingua primaria (score massimo)
    primary_language = max(language_scores, key=language_scores.get)
    primary_confidence = language_scores[primary_language]
    
    # Filtro lingue secondarie significative
    threshold = 0.05  # Soglia 5% per evitare noise
    detected_languages = [
        {"language": lang, "confidence": score, "matches": int(score * total_words)}
        for lang, score in language_scores.items()
        if score > threshold
    ]
    # Ordinamento per confidence decrescente
    detected_languages.sort(key=lambda x: x['confidence'], reverse=True)
    
    return {
        "primary_language": primary_language,
        "confidence": min(primary_confidence * 3, 1.0),  # Confidence boost con cap 1.0
        "detected_languages": detected_languages,
        "method": "pattern_matching",
        "total_words_analyzed": total_words
    }

def analyze_text_characteristics(text):
    """
    Analizza caratteristiche strutturali e statistiche del testo.
    
    Implementa analisi multi-dimensionale del testo:
    - Character analysis: conteggio per tipologie caratteri
    - Encoding analysis: compatibilità ASCII e Unicode
    - Text statistics: metriche parole, frasi, paragrafi
    - Average calculations: lunghezze medie per insights
    
    Categorie caratteri analizzate:
    - letters: caratteri alfabetici (a-z, A-Z, accenti)
    - digits: cifre numeriche (0-9)
    - spaces: spazi, tab, newline
    - punctuation: punteggiatura e simboli
    - uppercase/lowercase: case analysis
    
    Args:
        text (str): Testo da analizzare
        
    Returns:
        dict: Analisi completa con statistiche strutturali
        
    Formato risultato:
    {
        "character_analysis": {
            "letters": count, "digits": count, "spaces": count,
            "punctuation": count, "uppercase": count, "lowercase": count
        },
        "encoding_info": {
            "encoding": "utf-8",
            "ascii_compatible": boolean,
            "contains_unicode": boolean
        },
        "text_statistics": {
            "character_count": total_chars,
            "word_count": total_words,
            "sentence_count": total_sentences,
            "paragraph_count": total_paragraphs,
            "average_word_length": media_lunghezza_parole,
            "average_sentence_length": media_parole_per_frase
        }
    }
    
    Note:
        - Sentence detection via punctuation (.!?)
        - Paragraph detection via double newlines
        - Unicode detection per ord(c) > 127
        - Safe division con fallback 0 per edge cases
    """
    # Edge case: testo vuoto
    if not text:
        return {}
    
    # Analisi caratteri per categoria
    char_counts = {
        'letters': sum(1 for c in text if c.isalpha()),       # Lettere alfabetiche
        'digits': sum(1 for c in text if c.isdigit()),       # Cifre numeriche
        'spaces': sum(1 for c in text if c.isspace()),       # Spazi e whitespace
        'punctuation': sum(1 for c in text if not c.isalnum() and not c.isspace()),  # Punteggiatura
        'uppercase': sum(1 for c in text if c.isupper()),    # Maiuscole
        'lowercase': sum(1 for c in text if c.islower())     # Minuscole
    }
    
    # Analisi encoding e compatibilità
    encoding_info = {
        'encoding': 'utf-8',  # Assunzione UTF-8 default
        'ascii_compatible': all(ord(c) < 128 for c in text),  # Test ASCII puro
        'contains_unicode': any(ord(c) > 127 for c in text)   # Test caratteri Unicode
    }
    
    # Statistiche strutturali testo
    words = text.split()  # Tokenizzazione basic su whitespace
    sentences = text.count('.') + text.count('!') + text.count('?')  # Conteggio frasi
    
    statistics = {
        'character_count': len(text),
        'word_count': len(words),
        'sentence_count': sentences,
        'paragraph_count': text.count('\n\n') + 1,  # Paragrafi separati da double newline
        # Calcolo lunghezza media parole (senza punteggiatura)
        'average_word_length': sum(len(word.strip('.,!?;:')) for word in words) / len(words) if words else 0,
        # Calcolo lunghezza media frasi (parole per frase)
        'average_sentence_length': len(words) / sentences if sentences > 0 else 0
    }
    
    return {
        'character_analysis': char_counts,
        'encoding_info': encoding_info,
        'text_statistics': statistics
    }

def validate_text_format(text):
    """
    Valida formato e struttura del testo per quality assurance.
    
    Implementa validazione multi-check per:
    - Presenza contenuto significativo
    - Whitespace formatting issues
    - Encoding validity e compatibilità
    - Structural anomalies detection
    - Suggerimenti automatici per cleanup
    
    Controlli eseguiti:
    - Empty text detection
    - Leading/trailing whitespace
    - Tab characters presence
    - Multiple consecutive spaces
    - UTF-8 encoding validity
    
    Args:
        text (str): Testo da validare
        
    Returns:
        dict: Report validazione con issues e suggestions
        
    Formato risultato:
    {
        "is_valid_text": boolean,
        "issues": ["issue1", "issue2", ...],
        "suggestions": ["suggestion1", "suggestion2", ...]
    }
    
    Validation rules:
    - Empty text → invalid
    - Leading/trailing whitespace → warning
    - Tab characters → warning  
    - Multiple spaces → warning
    - Invalid UTF-8 → invalid
    
    Note:
        - is_valid_text=False per errori critici
        - Suggestions forniscono guidance per fix
        - Utile per data preprocessing pipeline
    """
    # Struttura risultato validazione
    validation_results = {
        'is_valid_text': True,
        'issues': [],
        'suggestions': []
    }
    
    # Check critico: testo completamente vuoto
    if not text:
        validation_results['is_valid_text'] = False
        validation_results['issues'].append('Empty text')
        return validation_results
    
    # Check whitespace formatting: leading/trailing
    if len(text.strip()) != len(text):
        validation_results['issues'].append('Leading or trailing whitespace')
        validation_results['suggestions'].append('Remove leading/trailing whitespace')
    
    # Check caratteri tab (preferire spazi)
    if '\t' in text:
        validation_results['issues'].append('Contains tab characters')
        validation_results['suggestions'].append('Replace tabs with spaces')
    
    # Check spazi multipli consecutivi  
    if re.search(r'\s{2,}', text):
        validation_results['issues'].append('Multiple consecutive spaces')
        validation_results['suggestions'].append('Normalize whitespace')
    
    # Check encoding validity: test UTF-8 compatibility
    try:
        text.encode('utf-8')
    except UnicodeEncodeError:
        validation_results['is_valid_text'] = False
        validation_results['issues'].append('Invalid UTF-8 encoding')
    
    return validation_results

def process_language_task(task_id, method, params):
    """
    Processa task di language detection e text analysis in background.
    
    Implementa task processing modulare con:
    - Multi-mode analysis support
    - Real-time progress tracking
    - Flexible analysis type selection
    - Error handling e recovery
    - Text truncation per display
    
    Modalità analysis supportate:
    - detect: Solo language detection
    - analyze: Solo text characteristics  
    - validate: Solo format validation
    - full: Tutte le analisi combinate
    
    Args:
        task_id (str): ID univoco task per tracking
        method (str): Metodo JSON-RPC chiamato
        params (dict): Parametri con text e type
        
    Side Effects:
        - Aggiorna task_updates[task_id] con progress
        - Aggiorna active_tasks[task_id] con risultato
        - Thread-safe operations
        
    Parametri task:
        - text (str): Testo da analizzare (required)
        - type (str): Tipo analisi - detect|analyze|validate|full
        
    Flusso processing:
    1. Inizializza tracking updates
    2. Valida parametri input
    3. Seleziona modalità analysis
    4. Esegue analisi richieste
    5. Combina risultati
    6. Salva stato completamento
    
    Note:
        - Text truncation a 200 chars per display
        - Modalità modulari per performance
        - Progress updates real-time via SSE
        - Exception handling con fallback graceful
    """
    try:
        # Inizializza lista updates per questo task
        task_updates[task_id] = []
        
        def add_update(status, message, data=None):
            """Helper per aggiungere update thread-safe"""
            update = {
                "timestamp": datetime.utcnow().isoformat(),
                "status": status,
                "message": message,
                "data": data
            }
            task_updates[task_id].append(update)
        
        # Update iniziale: avvio processing
        add_update("processing", "Starting language detection analysis")
        
        # Estrazione e validazione parametri
        text = params.get("text", "")
        analysis_type = params.get("type", "detect")  # Default: solo detection
        
        # Validazione input obbligatorio
        if not text:
            add_update("error", "No text provided")
            active_tasks[task_id] = {"status": "error", "error": "No text provided"}
            return
        
        # Update: tipo analisi identificato
        add_update("processing", f"Performing {analysis_type} analysis")
        
        # Struttura risultato base con text truncation per display
        result = {
            "text": text[:200] + "..." if len(text) > 200 else text,
            "analysis_type": analysis_type,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # MODALITÀ: Language Detection
        if analysis_type == "detect" or analysis_type == "full":
            add_update("processing", "Detecting language")
            result["language_detection"] = detect_language(text)
        
        # MODALITÀ: Text Characteristics Analysis
        if analysis_type == "analyze" or analysis_type == "full":
            add_update("processing", "Analyzing text characteristics")
            result["text_analysis"] = analyze_text_characteristics(text)
        
        # MODALITÀ: Format Validation
        if analysis_type == "validate" or analysis_type == "full":
            add_update("processing", "Validating text format")
            result["format_validation"] = validate_text_format(text)
        
        # Updates finali: completamento task
        add_update("processing", "Language analysis completed")
        add_update("completed", "Task completed successfully", result)
        
        # Salvataggio risultato finale
        active_tasks[task_id] = {
            "status": "completed",
            "result": result,
            "completedAt": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        # Gestione errori con logging
        add_update("error", f"Processing failed: {str(e)}")
        active_tasks[task_id] = {"status": "error", "error": str(e)}

@app.route('/.well-known/agent.json')
def agent_card():
    """
    Endpoint Agent Card per discovery protocol A2A.
    
    Espone Agent Card con metadata specifiche per language detection,
    includendo lingue supportate e capacità di analisi testo.
    
    Returns:
        JSON: Agent Card formato A2A v1.0 con metadata language detection
        
    Note:
        - Compliance standard RFC .well-known
        - Metadata specifiche per language detection domain
        - Lista lingue supportate in metadata.supportedLanguages
    """
    return jsonify(AGENT_CARD)

@app.route('/status')
def status():
    """
    Health check endpoint con informazioni language detection.
    
    Estende status base con lista lingue supportate per
    facilitare discovery e capability inspection.
    
    Returns:
        JSON: Status con supportedLanguages aggiuntive
        
    Formato response:
    {
        "status": "ok",
        "agent": "nome_agent",
        "version": "versione", 
        "timestamp": "ISO_timestamp",
        "activeTasks": numero_task,
        "supportedLanguages": ["english", "italian", ...]
    }
    """
    return jsonify({
        "status": "ok",
        "agent": AGENT_CONFIG["name"],
        "version": AGENT_CONFIG["version"],
        "timestamp": datetime.utcnow().isoformat(),
        "activeTasks": len(active_tasks),
        "supportedLanguages": list(LANGUAGE_PATTERNS.keys())  # Lista lingue supportate
    })

@app.route('/rpc', methods=['POST'])
def handle_rpc():
    """
    Handler JSON-RPC 2.0 per language detection tasks.
    
    Implementa metodi specifici per language analysis:
    - agent.getCapabilities: Include supportedLanguages
    - tasks.send: Accetta task language detection/analysis
    - tasks.status: Query status task esistenti
    
    Estensioni language-specific:
    - getCapabilities include lista lingue supportate
    - tasks.send supporta multi-mode analysis
    - Validation parametri per analysis types
    
    Returns:
        JSON: JSON-RPC 2.0 response con language-specific data
        
    Note:
        - supportedLanguages in capabilities response
        - Task processing asincrono per performance
        - Multi-mode support: detect|analyze|validate|full
    """
    try:
        # Parsing e validazione JSON-RPC standard
        data = request.get_json()
        
        # Validazione formato JSON-RPC 2.0
        if not data or data.get('jsonrpc') != '2.0':
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32600, "message": "Invalid Request"},
                "id": data.get('id') if data else None
            }), 400
        
        # Estrazione parametri standard
        method = data.get('method')
        params = data.get('params', {})
        request_id = data.get('id')
        
        # METODO: Get Capabilities (con lingue supportate)
        if method == 'agent.getCapabilities':
            return jsonify({
                "jsonrpc": "2.0",
                "result": {
                    "capabilities": AGENT_CONFIG["capabilities"],
                    "agent": AGENT_CONFIG["name"],
                    "version": AGENT_CONFIG["version"],
                    "supportedLanguages": list(LANGUAGE_PATTERNS.keys())  # Language-specific
                },
                "id": request_id
            })
        
        # METODO: Send Task (language detection)
        elif method == 'tasks.send':
            # Generazione task ID univoco
            task_id = str(uuid.uuid4())
            
            # Avvio processing asincrono
            thread = threading.Thread(
                target=process_language_task,
                args=(task_id, method, params)
            )
            thread.start()
            
            # Response immediata con acceptance
            return jsonify({
                "jsonrpc": "2.0",
                "result": {
                    "taskId": task_id,
                    "status": "accepted",
                    "message": "Language detection task accepted for processing"
                },
                "id": request_id
            })
        
        # METODO: Task Status Query
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
        
        # Metodo non supportato
        else:
            return jsonify({
                "jsonrpc": "2.0",
                "error": {"code": -32601, "message": "Method not found"},
                "id": request_id
            }), 404
            
    except Exception as e:
        # Gestione errori interni
        return jsonify({
            "jsonrpc": "2.0",
            "error": {"code": -32603, "message": f"Internal error: {str(e)}"},
            "id": data.get('id') if 'data' in locals() else None
        }), 500

@app.route('/events')
def events():
    """
    Server-Sent Events endpoint per language detection task updates.
    
    Implementa streaming real-time per:
    - Progress updates language detection
    - Multi-mode analysis progress
    - Connection status notifications
    - Task completion events
    
    Returns:
        Response: text/event-stream con language task events
        
    Note:
        - Ottimizzato per language detection workflows
        - Support multi-mode analysis tracking
        - Memory efficient update deduplication
    """
    def generate():
        """Generator per language detection events"""
        # Event connessione stabilita
        yield "data: " + json.dumps({
            "type": "connected",
            "agent": AGENT_CONFIG["name"],
            "timestamp": datetime.utcnow().isoformat()
        }) + "\n\n"
        
        # Loop streaming task updates
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
            
            time.sleep(1)  # Throttling anti-overload
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """
    REST endpoint per query language detection tasks.
    
    Returns:
        JSON: Lista task language detection con status
    """
    return jsonify({
        "tasks": active_tasks,
        "count": len(active_tasks)
    })

if __name__ == '__main__':
    # Banner startup con lingue supportate
    print(f"🚀 Starting {AGENT_CONFIG['name']} v{AGENT_CONFIG['version']}")
    print(f"📡 Agent Card: http://localhost:{AGENT_CONFIG['port']}/.well-known/agent.json")
    print(f"🔍 Status: http://localhost:{AGENT_CONFIG['port']}/status")
    print(f"⚡ RPC Endpoint: http://localhost:{AGENT_CONFIG['port']}/rpc")
    print(f"📊 Events: http://localhost:{AGENT_CONFIG['port']}/events")
    print(f"🌍 Supported Languages: {', '.join(LANGUAGE_PATTERNS.keys())}")
    
    # Avvio Flask server con configurazione standard A2A
    app.run(host='0.0.0.0', port=AGENT_CONFIG['port'], debug=True)
