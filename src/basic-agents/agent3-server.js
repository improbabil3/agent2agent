import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

class Agent3Server {
  constructor(port = 3003) {
    this.port = port;
    this.agentId = 'language-detector-agent';
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
    // Status endpoint
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        agent_id: this.agentId
      });
    });

    // Agent Card
    this.app.get('/agent-card', (req, res) => {
      res.json({
        id: this.agentId,
        name: 'Language Detector Agent',
        description: 'Detects language and completes the processing chain',
        version: '1.0.0',
        endpoints: {
          status: '/status',
          rpc: '/rpc',
          task_status: '/task/{task_id}'
        },
        capabilities: [
          {
            id: 'language-detection-final',
            name: 'Language Detection Final',
            description: 'Final step: detects language and completes chain',
            input_format: 'application/json',
            output_format: 'application/json'
          }
        ],
        authentication: {
          type: 'none'
        },
        chain_position: 'final'
      });
    });

    // JSON-RPC endpoint
    this.app.post('/rpc', async (req, res) => {
      try {
        const { jsonrpc, method, params, id } = req.body;

        if (jsonrpc !== '2.0') {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Invalid Request' },
            id
          });
        }

        if (method === 'detect_language') {
          const taskId = uuidv4();
          
          // Store task
          this.tasks.set(taskId, {
            id: taskId,
            status: 'processing',
            method,
            params,
            created_at: new Date().toISOString(),
            agent: 'agent3'
          });

          // Process asynchronously
          this.detectLanguageFinal(taskId, params);

          res.json({
            jsonrpc: '2.0',
            result: { task_id: taskId, status: 'accepted' },
            id
          });
        } else {
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32601, message: 'Method not found' },
            id
          });
        }
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
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

  async detectLanguageFinal(taskId, params) {
    try {
      const { sentiment_data, chain_id } = params;
      
      console.log(`🟢 Agent3: Detecting language for: "${sentiment_data.original}"`);
      
      // Step 1: Language detection
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      const languageAnalysis = {
        detected_language: this.detectLanguage(sentiment_data.original),
        confidence: Math.random() * 0.2 + 0.8, // 0.8-1.0
        processing_chain: {
          agent1: {
            task: 'text_processing',
            word_count: sentiment_data.word_count,
            char_count: sentiment_data.char_count
          },
          agent2: {
            task: 'sentiment_analysis',
            sentiment: sentiment_data.sentiment,
            confidence: sentiment_data.confidence
          },
          agent3: {
            task: 'language_detection',
            language: this.detectLanguage(sentiment_data.original),
            processed_by: 'agent3'
          }
        },
        final_summary: {
          original_text: sentiment_data.original,
          processed_text: sentiment_data.cleaned,
          word_count: sentiment_data.word_count,
          sentiment: sentiment_data.sentiment,
          sentiment_confidence: sentiment_data.confidence,
          detected_language: this.detectLanguage(sentiment_data.original),
          language_confidence: Math.random() * 0.2 + 0.8,
          processing_time_ms: Date.now() - new Date(sentiment_data.timestamp).getTime(),
          agents_involved: ['agent1', 'agent2', 'agent3'],
          chain_id: chain_id
        }
      };

      console.log(`🟢 Agent3: Language detected: ${languageAnalysis.detected_language}`);
      console.log(`🟢 Agent3: Chain processing completed! Returning results...`);
      
      // Update task with final result
      const task = this.tasks.get(taskId);
      task.status = 'completed';
      task.result = {
        chain_completed: true,
        final_step: 'language_detection',
        language_analysis: languageAnalysis,
        completion_time: new Date().toISOString()
      };

    } catch (error) {
      console.error(`🟢 Agent3 Error:`, error.message);
      const task = this.tasks.get(taskId);
      task.status = 'failed';
      task.message = error.message;
    }
  }

  detectLanguage(text) {
    // Simple language detection based on common words
    const italianWords = ['questo', 'quello', 'sono', 'della', 'nella', 'con', 'per', 'una', 'del', 'che'];
    const englishWords = ['this', 'that', 'with', 'from', 'they', 'been', 'have', 'their', 'what', 'said'];
    const spanishWords = ['esto', 'esta', 'para', 'con', 'una', 'que', 'del', 'los', 'las', 'por'];
    const frenchWords = ['cette', 'avec', 'pour', 'dans', 'une', 'que', 'des', 'les', 'par', 'sur'];
    
    const lowerText = text.toLowerCase();
    
    const italianScore = italianWords.filter(word => lowerText.includes(word)).length;
    const englishScore = englishWords.filter(word => lowerText.includes(word)).length;
    const spanishScore = spanishWords.filter(word => lowerText.includes(word)).length;
    const frenchScore = frenchWords.filter(word => lowerText.includes(word)).length;
    
    const scores = [
      { lang: 'italian', score: italianScore },
      { lang: 'english', score: englishScore },
      { lang: 'spanish', score: spanishScore },
      { lang: 'french', score: frenchScore }
    ];
    
    const maxScore = Math.max(...scores.map(s => s.score));
    if (maxScore === 0) return 'unknown';
    
    return scores.find(s => s.score === maxScore).lang;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🟢 Agent3 (Language Detector) running on http://localhost:${this.port}`);
      console.log(`📋 Agent Card: http://localhost:${this.port}/agent-card`);
    });
  }
}

// Start server if run directly
if (process.argv[1] && process.argv[1].endsWith('agent3-server.js')) {
  const agent3 = new Agent3Server();
  agent3.start();
}

export default Agent3Server;
