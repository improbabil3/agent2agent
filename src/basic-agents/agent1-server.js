import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

class Agent1Server {
  constructor(port = 3001) {
    this.port = port;
    this.agentId = 'text-processor-agent';
    this.app = express();
    this.tasks = new Map();
    this.agent2Url = 'http://localhost:3002';
    
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
        name: 'Text Processor Agent',
        description: 'Processes text and forwards to sentiment analysis',
        version: '1.0.0',
        endpoints: {
          status: '/status',
          rpc: '/rpc',
          task_status: '/task/{task_id}'
        },
        capabilities: [
          {
            id: 'text-processing-chain',
            name: 'Text Processing Chain',
            description: 'Processes text through multi-agent pipeline',
            input_format: 'text/plain',
            output_format: 'application/json'
          }
        ],
        authentication: {
          type: 'none'
        },
        next_agent: this.agent2Url
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

        if (method === 'process_text_chain') {
          const taskId = uuidv4();
          
          // Store task
          this.tasks.set(taskId, {
            id: taskId,
            status: 'processing',
            method,
            params,
            created_at: new Date().toISOString(),
            agent: 'agent1'
          });

          // Process asynchronously
          this.processTextChain(taskId, params);

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

  async processTextChain(taskId, params) {
    try {
      const { text } = params;
      
      console.log(`🔵 Agent1: Processing text: "${text}"`);
      
      // Step 1: Basic text processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const processedText = {
        original: text,
        cleaned: text.toLowerCase().trim(),
        word_count: text.split(' ').length,
        char_count: text.length,
        processed_by: 'agent1',
        timestamp: new Date().toISOString()
      };

      console.log(`🔵 Agent1: Text processed, forwarding to Agent2...`);

      // Step 2: Forward to Agent2
      const agent2Response = await axios.post(`${this.agent2Url}/rpc`, {
        jsonrpc: '2.0',
        method: 'analyze_sentiment',
        params: { 
          processed_text: processedText,
          chain_id: taskId
        },
        id: uuidv4()
      });

      const agent2TaskId = agent2Response.data.result.task_id;
      
      // Step 3: Wait for Agent2 completion
      const finalResult = await this.waitForAgent2Completion(agent2TaskId);
      
      // Update task with final result
      const task = this.tasks.get(taskId);
      task.status = 'completed';
      task.result = {
        chain_completed: true,
        original_text: text,
        agent1_processing: processedText,
        agent2_result: finalResult,
        total_agents: 3,
        completion_time: new Date().toISOString()
      };
      
      console.log(`🔵 Agent1: Chain completed! Final result ready.`);

    } catch (error) {
      console.error(`🔵 Agent1 Error:`, error.message);
      const task = this.tasks.get(taskId);
      task.status = 'failed';
      task.message = error.message;
    }
  }

  async waitForAgent2Completion(taskId, maxWaitTime = 30000, pollInterval = 1000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(`${this.agent2Url}/task/${taskId}`);
        const taskData = response.data;
        
        if (taskData.status === 'completed') {
          return taskData.result;
        } else if (taskData.status === 'failed') {
          throw new Error(taskData.message || 'Agent2 task failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        if (error.response && error.response.status === 404) {
          throw new Error(`Agent2 task ${taskId} not found`);
        }
        // Continue polling on other errors
      }
    }
    
    throw new Error('Agent2 task timeout');
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🔵 Agent1 (Text Processor) running on http://localhost:${this.port}`);
      console.log(`📋 Agent Card: http://localhost:${this.port}/agent-card`);
    });
  }
}

// Start server if run directly
if (process.argv[1] && process.argv[1].endsWith('agent1-server.js')) {
  console.log('🔵 Starting Agent1 server...');
  const agent1 = new Agent1Server();
  agent1.start();
}

export default Agent1Server;
