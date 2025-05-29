import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

class Agent2Server {
  constructor(port = 3002) {
    this.port = port;
    this.agentId = 'sentiment-analyzer-agent';
    this.app = express();
    this.tasks = new Map();
    this.agent3Url = 'http://localhost:3003';
    
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
        name: 'Sentiment Analyzer Agent',
        description: 'Analyzes sentiment and forwards to language detection',
        version: '1.0.0',
        endpoints: {
          status: '/status',
          rpc: '/rpc',
          task_status: '/task/{task_id}'
        },
        capabilities: [
          {
            id: 'sentiment-analysis-chain',
            name: 'Sentiment Analysis Chain',
            description: 'Analyzes sentiment and continues processing chain',
            input_format: 'application/json',
            output_format: 'application/json'
          }
        ],
        authentication: {
          type: 'none'
        },
        next_agent: this.agent3Url
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

        if (method === 'analyze_sentiment') {
          const taskId = uuidv4();
          
          // Store task
          this.tasks.set(taskId, {
            id: taskId,
            status: 'processing',
            method,
            params,
            created_at: new Date().toISOString(),
            agent: 'agent2'
          });

          // Process asynchronously
          this.analyzeSentimentChain(taskId, params);

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

  async analyzeSentimentChain(taskId, params) {
    try {
      const { processed_text, chain_id } = params;
      
      console.log(`🟡 Agent2: Analyzing sentiment for: "${processed_text.original}"`);
      
      // Step 1: Sentiment analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const sentimentAnalysis = {
        ...processed_text,
        sentiment: this.detectSentiment(processed_text.cleaned),
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
        analyzed_by: 'agent2',
        analysis_timestamp: new Date().toISOString()
      };

      console.log(`🟡 Agent2: Sentiment detected: ${sentimentAnalysis.sentiment}, forwarding to Agent3...`);

      // Step 2: Forward to Agent3
      const agent3Response = await axios.post(`${this.agent3Url}/rpc`, {
        jsonrpc: '2.0',
        method: 'detect_language',
        params: { 
          sentiment_data: sentimentAnalysis,
          chain_id: chain_id
        },
        id: uuidv4()
      });

      const agent3TaskId = agent3Response.data.result.task_id;
      
      // Step 3: Wait for Agent3 completion
      const finalResult = await this.waitForAgent3Completion(agent3TaskId);
      
      // Update task with final result
      const task = this.tasks.get(taskId);
      task.status = 'completed';
      task.result = {
        chain_step: 'agent2_completed',
        sentiment_analysis: sentimentAnalysis,
        agent3_result: finalResult,
        completion_time: new Date().toISOString()
      };
      
      console.log(`🟡 Agent2: Processing completed, returning to Agent1.`);

    } catch (error) {
      console.error(`🟡 Agent2 Error:`, error.message);
      const task = this.tasks.get(taskId);
      task.status = 'failed';
      task.message = error.message;
    }
  }

  detectSentiment(text) {
    // Simple sentiment detection
    const positiveWords = ['buono', 'bello', 'ottimo', 'fantastico', 'excellent', 'good', 'great', 'amazing'];
    const negativeWords = ['cattivo', 'brutto', 'pessimo', 'terribile', 'bad', 'terrible', 'awful', 'horrible'];
    
    const lowerText = text.toLowerCase();
    const hasPositive = positiveWords.some(word => lowerText.includes(word));
    const hasNegative = negativeWords.some(word => lowerText.includes(word));
    
    if (hasPositive && !hasNegative) return 'positive';
    if (hasNegative && !hasPositive) return 'negative';
    if (hasPositive && hasNegative) return 'mixed';
    return 'neutral';
  }

  async waitForAgent3Completion(taskId, maxWaitTime = 30000, pollInterval = 1000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(`${this.agent3Url}/task/${taskId}`);
        const taskData = response.data;
        
        if (taskData.status === 'completed') {
          return taskData.result;
        } else if (taskData.status === 'failed') {
          throw new Error(taskData.message || 'Agent3 task failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (error.response && error.response.status === 404) {
          throw new Error(`Agent3 task ${taskId} not found`);
        }
        // Continue polling on other errors
      }
    }
    
    throw new Error('Agent3 task timeout');
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🟡 Agent2 (Sentiment Analyzer) running on http://localhost:${this.port}`);
      console.log(`📋 Agent Card: http://localhost:${this.port}/agent-card`);
    });
  }
}

// Start server if run directly
if (process.argv[1] && process.argv[1].endsWith('agent2-server.js')) {
  const agent2 = new Agent2Server();
  agent2.start();
}

export default Agent2Server;
