# Agent2Agent - Sequence Diagram: Intelligent Orchestrator (Agent E)

Questo documento contiene il sequence diagram per WebSequenceDiagrams che illustra il funzionamento completo del sistema Agent2Agent con l'Agent E come Intelligent Orchestrator.

## Scenario
- **Client**: Invia un task complesso che richiede multiple competenze
- **Agent E**: Orchestratore intelligente che coordina altri agenti specializzati
- **Discovery Service**: Sistema di registrazione e scoperta degli agenti
- **Agenti Specializzati**: Agent A (Text Processing), Agent B (Math), Agent C (Sentiment), Agent D (Language Detection)

## WebSequenceDiagrams Code

```
title Agent2Agent - Dynamic Discovery with Intelligent Orchestrator (Agent E)

participant Client as C
participant DiscoveryService as DS  
participant AgentE as E
participant AgentA as A
participant AgentB as B
participant AgentC as SC
participant AgentD as D

note over C,D: Phase 1: Agent Registration in Discovery Service

E->DS: POST /api/agents/register\n{"id": "agent-e", "card_url": "http://localhost:3005/.well-known/agent.json"}
A->DS: POST /api/agents/register\n{"id": "agent-a", "card_url": "http://localhost:3001/.well-known/agent.json"}
B->DS: POST /api/agents/register\n{"id": "agent-b", "card_url": "http://localhost:3002/.well-known/agent.json"}
SC->DS: POST /api/agents/register\n{"id": "agent-c", "card_url": "http://localhost:3003/.well-known/agent.json"}
D->DS: POST /api/agents/register\n{"id": "agent-d", "card_url": "http://localhost:3004/.well-known/agent.json"}

note over C,D: Phase 2: Client Discovers Only the Orchestrator

C->DS: GET /api/agents?capability=orchestration
DS->C: [{"agent-e": {...}}]

C->E: GET /.well-known/agent.json
E->C: Agent Card E\n{"id": "agent-e", "endpoints": {...}, "capabilities": ["orchestration"]}

note over C,D: Phase 3: Complex Task Orchestration Request

C->E: POST /jsonrpc\n{"method": "orchestrate_task", "params": {"text": "Hello world! Calculate 10+5"}}
E->C: {"result": {"task_id": "orch-123", "status": "processing"}}

note over E,D: Agent E discovers required agents via their well-known endpoints

E->D: GET /.well-known/agent.json
D->E: Agent Card D\n{"id": "agent-d", "capabilities": ["language-detection"]}

E->A: GET /.well-known/agent.json  
A->E: Agent Card A\n{"id": "agent-a", "capabilities": ["text-processing"]}

E->B: GET /.well-known/agent.json
B->E: Agent Card B\n{"id": "agent-b", "capabilities": ["math-calculation"]}

E->SC: GET /.well-known/agent.json
SC->E: Agent Card C\n{"id": "agent-c", "capabilities": ["sentiment-analysis"]}

note over E,D: Agent E orchestrates workflow based on discovered capabilities

E->D: POST /jsonrpc\n{"method": "detect_language", "params": {"text": "Hello world! Calculate 10+5"}}
D->E: {"result": {"language": "en", "confidence": 0.99}}

E->A: POST /jsonrpc\n{"method": "extract_math", "params": {"text": "Hello world! Calculate 10+5"}}
A->E: {"result": {"math_expression": "10+5", "clean_text": "Hello world!"}}

E->B: POST /jsonrpc\n{"method": "calculate", "params": {"expression": "10+5"}}
B->E: {"result": {"result": 15}}

E->SC: POST /jsonrpc\n{"method": "analyze_sentiment", "params": {"text": "Hello world!"}}
SC->E: {"result": {"sentiment": "positive", "score": 0.8}}

note over C,D: Phase 4: Real-time Updates via SSE

C->E: GET /events/orch-123 (SSE connection)
E->C: data: {"status": "language_detected", "result": "en"}
E->C: data: {"status": "text_processed", "math": "10+5"}  
E->C: data: {"status": "calculation_done", "result": 15}
E->C: data: {"status": "sentiment_analyzed", "sentiment": "positive"}

note over C,D: Phase 5: Final Orchestrated Result

E->C: data: {"status": "completed", "final_result": {\n  "original_text": "Hello world! Calculate 10+5",\n  "language": "en",\n  "math_result": 15,\n  "sentiment": "positive",\n  "orchestration_summary": "Multi-agent task completed successfully"\n}}

C->E: Close SSE connection
```

## Fasi del Processo

### 1. **Agent Registration in Discovery Service**
- Tutti gli agenti si auto-registrano nel Discovery Service
- Ogni agente fornisce l'URL della propria Agent Card (`/.well-known/agent.json`)

### 2. **Client Discovers Only the Orchestrator**  
- Il client cerca **solo l'Agent E** tramite il Discovery Service
- Recupera l'Agent Card dell'Agent E per conoscere i suoi endpoint
- **Non scopre direttamente gli altri agenti specializzati**

### 3. **Complex Task Orchestration Request**
- Il client invia un task complesso **solo all'orchestratore**
- L'Agent E analizza il task e identifica le competenze necessarie

### 4. **Agent E Discovers Required Agents**
- **L'Agent E** (non il client) scopre dinamicamente gli agenti necessari
- Fa richieste dirette agli endpoint `/.well-known/agent.json` di ogni agente
- Recupera le Agent Cards per conoscere capabilities ed endpoints

### 5. **Workflow Orchestration**
- L'Agent E coordina l'esecuzione sequenziale dei task
- Ogni agente specializzato esegue la sua parte

### 6. **Real-time Updates**
- Il client riceve aggiornamenti **solo dall'Agent E** via SSE
- Monitoraggio del progresso di ogni fase orchestrata

### 7. **Final Result**
- L'Agent E aggrega tutti i risultati
- Fornisce una risposta completa e coordinata **al client**

## Caratteristiche Evidenziate

- **Client-Orchestrator Pattern**: Il client interagisce solo con l'orchestratore
- **Orchestrator-Agents Discovery**: L'Agent E scopre dinamicamente gli altri agenti
- **Separation of Concerns**: Il client non gestisce la complessità multi-agente
- **Centralized Coordination**: L'Agent E centralizza la logica di orchestrazione
- **Standard A2A Protocol**: Tutti usano `/.well-known/agent.json` per discovery

## Utilizzo
Copia il codice del sequence diagram e incollalo su [WebSequenceDiagrams](https://www.websequencediagrams.com/) per visualizzare il diagramma completo.