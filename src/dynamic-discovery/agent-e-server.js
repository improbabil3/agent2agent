import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

/**
 * Agent E - Intelligent Text Orchestrator
 * Fa discovery di altri agenti e li chiama dinamicamente solo quando necessario
 * Implementa il protocollo A2A con discovery dinamico e smart delegation
 */

class AgentEServer {
  constructor(port = 4005) {
    this.port = port;
    this.agentId = 'intelligent-orchestrator-agent-e';
    this.app = express();
    this.tasks = new Map();
    this.discoveredAgents = new Map();
    this.lastDiscovery = null;
    this.discoveryInterval = 30000; // 30 secondi
    this.delegationCount = 0;
    this.fallbackCount = 0;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.startPeriodicDiscovery();
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
        port: this.port,
        discovered_agents: this.discoveredAgents.size,
        delegation_stats: {
          delegations: this.delegationCount,
          fallbacks: this.fallbackCount,
          delegation_rate: this.delegationCount + this.fallbackCount > 0 
            ? (this.delegationCount / (this.delegationCount + this.fallbackCount) * 100).toFixed(1) + '%'
            : '0%'
        },
        last_discovery: this.lastDiscovery
      });
    });
      // Agent Card per discovery dinamico
    this.app.get('/agent-card', (req, res) => {
      res.json({
        id: this.agentId,
        name: 'Agent E - Intelligent Text Orchestrator',
        description: 'Intelligent orchestrator that discovers and delegates to specialized agents when needed',
        version: '1.0.0',
        type: 'intelligent-orchestrator',
        endpoints: {
          status: '/status',
          rpc: '/rpc',
          task_status: '/task/{task_id}',
          agent_card: '/agent-card'
        },
        capabilities: [
          {
            id: 'intelligent-text-analysis',
            name: 'Intelligent Text Analysis',
            description: 'Analyzes text with optional sentiment and language detection via specialized agents',
            input_format: 'text/plain',
            output_format: 'application/json',
            delegation: 'automatic'
          },
          {
            id: 'smart-text-processing',
            name: 'Smart Text Processing',
            description: 'Multi-operation text processing with automatic delegation to specialized agents',
            input_format: 'text/plain',
            output_format: 'application/json',
            delegation: 'conditional'
          },
          {
            id: 'orchestrator-status',
            name: 'Orchestrator Status',
            description: 'Returns status of discovered agents and delegation metrics',
            input_format: 'none',
            output_format: 'application/json',
            delegation: 'none'
          },
          {
            id: 'force-discovery',
            name: 'Force Discovery',
            description: 'Forces immediate discovery of available agents',
            input_format: 'none',
            output_format: 'application/json',
            delegation: 'none'
          }
        ],
        authentication: {
          type: 'none'
        },
        discovery_info: {
          discoverable: true,
          category: 'orchestrator',
          tags: ['orchestrator', 'discovery', 'delegation', 'text-analysis', 'intelligent'],
          discovery_capabilities: ['sentiment-analysis', 'language-detection']
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
            id: id || null
          });
        }

        if (!method) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32600, message: 'Method required' },
            id: id || null
          });
        }

        // Gestione task asincrono
        const taskId = uuidv4();
        const task = {
          id: taskId,
          method,
          params,
          status: 'processing',
          created_at: new Date().toISOString(),
          result: null,
          error: null
        };

        this.tasks.set(taskId, task);

        // Avvio task asincrono
        this.processTask(taskId, method, params);

        res.json({
          jsonrpc: '2.0',
          result: {
            task_id: taskId,
            status: 'accepted',
            message: 'Task processing started'
          },
          id
        });

      } catch (error) {
        console.error('Error handling RPC request:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error' },
          id: req.body.id || null
        });
      }
    });

    // Task status endpoint
    this.app.get('/task/:taskId', (req, res) => {
      const { taskId } = req.params;
      const task = this.tasks.get(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.json(task);
    });
  }
    async processTask(taskId, method, params) {
    try {
      const task = this.tasks.get(taskId);
      let result;

      switch (method) {
        case 'intelligent_text_analysis':
          result = await this.intelligentTextAnalysis(params);
          break;
        case 'smart_text_processing':
          result = await this.smartTextProcessing(params);
          break;
        case 'orchestrator_status':
          result = await this.getOrchestratorStatus();
          break;
        case 'force_discovery':
          result = await this.forceDiscovery();
          break;
        default:
          throw new Error(`Unknown method: ${method}`);
      }

      task.status = 'completed';
      task.result = result;
      task.completed_at = new Date().toISOString();
      
    } catch (error) {
      console.error(`Error processing task ${taskId}:`, error);
      const task = this.tasks.get(taskId);
      task.status = 'failed';
      task.error = error.message;
      task.completed_at = new Date().toISOString();
    }
  }  async intelligentTextAnalysis(params) {
    const { text, include_sentiment = true, include_language = true, detailed = false } = params;
    
    if (!text) {
      throw new Error('Text parameter is required');
    }

    // Analisi base del testo (sempre locale)
    const basicAnalysis = this.analyzeTextBasic(text);
    const result = {
      text_analysis: basicAnalysis,
      delegation_used: false,
      agents_called: []
    };

    // Discovery automatico se necessario
    if (this.discoveredAgents.size === 0) {
      await this.performDiscovery();
    }

    // Delega per sentiment se richiesto e Agent C disponibile
    if (include_sentiment) {
      const sentimentAgent = this.findAgentByType('sentiment-analyzer');
      if (sentimentAgent) {
        try {
          const sentimentResult = await this.delegateToAgent(sentimentAgent, 'sentiment_analysis', { text });
          result.sentiment_analysis = sentimentResult;
          result.delegation_used = true;
          result.agents_called.push('Agent C (sentiment)');
          this.delegationCount++;
        } catch (error) {
          console.error('Sentiment delegation failed, using fallback:', error);
          result.sentiment_analysis = this.sentimentFallback(text);
          result.fallback_used = 'sentiment';
          this.fallbackCount++;
        }
      } else {
        result.sentiment_analysis = this.sentimentFallback(text);
        result.fallback_used = 'sentiment';
        this.fallbackCount++;
      }
    }

    // Delega per language detection se richiesto e Agent D disponibile
    if (include_language) {
      const languageAgent = this.findAgentByType('language-detector');
      if (languageAgent) {
        try {
          const languageResult = await this.delegateToAgent(languageAgent, 'language_detection', { text });
          result.language_detection = languageResult;
          result.delegation_used = true;
          result.agents_called.push('Agent D (language)');
          this.delegationCount++;
        } catch (error) {
          console.error('Language delegation failed, using fallback:', error);
          result.language_detection = this.languageFallback(text);
          result.fallback_used = result.fallback_used ? [result.fallback_used, 'language'] : 'language';
          this.fallbackCount++;
        }
      } else {
        result.language_detection = this.languageFallback(text);
        result.fallback_used = result.fallback_used ? [result.fallback_used, 'language'] : 'language';
        this.fallbackCount++;
      }
    }

    return result;
  }

  async smartTextProcessing(params) {
    const { text, operations = ['analyze', 'sentiment', 'language'] } = params;
    
    if (!text) {
      throw new Error('Text parameter is required');
    }

    const result = {
      processed_text: text,
      operations_performed: [],
      delegation_summary: {
        agents_used: [],
        fallbacks_used: [],
        total_delegations: 0,
        total_fallbacks: 0
      }
    };

    // Discovery automatico se necessario
    if (this.discoveredAgents.size === 0) {
      await this.performDiscovery();
    }

    // Processa ogni operazione richiesta
    for (const operation of operations) {
      switch (operation) {
        case 'analyze':
          result.basic_analysis = this.analyzeTextBasic(text);
          result.operations_performed.push('basic_analysis');
          break;

        case 'sentiment':
          const sentimentAgent = this.findAgentByType('sentiment-analyzer');
          if (sentimentAgent) {
            try {
              result.sentiment = await this.delegateToAgent(sentimentAgent, 'sentiment_analysis', { text });
              result.delegation_summary.agents_used.push('Agent C (sentiment)');
              result.delegation_summary.total_delegations++;
              this.delegationCount++;
            } catch (error) {
              result.sentiment = this.sentimentFallback(text);
              result.delegation_summary.fallbacks_used.push('sentiment');
              result.delegation_summary.total_fallbacks++;
              this.fallbackCount++;
            }
          } else {
            result.sentiment = this.sentimentFallback(text);
            result.delegation_summary.fallbacks_used.push('sentiment');
            result.delegation_summary.total_fallbacks++;
            this.fallbackCount++;
          }
          result.operations_performed.push('sentiment_analysis');
          break;

        case 'language':
          const languageAgent = this.findAgentByType('language-detector');
          if (languageAgent) {
            try {
              result.language = await this.delegateToAgent(languageAgent, 'language_detection', { text });
              result.delegation_summary.agents_used.push('Agent D (language)');
              result.delegation_summary.total_delegations++;
              this.delegationCount++;
            } catch (error) {
              result.language = this.languageFallback(text);
              result.delegation_summary.fallbacks_used.push('language');
              result.delegation_summary.total_fallbacks++;
              this.fallbackCount++;
            }
          } else {
            result.language = this.languageFallback(text);
            result.delegation_summary.fallbacks_used.push('language');
            result.delegation_summary.total_fallbacks++;
            this.fallbackCount++;
          }
          result.operations_performed.push('language_detection');
          break;

        default:
          console.warn(`Unknown operation: ${operation}`);
      }
    }

    return result;
  }

  async getOrchestratorStatus() {
    return {
      agent_id: this.agentId,
      port: this.port,
      discovered_agents: Array.from(this.discoveredAgents.entries()).map(([id, agent]) => ({
        id,
        name: agent.name,
        type: agent.type,
        url: agent.url,
        last_seen: agent.last_seen,
        capabilities: agent.capabilities?.length || 0
      })),
      delegation_metrics: {
        total_delegations: this.delegationCount,
        total_fallbacks: this.fallbackCount,
        delegation_rate: this.delegationCount + this.fallbackCount > 0 
          ? (this.delegationCount / (this.delegationCount + this.fallbackCount) * 100).toFixed(1) + '%'
          : '0%'
      },
      discovery_info: {
        last_discovery: this.lastDiscovery,
        discovery_interval_ms: this.discoveryInterval,
        agents_discovered: this.discoveredAgents.size
      }
    };
  }

  async forceDiscovery() {
    console.log('🔍 Force discovery triggered by user request');
    await this.performDiscovery();
    return {
      message: 'Discovery completed',
      discovered_agents: this.discoveredAgents.size,
      timestamp: new Date().toISOString()
    };
  }

  startPeriodicDiscovery() {
    // Discovery iniziale
    this.performDiscovery();
    
    // Discovery periodico
    setInterval(() => {
      this.performDiscovery();
    }, this.discoveryInterval);
  }

  async performDiscovery() {
    console.log('🔍 Performing agent discovery...');
    const startTime = Date.now();
    let discovered = 0;

    // Scansiona porte 4001-4004 per trovare agenti
    const portRange = [4001, 4002, 4003, 4004];
    
    for (const port of portRange) {
      if (port === this.port) continue; // Skip se stesso
      
      try {
        const agentUrl = `http://localhost:${port}`;
        
        // Test status endpoint
        const statusResponse = await axios.get(`${agentUrl}/status`, { timeout: 2000 });
        
        if (statusResponse.data.status === 'ok') {
          // Recupera Agent Card
          const cardResponse = await axios.get(`${agentUrl}/agent-card`, { timeout: 2000 });
          const agentCard = cardResponse.data;
          
          // Aggiorna discovered agents
          this.discoveredAgents.set(agentCard.id, {
            id: agentCard.id,
            name: agentCard.name,
            type: agentCard.type,
            url: agentUrl,
            capabilities: agentCard.capabilities,
            last_seen: new Date().toISOString(),
            card: agentCard
          });
          
          discovered++;
          console.log(`✅ Discovered: ${agentCard.name} (${agentCard.type}) at port ${port}`);
        }
      } catch (error) {
        // Rimuovi agente se non più raggiungibile
        const agentsToRemove = Array.from(this.discoveredAgents.values())
          .filter(agent => agent.url.includes(`:${port}`));
        
        agentsToRemove.forEach(agent => {
          this.discoveredAgents.delete(agent.id);
          console.log(`❌ Removed unreachable agent: ${agent.name}`);
        });
      }
    }
    
    this.lastDiscovery = new Date().toISOString();
    const duration = Date.now() - startTime;
    console.log(`🔍 Discovery completed: ${discovered} agents found in ${duration}ms`);
  }

  findAgentByType(type) {
    return Array.from(this.discoveredAgents.values()).find(agent => agent.type === type);
  }

  async delegateToAgent(agent, method, params) {
    console.log(`🚀 Delegating ${method} to ${agent.name}`);
    
    const response = await axios.post(`${agent.url}/rpc`, {
      jsonrpc: '2.0',
      method,
      params,
      id: uuidv4()
    }, { timeout: 5000 });

    if (response.data.error) {
      throw new Error(`Agent error: ${response.data.error.message}`);
    }

    // Se è un task asincrono, aspetta il completamento
    if (response.data.result?.task_id) {
      return await this.waitForTaskCompletion(agent.url, response.data.result.task_id);
    }

    return response.data.result;
  }

  async waitForTaskCompletion(agentUrl, taskId, maxWaitTime = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const taskResponse = await axios.get(`${agentUrl}/task/${taskId}`, { timeout: 2000 });
        const task = taskResponse.data;
        
        if (task.status === 'completed') {
          return task.result;
        } else if (task.status === 'failed') {
          throw new Error(`Task failed: ${task.error}`);
        }
        
        // Aspetta prima del prossimo polling
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error polling task ${taskId}:`, error.message);
        break;
      }
    }
    
    throw new Error(`Task ${taskId} timeout`);
  }

  // Implementazioni fallback locali
  analyzeTextBasic(text) {
    return {
      char_count: text.length,
      word_count: text.split(/\s+/).filter(word => word.length > 0).length,
      sentence_count: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
      avg_word_length: text.split(/\s+/).filter(w => w.length > 0)
        .reduce((sum, word) => sum + word.length, 0) / text.split(/\s+/).filter(w => w.length > 0).length || 0,
      uppercase_ratio: (text.match(/[A-Z]/g) || []).length / text.length,
      processed_by: 'Agent E (local analysis)'
    };
  }

  sentimentFallback(text) {
    // Implementazione semplice di sentiment
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'joy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'disappointed', 'horrible', 'worst'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positive = words.filter(word => positiveWords.includes(word)).length;
    const negative = words.filter(word => negativeWords.includes(word)).length;
    
    let sentiment = 'neutral';
    let score = 0;
    
    if (positive > negative) {
      sentiment = 'positive';
      score = Math.min(0.8, 0.3 + (positive - negative) * 0.1);
    } else if (negative > positive) {
      sentiment = 'negative';
      score = Math.max(-0.8, -0.3 - (negative - positive) * 0.1);
    }
    
    return {
      sentiment,
      score,
      confidence: Math.abs(score) > 0 ? 0.6 : 0.4,
      processed_by: 'Agent E (fallback sentiment)',
      details: {
        positive_words: positive,
        negative_words: negative,
        total_words: words.length
      }
    };
  }

  languageFallback(text) {
    // Implementazione semplice di language detection
    const patterns = {
      english: /\b(the|and|is|are|was|were|have|has|will|would|could|should|a|an)\b/gi,
      italian: /\b(il|la|di|che|e|un|una|per|non|in|con|sono|è|del|della)\b/gi,
      spanish: /\b(el|la|de|que|y|un|una|en|es|se|no|con|por|para|del)\b/gi,
      french: /\b(le|la|de|et|un|une|il|elle|être|avoir|que|en|pour|du|des)\b/gi,
      german: /\b(der|die|das|und|in|den|von|zu|mit|sich|ist|sind|ein|eine)\b/gi
    };
    
    const scores = {};
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern) || [];
      scores[lang] = matches.length;
    }
    
    const detectedLang = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    const confidence = scores[detectedLang] > 0 ? Math.min(0.8, scores[detectedLang] * 0.1) : 0.2;
    
    return {
      language: detectedLang,
      confidence,
      processed_by: 'Agent E (fallback language detection)',
      alternatives: Object.entries(scores)
        .filter(([lang]) => lang !== detectedLang)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2)
        .map(([lang, score]) => ({ language: lang, score }))
    };
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Agent E - Intelligent Text Orchestrator running on port ${this.port}`);
      console.log(`📋 Agent Card: http://localhost:${this.port}/agent-card`);
      console.log(`💡 Capabilities: intelligent_text_analysis, smart_text_processing, orchestrator_status, force_discovery`);
      console.log(`🔍 Discovery: Automatic every ${this.discoveryInterval/1000}s`);
    });
  }
}

// Avvio del server se eseguito direttamente
if (process.argv[1] && process.argv[1].endsWith('agent-e-server.js')) {
  const server = new AgentEServer();
  server.start();
}

export default AgentEServer;
