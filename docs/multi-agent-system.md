# Multi-Agent A2A System

Sistema di comunicazione tra 3 agenti usando il protocollo Agent2Agent (A2A) di Google.

## Architettura del Sistema

```
Client → Agent1 → Agent2 → Agent3 → Agent2 → Agent1 → Client
          ↓         ↓         ↓
    Text Process  Sentiment  Language
                  Analysis   Detection
```

### Agenti nel Sistema

1. **🔵 Agent1 - Text Processor** (porta 3001)
   - Riceve testo dal client
   - Effettua elaborazione base (pulizia, conteggi)
   - Inoltra ad Agent2

2. **🟡 Agent2 - Sentiment Analyzer** (porta 3002)
   - Riceve dati elaborati da Agent1
   - Analizza il sentiment del testo
   - Inoltra ad Agent3

3. **🟢 Agent3 - Language Detector** (porta 3003)
   - Riceve dati sentiment da Agent2
   - Rileva la lingua del testo
   - Completa la catena di elaborazione

## Flusso di Comunicazione

1. **Client** invia testo ad **Agent1** via JSON-RPC 2.0
2. **Agent1** elabora il testo e inoltra ad **Agent2**
3. **Agent2** analizza sentiment e inoltra ad **Agent3**
4. **Agent3** rileva lingua e completa l'elaborazione
5. I risultati risalgono la catena: **Agent3** → **Agent2** → **Agent1** → **Client**

## Come Usare il Sistema

### Avvio Completo
```bash
# Avvia tutti e 3 gli agenti insieme
npm run start:multi-system

# In un altro terminale, avvia il client demo
npm run start:multi-client
```

### Avvio Singolo (per debugging)
```bash
# Avvia i singoli agenti
npm run start:agent1  # porta 3001
npm run start:agent2  # porta 3002  
npm run start:agent3  # porta 3003

# Poi il client
npm run start:multi-client
```

## Test Automatici

Il client demo testa automaticamente 4 frasi in lingue diverse:
- Italiano con sentiment positivo
- Inglese con sentiment negativo  
- Spagnolo con sentiment positivo
- Francese con sentiment positivo

## Endpoint Disponibili

Ogni agente espone:
- `GET /status` - Stato dell'agente
- `GET /agent-card` - Capacità e metadati
- `POST /rpc` - Endpoint JSON-RPC 2.0
- `GET /task/{id}` - Stato di un task specifico

## Esempio di Output

```
📊 MULTI-AGENT PROCESSING RESULTS
════════════════════════════════════════════════════════

📝 Original Text: "Questo è un fantastico test!"
🔤 Processed Text: "questo è un fantastico test!"

📊 Analysis Results:
   📏 Word Count: 5
   💭 Sentiment: positive (confidence: 87.3%)
   🌍 Language: italian (confidence: 91.2%)
   ⏱️  Processing Time: 3847ms

🔗 Agent Chain:
   🔵 Agent1: Text Processing
   🟡 Agent2: Sentiment Analysis
   🟢 Agent3: Language Detection
```

## Caratteristiche A2A

✅ **Discovery**: Ogni agente pubblica una Agent Card  
✅ **JSON-RPC 2.0**: Comunicazione standardizzata  
✅ **Task Asincroni**: Elaborazione non-bloccante  
✅ **Polling**: Monitoraggio stato senza SSE  
✅ **Error Handling**: Gestione errori robusta  
✅ **Chain Coordination**: Orchestrazione multi-agente  

## File del Sistema

- `multi-agent-system.js` - Orchestratore che avvia tutti gli agenti
- `multi-agent-client.js` - Client che testa la catena completa
- `agent1-server.js` - Text Processor
- `agent2-server.js` - Sentiment Analyzer  
- `agent3-server.js` - Language Detector
