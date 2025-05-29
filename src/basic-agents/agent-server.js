import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage per i task
const tasks = new Map();
const sseClients = new Map();

// Agent Card - descrizione delle capacità dell'agente
const agentCard = {
  id: "demo-agent-server",
  name: "Demo Agent Server",
  version: "1.0.0",
  description: "Un agente server demo che implementa il protocollo A2A di Google",
  capabilities: [
    {
      id: "text-processing",
      name: "Text Processing",
      description: "Elaborazione e analisi di testi",
      supported_formats: ["text/plain", "application/json"]
    },
    {
      id: "math-operations",
      name: "Math Operations", 
      description: "Operazioni matematiche base",
      supported_formats: ["application/json"]
    }
  ],
  endpoints: {
    agent_card: "/agent-card",
    status: "/status",
    rpc: "/rpc",
    events: "/events"
  },
  authentication: {
    required: false,
    methods: []
  },
  created_at: new Date().toISOString()
};

// Endpoint per lo status dell'agente
app.get('/status', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    agent_id: agentCard.id
  });
});

// Endpoint per l'Agent Card
app.get('/agent-card', (req, res) => {
  res.json(agentCard);
});

// Endpoint RPC per i task
app.post('/rpc', async (req, res) => {
  const { jsonrpc, method, params, id } = req.body;
  
  if (jsonrpc !== "2.0") {
    return res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Invalid Request" },
      id: id || null
    });
  }

  const taskId = uuidv4();
  const task = {
    id: taskId,
    method,
    params,
    status: 'pending',
    created_at: new Date().toISOString(),
    result: null,
    error: null
  };

  tasks.set(taskId, task);

  // Invia risposta immediata con task ID
  res.json({
    jsonrpc: "2.0",
    result: { 
      task_id: taskId,
      status: 'accepted',
      message: 'Task accepted and will be processed'
    },
    id
  });

  // Processa il task in modo asincrono
  processTask(taskId, method, params);
});

// Endpoint per Server-Sent Events
app.get('/events/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Salva il client per gli aggiornamenti
  sseClients.set(taskId, res);

  // Invia lo stato iniziale se il task esiste
  const task = tasks.get(taskId);
  if (task) {
    res.write(`data: ${JSON.stringify({
      type: 'status_update',
      task_id: taskId,
      status: task.status,
      timestamp: new Date().toISOString()
    })}\\n\\n`);
  }

  // Cleanup quando il client si disconnette
  req.on('close', () => {
    sseClients.delete(taskId);
  });
});

// Funzione per processare i task
async function processTask(taskId, method, params) {
  const task = tasks.get(taskId);
  if (!task) return;

  try {
    // Simula il processing
    task.status = 'processing';
    sendSSEUpdate(taskId, 'processing', 'Task is being processed');
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simula lavoro
    
    let result;
    
    switch (method) {
      case 'text_analysis':
        result = {
          text: params.text,
          word_count: params.text.split(' ').length,
          char_count: params.text.length,
          analysis: 'Text analysis completed'
        };
        break;
        
      case 'math_operation':
        const { operation, a, b } = params;
        switch (operation) {
          case 'add': result = { result: a + b }; break;
          case 'subtract': result = { result: a - b }; break;
          case 'multiply': result = { result: a * b }; break;
          case 'divide': result = { result: b !== 0 ? a / b : 'Error: Division by zero' }; break;
          default: throw new Error('Unsupported operation');
        }
        break;
        
      default:
        throw new Error(`Unsupported method: ${method}`);
    }
    
    task.status = 'completed';
    task.result = result;
    task.completed_at = new Date().toISOString();
    
    sendSSEUpdate(taskId, 'completed', 'Task completed successfully', result);
    
  } catch (error) {
    task.status = 'failed';
    task.error = error.message;
    task.failed_at = new Date().toISOString();
    
    sendSSEUpdate(taskId, 'failed', error.message);
  }
}

// Funzione per inviare aggiornamenti SSE
function sendSSEUpdate(taskId, status, message, result = null) {
  const client = sseClients.get(taskId);
  if (client) {
    const update = {
      type: 'status_update',
      task_id: taskId,
      status,
      message,
      result,
      timestamp: new Date().toISOString()
    };
    
    client.write(`data: ${JSON.stringify(update)}\\n\\n`);
    
    // Chiudi la connessione se il task è completato o fallito
    if (status === 'completed' || status === 'failed') {
      setTimeout(() => {
        client.end();
        sseClients.delete(taskId);
      }, 1000);
    }
  }
}

// Endpoint per ottenere lo stato di un task
app.get('/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  res.json(task);
});

// Avvio del server
app.listen(PORT, () => {
  console.log(`🤖 Agent Server running on http://localhost:${PORT}`);
  console.log(`📋 Agent Card available at http://localhost:${PORT}/agent-card`);
  console.log(`✅ Status endpoint at http://localhost:${PORT}/status`);
});

export default app;
