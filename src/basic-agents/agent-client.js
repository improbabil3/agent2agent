import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class AgentClient {
  constructor(serverUrl = 'http://localhost:3000') {
    this.serverUrl = serverUrl;
    this.agentCard = null;
    this.clientId = uuidv4();
  }

  // Discovery: recupera l'Agent Card dal server
  async discoverAgent() {
    try {
      console.log(`🔍 Discovering agent at ${this.serverUrl}...`);
      
      // Prima verifichiamo che il server sia online
      const statusResponse = await axios.get(`${this.serverUrl}/status`);
      console.log(`✅ Server status:`, statusResponse.data);
      
      // Recuperiamo l'Agent Card
      const cardResponse = await axios.get(`${this.serverUrl}/agent-card`);
      this.agentCard = cardResponse.data;
      
      console.log(`📋 Agent Card retrieved:`);
      console.log(`   ID: ${this.agentCard.id}`);
      console.log(`   Name: ${this.agentCard.name}`);
      console.log(`   Capabilities: ${this.agentCard.capabilities.length}`);
      
      return this.agentCard;
    } catch (error) {
      console.error(`❌ Failed to discover agent:`, error.message);
      throw error;
    }
  }

  // Invia un task al server usando JSON-RPC 2.0
  async sendTask(method, params) {
    if (!this.agentCard) {
      throw new Error('Agent not discovered yet. Call discoverAgent() first.');
    }

    const rpcRequest = {
      jsonrpc: "2.0",
      method: method,
      params: params,
      id: uuidv4()
    };

    try {
      console.log(`📤 Sending task: ${method}`);
      console.log(`   Params:`, params);
      
      const response = await axios.post(`${this.serverUrl}/rpc`, rpcRequest);
      const result = response.data.result;
      
      console.log(`✅ Task accepted: ${result.task_id}`);
      
      return result.task_id;
    } catch (error) {
      console.error(`❌ Failed to send task:`, error.message);
      throw error;
    }
  }

  // Polling per monitorare il task invece di SSE
  async waitForTaskCompletion(taskId, maxWaitTime = 30000, pollInterval = 1000) {
    const startTime = Date.now();
    
    console.log(`👂 Polling for task completion: ${taskId}`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await axios.get(`${this.serverUrl}/task/${taskId}`);
        const taskData = response.data;
        
        console.log(`📡 Task status: ${taskData.status}`);
        
        if (taskData.status === 'completed') {
          console.log(`🎉 Task completed!`);
          console.log(`   Result:`, taskData.result);
          return taskData.result;
        } else if (taskData.status === 'failed') {
          console.log(`💥 Task failed: ${taskData.message}`);
          throw new Error(taskData.message || 'Task failed');
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

  // Metodo completo: invia task e aspetta il risultato (con polling)
  async executeTask(method, params) {
    try {
      const taskId = await this.sendTask(method, params);
      const result = await this.waitForTaskCompletion(taskId);
      return result;
    } catch (error) {
      console.error(`❌ Task execution failed:`, error.message);
      throw error;
    }
  }

  // Metodo per ottenere lo stato di un task
  async getTaskStatus(taskId) {
    try {
      const response = await axios.get(`${this.serverUrl}/task/${taskId}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get task status:`, error.message);
      throw error;
    }
  }

  // Metodo per verificare le capacità dell'agente
  hasCapability(capabilityId) {
    if (!this.agentCard) return false;
    return this.agentCard.capabilities.some(cap => cap.id === capabilityId);
  }

  // Lista tutte le capacità disponibili
  listCapabilities() {
    if (!this.agentCard) return [];
    return this.agentCard.capabilities.map(cap => ({
      id: cap.id,
      name: cap.name,
      description: cap.description
    }));
  }
}

// Demo di utilizzo
async function demoInteraction() {
  const client = new AgentClient();
  
  try {
    console.log('🚀 Starting Agent2Agent Demo\n');
    
    // Discovery dell'agente
    await client.discoverAgent();
    
    console.log('\n📋 Available capabilities:');
    client.listCapabilities().forEach(cap => {
      console.log(`   - ${cap.name}: ${cap.description}`);
    });
    
    console.log('\n' + '='.repeat(50));
    
    // Test 1: Analisi del testo
    if (client.hasCapability('text-processing')) {
      console.log('\n📝 Test 1: Text Analysis');
      const textResult = await client.executeTask('text_analysis', {
        text: 'Questo è un test del protocollo Agent2Agent di Google'
      });
      console.log('Result:', textResult);
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Test 2: Operazione matematica
    if (client.hasCapability('math-operations')) {
      console.log('\n🧮 Test 2: Math Operation');
      const mathResult = await client.executeTask('math_operation', {
        operation: 'multiply',
        a: 15,
        b: 7
      });
      console.log('Result:', mathResult);
    }
    
    console.log('\n' + '='.repeat(50));
    
    // Test 3: Operazione non supportata (per testare gli errori)
    console.log('\n❌ Test 3: Unsupported Operation');
    try {
      await client.executeTask('unsupported_method', { test: true });
    } catch (error) {
      console.log('Expected error:', error.message);
    }
    
    console.log('\n🎉 Demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Esegui la demo se il file viene eseguito direttamente  
if (process.argv[1] && process.argv[1].endsWith('agent-client.js')) {
  // Aspetta un po' per essere sicuri che il server sia avviato
  setTimeout(() => {
    demoInteraction().catch(console.error);
  }, 2000);
}

export default AgentClient;
