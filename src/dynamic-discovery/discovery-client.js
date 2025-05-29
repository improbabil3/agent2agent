import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

/**
 * Dynamic Discovery Client
 * Client che implementa il discovery dinamico del protocollo A2A
 * Trova automaticamente agenti disponibili e li utilizza
 */
class DynamicDiscoveryClient {
  constructor() {
    this.clientId = uuidv4();
    this.discoveredAgents = new Map();
    this.discoveryPorts = [4001, 4002, 4003, 4004, 4005]; // Range di porte da scansionare
    this.baseUrl = 'http://localhost';
  }

  /**
   * Discovery dinamico degli agenti
   * Scansiona le porte per trovare agenti A2A disponibili
   */
  async discoverAgents() {
    console.log('🔍 Starting dynamic agent discovery...\n');
    
    const availableAgents = [];
    
    for (const port of this.discoveryPorts) {
      try {
        const agentUrl = `${this.baseUrl}:${port}`;
        
        // Controlla se l'agente è online
        const statusResponse = await axios.get(`${agentUrl}/status`, { timeout: 2000 });
        
        if (statusResponse.data.status === 'ok') {
          // Recupera Agent Card
          const cardResponse = await axios.get(`${agentUrl}/agent-card`, { timeout: 2000 });
          const agentCard = cardResponse.data;
          
          // Salva agente scoperto
          this.discoveredAgents.set(port, {
            url: agentUrl,
            port: port,
            card: agentCard,
            last_seen: new Date().toISOString()
          });
          
          availableAgents.push({
            port,
            name: agentCard.name,
            type: agentCard.type,
            capabilities: agentCard.capabilities.length
          });
          
          console.log(`✅ Discovered: ${agentCard.name}`);
          console.log(`   Port: ${port}`);
          console.log(`   Type: ${agentCard.type}`);
          console.log(`   Capabilities: ${agentCard.capabilities.length}\n`);
        }
        
      } catch (error) {
        // Agente non disponibile su questa porta (normale)
      }
    }
    
    if (availableAgents.length === 0) {
      console.log('❌ No agents discovered. Make sure agents are running.');
      return [];
    }
    
    console.log(`🎉 Discovery completed! Found ${availableAgents.length} agent(s)\n`);
    return availableAgents;
  }

  /**
   * Ottieni agenti per categoria/tipo
   */
  getAgentsByType(type) {
    const agents = [];
    for (const [port, agent] of this.discoveredAgents) {
      if (agent.card.type === type) {
        agents.push({ port, ...agent });
      }
    }
    return agents;
  }

  /**
   * Ottieni agenti per capability
   */
  getAgentsByCapability(capabilityId) {
    const agents = [];
    for (const [port, agent] of this.discoveredAgents) {
      const hasCapability = agent.card.capabilities.some(cap => cap.id === capabilityId);
      if (hasCapability) {
        agents.push({ port, ...agent });
      }
    }
    return agents;
  }

  /**
   * Lista tutti gli agenti scoperti
   */
  listDiscoveredAgents() {
    console.log('📋 Discovered Agents Summary:\n');
    
    if (this.discoveredAgents.size === 0) {
      console.log('No agents discovered yet. Run discoverAgents() first.\n');
      return;
    }
    
    for (const [port, agent] of this.discoveredAgents) {
      console.log(`🤖 ${agent.card.name} (Port: ${port})`);
      console.log(`   Type: ${agent.card.type}`);
      console.log(`   Description: ${agent.card.description}`);
      console.log(`   Capabilities:`);
      
      agent.card.capabilities.forEach(cap => {
        console.log(`     • ${cap.name}: ${cap.description}`);
      });
      
      console.log('');
    }
  }

  /**
   * Invia task a un agente specifico
   */
  async sendTaskToAgent(port, method, params) {
    const agent = this.discoveredAgents.get(port);
    if (!agent) {
      throw new Error(`Agent on port ${port} not found. Run discovery first.`);
    }

    const rpcRequest = {
      jsonrpc: "2.0",
      method: method,
      params: params,
      id: uuidv4()
    };

    try {
      console.log(`📤 Sending task to ${agent.card.name}:`);
      console.log(`   Method: ${method}`);
      console.log(`   Params:`, params);
      
      const response = await axios.post(`${agent.url}/rpc`, rpcRequest);
      const taskId = response.data.result.task_id;
      
      console.log(`✅ Task accepted: ${taskId}\n`);
      
      // Attendi completamento con polling
      const result = await this.waitForTaskCompletion(agent.url, taskId);
      
      console.log(`🎉 Task completed!`);
      console.log(`   Agent: ${agent.card.name}`);
      console.log(`   Result:`, result);
      console.log('');
      
      return result;

    } catch (error) {
      console.error(`❌ Task failed:`, error.message);
      throw error;
    }
  }

  /**
   * Polling per attendere il completamento del task
   */
  async waitForTaskCompletion(agentUrl, taskId, maxWaitTime = 30000, pollInterval = 1000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(`${agentUrl}/task/${taskId}`);
        const taskData = response.data;
        
        if (taskData.status === 'completed') {
          return taskData.result;
        } else if (taskData.status === 'failed') {
          throw new Error(taskData.error || 'Task failed');
        }
        
        // Attendi prima del prossimo poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        if (error.response && error.response.status === 404) {
          throw new Error(`Task ${taskId} not found`);
        }
        throw error;
      }
    }
    
    throw new Error('Task timeout - exceeded maximum wait time');
  }

  /**
   * Esegui task automatico: trova l'agente giusto per il task
   */
  async executeTaskAutomatically(method, params) {
    console.log(`🔄 Auto-executing task: ${method}\n`);    // Mappa dei metodi supportati dai diversi agenti
    const methodToAgentType = {
      // Agent A - Text Processor
      'text_analysis': 'text-processor',
      'text_transform': 'text-processor', 
      'text_validation': 'text-processor',
      
      // Agent B - Math Calculator
      'basic_math': 'math-calculator',
      'advanced_math': 'math-calculator',
      'statistical_analysis': 'math-calculator',
      'equation_solving': 'math-calculator',
      
      // Agent C - Sentiment Analyzer
      'sentiment_analysis': 'sentiment-analyzer',
      'emotion_detection': 'sentiment-analyzer',
      'polarity_analysis': 'sentiment-analyzer',
      'batch_sentiment': 'sentiment-analyzer',
      
      // Agent D - Language Detector
      'language_detection': 'language-detector',
      'multilingual_analysis': 'language-detector',
      'language_statistics': 'language-detector',
      'batch_language_detection': 'language-detector'
    };
    
    const requiredType = methodToAgentType[method];
    if (!requiredType) {
      throw new Error(`Unknown method: ${method}. No agent can handle this task.`);
    }
    
    // Trova agenti del tipo corretto
    const suitableAgents = this.getAgentsByType(requiredType);
    
    if (suitableAgents.length === 0) {
      throw new Error(`No agents of type '${requiredType}' available for method '${method}'`);
    }
    
    // Usa il primo agente disponibile
    const selectedAgent = suitableAgents[0];
    
    console.log(`🎯 Selected agent: ${selectedAgent.card.name} (Port: ${selectedAgent.port})`);
    
    return await this.sendTaskToAgent(selectedAgent.port, method, params);
  }

  /**
   * Demo di utilizzo completo
   */
  async runDemo() {
    try {
      console.log('🚀 DYNAMIC DISCOVERY A2A DEMO\n');
      console.log('=' .repeat(50) + '\n');
      
      // 1. Discovery degli agenti
      await this.discoverAgents();
      
      // 2. Lista agenti scoperti
      this.listDiscoveredAgents();
      
      console.log('🧪 Running demo tasks...\n');
      console.log('=' .repeat(50) + '\n');
      
      // 3. Test Agent A - Text Processor
      if (this.getAgentsByType('text-processor').length > 0) {
        console.log('📝 TESTING TEXT PROCESSING AGENT\n');
        
        // Test analisi testo
        await this.executeTaskAutomatically('text_analysis', {
          text: 'Il protocollo Agent2Agent (A2A) di Google consente la comunicazione tra agenti IA.'
        });
        
        // Test trasformazione testo
        await this.executeTaskAutomatically('text_transform', {
          text: 'Hello Dynamic Discovery!',
          operation: 'uppercase'
        });
        
        // Test validazione testo
        await this.executeTaskAutomatically('text_validation', {
          text: 'test@example.com',
          validation_type: 'email'
        });
      }
      
      // 4. Test Agent B - Math Calculator
      if (this.getAgentsByType('math-calculator').length > 0) {
        console.log('🧮 TESTING MATH CALCULATOR AGENT\n');
        
        // Test matematica base
        await this.executeTaskAutomatically('basic_math', {
          operation: 'multiply',
          a: 15,
          b: 7
        });
        
        // Test matematica avanzata
        await this.executeTaskAutomatically('advanced_math', {
          operation: 'power',
          a: 2,
          b: 10
        });
        
        // Test analisi statistica
        await this.executeTaskAutomatically('statistical_analysis', {
          numbers: [10, 20, 30, 40, 50, 20, 30]
        });
          // Test risoluzione equazione
        await this.executeTaskAutomatically('equation_solving', {
          type: 'quadratic',
          coefficients: [1, -5, 6] // x² - 5x + 6 = 0
        });
      }
      
      // 5. Test Agent C - Sentiment Analyzer
      if (this.getAgentsByType('sentiment-analyzer').length > 0) {
        console.log('😊 TESTING SENTIMENT ANALYZER AGENT\n');
        
        // Test analisi sentiment base
        await this.executeTaskAutomatically('sentiment_analysis', {
          text: 'I love using the Agent2Agent protocol! It makes AI collaboration so much easier.'
        });
        
        // Test rilevamento emozioni
        await this.executeTaskAutomatically('emotion_detection', {
          text: 'I am incredibly frustrated with this broken system. It never works properly!'
        });
        
        // Test analisi polarità
        await this.executeTaskAutomatically('polarity_analysis', {
          text: 'The new features are okay, nothing special but not terrible either.'
        });
          // Test batch sentiment
        await this.executeTaskAutomatically('batch_sentiment', {
          texts: [
            'This is absolutely amazing!',
            'I hate this so much.',
            'It\'s an okay product, nothing special.',
            'Best purchase ever, highly recommended!'
          ]
        });
      }
      
      // 6. Test Agent D - Language Detector
      if (this.getAgentsByType('language-detector').length > 0) {
        console.log('🌍 TESTING LANGUAGE DETECTOR AGENT\n');
        
        // Test rilevamento lingua base
        await this.executeTaskAutomatically('language_detection', {
          text: 'Hello, this is a text written in English. How are you today?'
        });
        
        // Test analisi multilingue
        await this.executeTaskAutomatically('multilingual_analysis', {
          text: 'Hello everyone! Ciao a tutti! Hola amigos! Bonjour tout le monde!'
        });
        
        // Test statistiche lingua
        await this.executeTaskAutomatically('language_statistics', {
          text: 'Il protocollo Agent2Agent è una tecnologia innovativa per la comunicazione tra agenti di intelligenza artificiale.'
        });
        
        // Test batch detection
        await this.executeTaskAutomatically('batch_language_detection', {
          texts: [
            'This is English text.',
            'Questo è testo italiano.',
            'Este es texto en español.',
            'Ceci est un texte français.'
          ]
        });
      }
      
      console.log('✅ Demo completed successfully!\n');
      console.log('=' .repeat(50));
      
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
    }
  }
}

// Demo di utilizzo se eseguito direttamente
async function runDynamicDiscoveryDemo() {
  const client = new DynamicDiscoveryClient();
  await client.runDemo();
}

// Esegui demo se file eseguito direttamente
if (process.argv[1] && process.argv[1].endsWith('discovery-client.js')) {
  // Attendi qualche secondo per permettere agli agenti di avviarsi
  setTimeout(() => {
    runDynamicDiscoveryDemo().catch(console.error);
  }, 3000);
}

export default DynamicDiscoveryClient;
