# Istruzioni per GitHub Copilot Agent Mode

## Scopo del progetto
Questo progetto ha l’obiettivo di esplorare e comprendere il protocollo Agent 2 Agent (A2A) di Google, uno standard aperto per la comunicazione e collaborazione interoperabile tra agenti di Intelligenza Artificiale (IA). Il progetto mira a implementare in modo semplice ma completo le funzionalità principali offerte dal protocollo, per testare e sperimentare la comunicazione agent-to-agent in un ambiente Node.js.

## Cos’è il protocollo Agent 2 Agent (A2A)
- A2A è un protocollo aperto che consente a due agenti IA di comunicare, collaborare e coordinare compiti in modo sicuro e modulare.
- Si basa su tecnologie standard come HTTP(S), JSON-RPC 2.0 e Server-Sent Events (SSE) per la comunicazione e gli aggiornamenti in tempo reale.
- Definisce due ruoli principali:
  - **Agent Client:** avvia e formula attività, scopre agenti remoti, negozia formati e coordina task.
  - **Agent Server (o Agent Remoto):** espone capacità tramite Agent Cards, esegue task e risponde alle richieste del client.
- Supporta la scoperta dinamica dei servizi, la negoziazione dei formati (testo, immagine, video), la gestione autonoma dei task e la collaborazione tramite scambio di messaggi e artefatti.

## Funzionalità chiave da implementare nel progetto

### 1. Agent Server
- Esporre un endpoint HTTP GET `/status` che risponda con JSON `{ status: 'ok' }`.
- Pubblicare una **Agent Card** statica (file JSON o endpoint) che descriva:
  - Identità e metadati dell’agente
  - Endpoint disponibili
  - Capacità e skills
  - Modalità di autenticazione supportate
- Gestire task base inviati dal client tramite JSON-RPC 2.0 su HTTP POST.
- Fornire aggiornamenti in tempo reale sullo stato dei task tramite Server-Sent Events (SSE).

### 2. Agent Client
- Recuperare la Agent Card dall’Agent Server per scoprire capacità e endpoint.
- Inviare task di esempio al server usando JSON-RPC 2.0.
- Ricevere aggiornamenti tramite SSE e gestire la risposta finale.
- Negoziare formati e modalità di comunicazione in modo semplice (ad esempio, scegliere tra testo e JSON).
- Gestire errori e stati di avanzamento.

### 3. Testing
- Scrivere test con Jest per:
  - Verificare che l’endpoint `/status` risponda correttamente.
  - Controllare che il client recuperi e interpreti la Agent Card.
  - Testare l’invio di task e la ricezione di aggiornamenti.
  - Verificare la comunicazione completa client-server.

## Dipendenze essenziali
- Node.js (versione LTS consigliata)
- Express (server HTTP)
- Axios (client HTTP semplice)
- Jest (test unitari)

## Setup iniziale
1. Inizializza il progetto:
    ```bash
    npm init -y
    ```
2. Installa le dipendenze:
    ```bash
    npm install express axios
    npm install --save-dev jest
    ```
3. Aggiungi lo script test nel `package.json`:
    ```json
    "scripts": {
        "test": "jest"
    }
    ```

## Come usare GitHub Copilot Agent Mode
- Apri VS Code nel progetto.
- Attiva GitHub Copilot Agent Mode.
- Usa prompt come:
> "Crea in `server.js` un Agent Server con endpoint GET `/status` che risponda `{ status: 'ok' }`, esponga una Agent Card statica e gestisca task base con JSON-RPC e SSE."

> "Crea in `client.js` un Agent Client che recuperi la Agent Card, invii un task di esempio al server, riceva aggiornamenti SSE e gestisca la risposta."

> "Scrivi test Jest per verificare la comunicazione e le funzionalità di discovery, task management e aggiornamenti."

Copilot Agent ti assisterà nella generazione del codice, dei test e nell’esecuzione degli stessi, per simulare un ambiente A2A completo ma semplice.

---

## Discovery dei servizi (Agent Discovery)
- Ogni Agent Server pubblica una **Agent Card**, un documento JSON che descrive identità, endpoint, capacità e modalità di autenticazione.
- L’Agent Client recupera questa Agent Card per scoprire i servizi disponibili e come interagire con essi.
- La discovery può essere:
- **Catalog-based:** tramite un registro centrale di Agent Cards (per scenari avanzati).
- **Direct configuration:** tramite URL statici o configurazioni locali (adatto per test e sviluppo).
- Nel progetto, implementare una Agent Card statica esposta dal server e la logica client per recuperarla e interpretarla.
- Questo permette di simulare il flusso completo di discovery, negoziazione e comunicazione tra agenti A2A.

---

## Obiettivi didattici
- Comprendere l’architettura client-server del protocollo A2A.
- Sperimentare la discovery dinamica tramite Agent Cards.
- Gestire task asincroni con aggiornamenti in tempo reale.
- Negoziare formati e protocolli di comunicazione.
- Testare l’interoperabilità e la collaborazione tra agenti IA.

---

## Fonti e approfondimenti

- [Agent2Agent Protocol (A2A) - Google](https://google.github.io/A2A/)  
Documentazione ufficiale e panoramica del protocollo aperto per la comunicazione tra agenti IA.

- [Announcing the Agent2Agent Protocol (A2A) - Google Developers Blog](https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/)  
Annuncio e spiegazione introduttiva del protocollo A2A e dei suoi obiettivi.

- [Agent2Agent (A2A) Protocol Specification - Google](https://google.github.io/A2A/specification/)  
Specifica tecnica completa con dettagli su Agent Cards, autenticazione, task e messaggi.

- [google/A2A GitHub Repository](https://github.com/google/A2A)  
Codice sorgente, esempi, tutorial e documentazione ufficiale del protocollo.

- [Verso un'interoperabilità agentica: Google Cloud lancia il protocollo A2A](https://www.actuia.com/it/news/verso-uninteroperabilita-agentica-google-cloud-lancia-il-protocollo-a2a/)  
Articolo di approfondimento sull’interoperabilità e gli scenari di utilizzo.

- [Google “A2A Protocol” Changes Everything: AI Agents Now Talk to Each Other (YouTube)](https://www.youtube.com/watch?v=zriFT6sqEus)  
Video introduttivo sul protocollo A2A e il suo impatto.

---

Salva questo testo nel file `.github/copilot-instructions.md` del tuo repository per avere una guida chiara e completa che ti aiuti a sviluppare un progetto di test semplice ma esaustivo del protocollo Agent 2 Agent di Google con GitHub Copilot Agent Mode.
