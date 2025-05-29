import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent A - Text Processor
 * Elabora testi con varie funzionalità (analisi, formato, validazione)
 * Implementa il protocollo A2A con discovery dinamico
 */
class AgentAServer {
  constructor(port = 4001) {
    this.port = port;
    this.agentId = 'text-processor-agent-a';
    this.app = express();
    this.tasks = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  setupRoutes() {
    // Status endpoint per A2A
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        agent_id: this.agentId,
        port: this.port
      });
    });

    // Agent Card per discovery dinamico
    this.app.get('/agent-card', (req, res) => {
      res.json({
        id: this.agentId,
        name: 'Agent A - Text Processor',
        description: 'Advanced text processing and analysis agent',
        version: '1.0.0',
        type: 'text-processor',
        endpoints: {
          status: '/status',
          rpc: '/rpc',
          task_status: '/task/{task_id}',
          agent_card: '/agent-card'
        },
        capabilities: [
          {
            id: 'text-analysis',
            name: 'Text Analysis',
            description: 'Analyzes text structure, word count, and basic statistics',
            input_format: 'text/plain',
            output_format: 'application/json'
          },
          {
            id: 'text-transform',
            name: 'Text Transformation',
            description: 'Transforms text (uppercase, lowercase, reverse)',
            input_format: 'text/plain',
            output_format: 'text/plain'
          },
          {
            id: 'text-validation',
            name: 'Text Validation',
            description: 'Validates text format (email, url, etc.)',
            input_format: 'text/plain',
            output_format: 'application/json'
          }
        ],
        authentication: {
          type: 'none'
        },
        discovery_info: {
          discoverable: true,
          category: 'text-processing',
          tags: ['nlp', 'analysis', 'transformation']
        }
      });
    });

    // JSON-RPC 2.0 endpoint
    this.app.post('/rpc', async (req, res) => {
      try {
        const { jsonrpc, method, params, id } = req.body;

        // Validazione JSON-RPC 2.0
        if (jsonrpc !== '2.0') {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid Request' },
            id
          });
        }

        // Gestione dei metodi supportati
        const supportedMethods = ['text_analysis', 'text_transform', 'text_validation'];
        
        if (!supportedMethods.includes(method)) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id
          });
        }

        const taskId = uuidv4();
        
        // Crea task
        this.tasks.set(taskId, {
          id: taskId,
          status: 'processing',
          method,
          params,
          created_at: new Date().toISOString(),
          agent: 'agent-a'
        });

        // Elabora task in modo asincrono
        this.processTask(taskId, method, params);

        // Risposta immediata A2A
        res.json({
          jsonrpc: '2.0',
          result: { 
            task_id: taskId, 
            status: 'accepted',
            message: `Task ${method} accepted for processing`
          },
          id
        });

      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error', data: error.message },
          id: req.body.id
        });
      }
    });

    // Task status endpoint
    this.app.get('/task/:taskId', (req, res) => {
      const task = this.tasks.get(req.params.taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json(task);
    });
  }

  // Elaborazione dei task
  async processTask(taskId, method, params) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      // Simula elaborazione
      await new Promise(resolve => setTimeout(resolve, 1500));

      let result;

      switch (method) {
        case 'text_analysis':
          result = this.analyzeText(params.text);
          break;
        case 'text_transform':
          result = this.transformText(params.text, params.operation);
          break;
        case 'text_validation':
          result = this.validateText(params.text, params.validation_type);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      // Aggiorna task con risultato
      task.status = 'completed';
      task.result = result;
      task.completed_at = new Date().toISOString();
      
      console.log(`🟢 Agent A: Task ${taskId} completed - ${method}`);

    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.failed_at = new Date().toISOString();
      
      console.error(`❌ Agent A: Task ${taskId} failed:`, error.message);
    }
  }

  // Funzioni di elaborazione testo
  analyzeText(text) {
    if (!text) throw new Error('Text is required');
    
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    return {
      text: text,
      statistics: {
        char_count: text.length,
        char_count_no_spaces: text.replace(/\s/g, '').length,
        word_count: words.length,
        sentence_count: sentences.length,
        paragraph_count: paragraphs.length,
        avg_word_length: words.length > 0 ? (words.reduce((sum, word) => sum + word.length, 0) / words.length).toFixed(2) : 0
      },
      structure: {
        longest_word: words.reduce((longest, current) => current.length > longest.length ? current : longest, ''),
        shortest_word: words.reduce((shortest, current) => current.length < shortest.length ? current : shortest, words[0] || ''),
        unique_words: [...new Set(words.map(w => w.toLowerCase()))].length
      },
      processed_by: 'agent-a',
      timestamp: new Date().toISOString()
    };
  }

  transformText(text, operation) {
    if (!text) throw new Error('Text is required');
    if (!operation) throw new Error('Operation is required');

    let transformed;
    
    switch (operation) {
      case 'uppercase':
        transformed = text.toUpperCase();
        break;
      case 'lowercase':
        transformed = text.toLowerCase();
        break;
      case 'reverse':
        transformed = text.split('').reverse().join('');
        break;
      case 'title_case':
        transformed = text.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        break;
      case 'sentence_case':
        transformed = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return {
      original: text,
      transformed: transformed,
      operation: operation,
      processed_by: 'agent-a',
      timestamp: new Date().toISOString()
    };
  }

  validateText(text, validationType) {
    if (!text) throw new Error('Text is required');
    if (!validationType) throw new Error('Validation type is required');

    let isValid = false;
    let pattern = '';
    let details = '';

    switch (validationType) {
      case 'email':
        pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = pattern.test(text);
        details = isValid ? 'Valid email format' : 'Invalid email format';
        break;
      case 'url':
        pattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
        isValid = pattern.test(text);
        details = isValid ? 'Valid URL format' : 'Invalid URL format';
        break;
      case 'phone':
        pattern = /^[\+]?[1-9][\d]{0,15}$/;
        isValid = pattern.test(text.replace(/[\s\-\(\)]/g, ''));
        details = isValid ? 'Valid phone number format' : 'Invalid phone number format';
        break;
      case 'alphanumeric':
        pattern = /^[a-zA-Z0-9]+$/;
        isValid = pattern.test(text);
        details = isValid ? 'Contains only alphanumeric characters' : 'Contains non-alphanumeric characters';
        break;
      default:
        throw new Error(`Unsupported validation type: ${validationType}`);
    }

    return {
      text: text,
      validation_type: validationType,
      is_valid: isValid,
      details: details,
      pattern_used: pattern.toString(),
      processed_by: 'agent-a',
      timestamp: new Date().toISOString()
    };
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🟢 Agent A (Text Processor) running on http://localhost:${this.port}`);
      console.log(`📋 Agent Card: http://localhost:${this.port}/agent-card`);
      console.log(`✅ Ready for A2A discovery and communication`);
    });
  }
}

// Avvia server se eseguito direttamente
if (process.argv[1] && process.argv[1].endsWith('agent-a-server.js')) {
  const agentA = new AgentAServer();
  agentA.start();
}

export default AgentAServer;
