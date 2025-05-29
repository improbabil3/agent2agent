# Dynamic Discovery A2A System

Questo sistema implementa il **discovery dinamico** del protocollo Agent2Agent (A2A) di Google con quattro agenti indipendenti, un client intelligente, e un sistema di orchestrazione avanzato.

## 🏗️ Architettura del Sistema Completo

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Discovery      │    │   Agent A        │    │   Agent B        │    │   Agent C        │    │   Agent D        │
│  Client         │    │ Text Processor   │    │ Math Calculator  │    │Sentiment Analyzer│    │Language Detector │
│                 │    │                  │    │                  │    │                  │    │                  │
│ • Port Scanning │───▶│ • Text Analysis  │    │ • Basic Math     │    │ • Sentiment      │    │ • Language Det.  │
│ • Auto-Routing  │    │ • Text Transform │    │ • Advanced Math  │    │ • Emotions       │    │ • Multilingual   │
│ • Smart Tasks   │    │ • Text Validation│    │ • Statistics     │    │ • Polarity       │    │ • Lang Stats     │
│                 │    │                  │    │ • Equations      │    │ • Batch Analysis │    │ • Batch Detection│
└─────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
         │                       │                       │                       │                       │
         └───────────────────────┼───────────────────────┼───────────────────────┼───────────────────────┘
                                 │                       │                       │
                    ┌─────────────────────────────────────────────────────────────┐
                    │                A2A Protocol                                 │
                    │ • JSON-RPC 2.0   • Agent Cards   • Task Polling            │
                    │ • Auto Discovery • Smart Routing • Error Handling          │
                    └─────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Monitoring     │    │  Advanced        │    │  Discovery       │
│  Dashboard      │    │  Orchestrator    │    │  System          │
│                 │    │                  │    │                  │
│ • Real-time     │    │ • API Management │    │ • Multi-Agent    │
│ • Health Checks │    │ • Auto-restart   │    │ • Coordination   │
│ • Metrics       │    │ • Load Balancing │    │ • Lifecycle Mgmt │
│ • Status        │    │ • System Control │    │ • Startup/Stop   │
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

## 🤖 Agenti Disponibili

### Agent A - Text Processor (Port 4001)
**Tipo:** `text-processor`
**Capacità:**
- `text_analysis` - Analisi completa del testo (statistiche, struttura, conteggi)
- `text_transform` - Trasformazioni (uppercase, lowercase, reverse, title case)
- `text_validation` - Validazione formati (email, URL, telefono, alfanumerico)

**Esempi di utilizzo:**
```bash
# Analisi del testo
curl -X POST http://localhost:4001/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"text_analysis","params":{"text":"Il protocollo A2A è innovativo"},"id":1}'

# Trasformazione del testo  
curl -X POST http://localhost:4001/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"text_transform","params":{"text":"hello world","operation":"uppercase"},"id":2}'
```

### Agent B - Math Calculator (Port 4002)  
**Tipo:** `math-calculator`
**Capacità:**
- `basic_math` - Operazioni base (add, subtract, multiply, divide, modulo)
- `advanced_math` - Operazioni avanzate (power, sqrt, log, trigonometria, fattoriale)
- `statistical_analysis` - Statistiche complete su array di numeri
- `equation_solving` - Risoluzione equazioni lineari e quadratiche

**Esempi di utilizzo:**
```bash
# Matematica di base
curl -X POST http://localhost:4002/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"basic_math","params":{"operation":"multiply","a":15,"b":7},"id":1}'

# Analisi statistica
curl -X POST http://localhost:4002/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"statistical_analysis","params":{"numbers":[10,20,30,40,50]},"id":2}'
```

### Agent C - Sentiment Analyzer (Port 4003)
**Tipo:** `sentiment-analyzer`
**Capacità:**
- `sentiment_analysis` - Analisi sentiment completa (positive, negative, neutral)
- `emotion_detection` - Rilevamento emozioni specifiche (joy, anger, fear, sadness, etc.)
- `polarity_analysis` - Analisi polarità con score numerico (-1 a +1)
- `batch_sentiment` - Analisi sentiment su array di testi

**Esempi di utilizzo:**
```bash
# Analisi sentiment
curl -X POST http://localhost:4003/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"sentiment_analysis","params":{"text":"I love this system!"},"id":1}'

# Rilevamento emozioni
curl -X POST http://localhost:4003/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"emotion_detection","params":{"text":"I am so frustrated!"},"id":2}'
```

### Agent D - Language Detector (Port 4004)
**Tipo:** `language-detector`
**Capacità:**
- `language_detection` - Rilevamento lingua primaria con score di confidenza
- `multilingual_analysis` - Analisi testi multilingue e pattern di code-switching
- `language_statistics` - Statistiche dettagliate sulla lingua rilevata
- `batch_language_detection` - Rilevamento lingua su array di testi

**Esempi di utilizzo:**
```bash
# Rilevamento lingua
curl -X POST http://localhost:4004/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"language_detection","params":{"text":"Bonjour tout le monde!"},"id":1}'

# Analisi multilingue
curl -X POST http://localhost:4004/json-rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"multilingual_analysis","params":{"text":"Hello! Ciao! Hola!"},"id":2}'
```
## 🔍 Sistema di Discovery e Orchestrazione

### 1. **Discovery System** (`discovery-system.js`)
Avvia tutti e 4 gli agenti simultaneamente in un unico processo coordinato:
```bash
npm run start:discovery-system
```

### 2. **Discovery Client** (`discovery-client.js`)
Client intelligente che scopre automaticamente gli agenti e testa tutte le capacità:
```bash
npm run start:discovery-client
```

### 3. **Monitoring Dashboard** (`monitoring-dashboard.js`)
Dashboard in tempo reale per monitorare la salute e le performance del sistema:
```bash
npm run start:monitoring
```

### 4. **Advanced Orchestrator** (`advanced-orchestrator.js`)
Sistema di orchestrazione avanzato con API REST per gestire l'intero ecosistema:
```bash
npm run start:orchestrator
```

## 🚀 Come Eseguire il Sistema Completo

### Opzione 1: Sistema Semplice (Raccomandato per Test)
```bash
# Terminal 1 - Avvia tutti gli agenti
npm run start:discovery-system

# Terminal 2 - Testa il discovery automatico
npm run start:discovery-client

# Terminal 3 - (Opzionale) Monitoring in tempo reale
npm run start:monitoring
```

### Opzione 2: Sistema Avanzato (Per Produzione)
```bash
# Terminal 1 - Avvia l'orchestratore avanzato
npm run start:orchestrator

# Terminal 2 - Monitoring dashboard
npm run start:monitoring

# Il sistema espone API REST su http://localhost:3000
```

### Opzione 3: Agenti Individuali
```bash
# Avvia agenti singolarmente (utile per debug)
npm run start:agent-a    # Port 4001
npm run start:agent-b    # Port 4002  
npm run start:agent-c    # Port 4003
npm run start:agent-d    # Port 4004
```

## 📡 API dell'Orchestratore Avanzato

L'orchestratore espone API REST su `http://localhost:3000` per la gestione del sistema:

### Status del Sistema
```bash
GET /api/system/status
# Ritorna: stato generale, salute del sistema, uptime, metriche
```

### Gestione Agenti
```bash
GET /api/agents                    # Lista tutti gli agenti e il loro stato
POST /api/agents/{id}/start        # Avvia un agente specifico
POST /api/agents/{id}/stop         # Ferma un agente specifico
POST /api/agents/{id}/restart      # Riavvia un agente specifico
POST /api/system/start-all         # Avvia tutti gli agenti
POST /api/system/stop-all          # Ferma tutti gli agenti
```

### Discovery e Task
```bash
GET /api/discovery/agents          # Discovery automatico degli agenti
POST /api/tasks/execute            # Esegue task con routing automatico
GET /api/metrics                   # Metriche dettagliate del sistema
```

### Esempi di Chiamate API
```bash
# Status del sistema
curl http://localhost:3000/api/system/status

# Avvia tutti gli agenti
curl -X POST http://localhost:3000/api/system/start-all

# Esegui un task con routing automatico
curl -X POST http://localhost:3000/api/tasks/execute \
  -H "Content-Type: application/json" \
  -d '{"method":"text_analysis","params":{"text":"Hello A2A!"}}'
```

## 🧪 Testing e Dimostrazione

### Test Automatico Completo
Il discovery client esegue automaticamente 16 diversi tipi di task per dimostrare tutte le capacità:

**Agent A (Text Processor):**
- ✅ Analisi del testo italiano con statistiche complete
- ✅ Trasformazione testo in maiuscolo  
- ✅ Validazione formato email

**Agent B (Math Calculator):**
- ✅ Moltiplicazione matematica di base
- ✅ Calcolo potenze avanzate
- ✅ Analisi statistica completa su array
- ✅ Risoluzione equazioni quadratiche

**Agent C (Sentiment Analyzer):**
- ✅ Analisi sentiment di testo positivo
- ✅ Rilevamento emozioni da testo negativo
- ✅ Analisi di polarità su testo neutro
- ✅ Analisi batch di sentiment multipli

**Agent D (Language Detector):**
- ✅ Rilevamento lingua inglese
- ✅ Analisi testo multilingue con code-switching
- ✅ Statistiche linguistiche dettagliate su testo italiano
- ✅ Rilevamento batch di lingue multiple

### Test di Performance
```bash
# Test di carico con monitoring
npm run start:discovery-system &
npm run start:monitoring &
for i in {1..10}; do npm run start:discovery-client; done
```

## 🏆 Caratteristiche Avanzate del Sistema

### ✨ **Discovery Dinamico**
- Scansione automatica porte 4001-4005
- Recupero Agent Cards per identificazione capacità
- Routing intelligente basato su nomi metodi
- Fallback e gestione errori

### 🔄 **Auto-Recovery e Fault Tolerance**
- Health check automatici ogni 15 secondi
- Auto-restart di agenti non responsivi
- Monitoraggio continuo dello stato
- Load balancing tra agenti dello stesso tipo

### 📊 **Monitoring e Metriche**
- Dashboard real-time con aggiornamento ogni 10 secondi
- Metriche di response time e throughput
- Contatori errori e statistiche uptime
- Visualizzazione stato sistema con emoticon

### 🌐 **API Management**
- RESTful API per controllo sistema
- Endpoint per gestione ciclo di vita agenti
- Task routing automatico via API
- Metriche e status dettagliati

### 🔧 **Flessibilità e Modularità**
- Agenti completamente indipendenti
- Protocollo A2A standard-compliant
- JSON-RPC 2.0 per comunicazione
- Facilmente estendibile con nuovi agenti

## 📈 Metriche e Performance

Il sistema monitora automaticamente:
- **Response Time:** Tempo medio di risposta degli agenti
- **Throughput:** Numero di task elaborati per unità di tempo
- **Error Rate:** Percentuale di errori nel sistema
- **Uptime:** Tempo di attività continua
- **System Health:** Percentuale di agenti online (0-100%)
- **Resource Usage:** Utilizzo memoria e CPU

## 🔮 Estensioni Future

Il sistema è progettato per supportare facilmente:
- **Nuovi Agenti:** Porta 4005+ disponibili
- **Clustering:** Multiple istanze con load balancing
- **Authentication:** Sicurezza e autorizzazione
- **Caching:** Cache distribuita per performance
- **Analytics:** Analisi avanzate dei pattern di utilizzo
- **WebUI:** Interfaccia web per gestione sistema

## 📚 Conformità Protocollo A2A

Il sistema implementa completamente:
- ✅ **Agent Cards:** Descrizione capacità e metadati
- ✅ **JSON-RPC 2.0:** Comunicazione standardizzata
- ✅ **Discovery:** Meccanismi di scoperta automatica
- ✅ **Task Management:** Gestione asincrona dei task
- ✅ **Error Handling:** Gestione errori robusta
- ✅ **Monitoring:** Osservabilità completa del sistema

---

## 🎯 Conclusioni

Questo sistema rappresenta un'implementazione completa e avanzata del protocollo Agent2Agent (A2A) di Google, dimostrando:

1. **Interoperabilità:** 4 agenti diversi che comunicano seamlessly
2. **Scalabilità:** Architettura modulare facilmente estendibile  
3. **Resilienza:** Auto-recovery e fault tolerance
4. **Osservabilità:** Monitoring completo e metriche real-time
5. **Usabilità:** API intuitive e dashboard user-friendly

Il sistema è pronto per utilizzi reali e può servire come base per implementazioni più complesse del protocollo A2A in ambienti di produzione.

**🌟 Total Capabilities: 15 methods across 4 specialized agents**
**🚀 Ready for production-scale A2A communication!**
const textAgents = client.getAgentsByType('text-processor');
const mathAgents = client.getAgentsByCapability('basic-math');
```

### Comunicazione JSON-RPC 2.0
```javascript
// Invio task automatico
const result = await client.executeTaskAutomatically('text_analysis', {
  text: 'Esempio di testo da analizzare'
});

// Invio task a agente specifico
const result = await client.sendTaskToAgent(4001, 'text_transform', {
  text: 'hello world',
  operation: 'uppercase'
});
```

## 🧪 Esempi di Task

### Text Processing (Agent A)
```javascript
// Analisi testo
{
  method: 'text_analysis',
  params: { text: 'Il protocollo A2A è fantastico!' }
}

// Trasformazione
{
  method: 'text_transform', 
  params: { text: 'hello world', operation: 'title_case' }
}

// Validazione
{
  method: 'text_validation',
  params: { text: 'test@example.com', validation_type: 'email' }
}
```

### Math Calculations (Agent B)
```javascript
// Matematica base
{
  method: 'basic_math',
  params: { operation: 'multiply', a: 15, b: 7 }
}

// Matematica avanzata  
{
  method: 'advanced_math',
  params: { operation: 'power', a: 2, b: 10 }
}

// Statistica
{
  method: 'statistical_analysis',
  params: { numbers: [10, 20, 30, 40, 50] }
}

// Equazioni
{
  method: 'equation_solving',
  params: { type: 'quadratic', coefficients: [1, -5, 6] }
}
```

### Sentiment Analysis (Agent C)
```javascript
// Analisi sentiment
{
  method: 'sentiment_analysis',
  params: { text: 'I love using this amazing product!' }
}

// Rilevamento emozioni
{
  method: 'emotion_detection',
  params: { text: 'I am so frustrated with this system!' }
}

// Analisi polarità
{
  method: 'polarity_analysis', 
  params: { text: 'The product is okay, nothing special.' }
}

// Batch sentiment
{
  method: 'batch_sentiment',
  params: { 
    texts: [
      'This is amazing!', 
      'I hate this.', 
      'It\'s okay.'
    ] 
  }
}
```

### Language Detection (Agent D)
```javascript
// Rilevamento lingua
{
  method: 'language_detection',
  params: { text: 'Bonjour, comment allez-vous aujourd\'hui?' }
}

// Analisi multilingue
{
  method: 'multilingual_analysis',
  params: { text: 'Hello world! Ciao mondo! Hola mundo!' }
}

// Statistiche lingua
{
  method: 'language_statistics',
  params: { text: 'Das ist ein deutscher Text mit interessanten Eigenschaften.' }
}

// Batch detection
{
  method: 'batch_language_detection',
  params: { 
    texts: [
      'This is English.',
      'Questo è italiano.',
      'Dies ist Deutsch.'
    ] 
  }
}
```

## ✨ Caratteristiche A2A

✅ **Discovery Dinamico**: Scansione automatica agenti disponibili  
✅ **JSON-RPC 2.0**: Comunicazione standardizzata  
✅ **Agent Cards**: Metadati e capacità self-describing  
✅ **Task Polling**: Monitoraggio asincrono dei task  
✅ **Smart Routing**: Instradamento automatico per tipo/capacità  
✅ **Error Handling**: Gestione errori robusta  
✅ **Type Safety**: Validazione parametri e formati  

## 🔧 Configurazione

### Porte Utilizzate
- **4001**: Agent A (Text Processor)
- **4002**: Agent B (Math Calculator)  
- **4003**: Agent C (Sentiment Analyzer)
- **4004**: Agent D (Language Detector)
- **4005**: Riservata per futuri agenti

### Timeout e Polling
- **Discovery timeout**: 2 secondi per agente
- **Task polling**: 1 secondo di intervallo
- **Max wait time**: 30 secondi per task

## 📊 Monitoraggio

Il sistema include logging completo:
- Discovery events
- Task submission e completion
- Error handling
- Performance metrics

## 🔮 Estensioni Future

Il sistema è progettato per essere estensibile:
- Aggiunta nuovi agenti (port range 4003-4005)
- Registry centralizzato degli agenti
- Load balancing automatico
- Health checks periodici
- Caching delle Agent Cards
