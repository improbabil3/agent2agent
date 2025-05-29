import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

class MultiAgentClient {
  constructor() {
    this.agent1Url = 'http://localhost:3001';
    this.clientId = uuidv4();
    this.agentCards = new Map();
  }

  // Discovery di tutti gli agenti
  async discoverAgents() {
    try {
      console.log('🔍 Discovering multi-agent system...\n');
      
      const agents = [
        { name: 'Agent1 (Text Processor)', url: this.agent1Url, port: 3001 },
        { name: 'Agent2 (Sentiment Analyzer)', url: 'http://localhost:3002', port: 3002 },
        { name: 'Agent3 (Language Detector)', url: 'http://localhost:3003', port: 3003 }
      ];

      for (const agent of agents) {
        try {
          const statusResponse = await axios.get(`${agent.url}/status`);
          const cardResponse = await axios.get(`${agent.url}/agent-card`);
          
          this.agentCards.set(agent.port, cardResponse.data);
          
          console.log(`✅ ${agent.name}:`);
          console.log(`   Status: ${statusResponse.data.status}`);
          console.log(`   ID: ${cardResponse.data.id}`);
          console.log(`   Capabilities: ${cardResponse.data.capabilities.length}`);
          
        } catch (error) {
          console.log(`❌ ${agent.name}: ${error.message}`);
        }
      }
      
      console.log('\\n📋 Multi-agent chain discovered!\\n');
      return this.agentCards;
      
    } catch (error) {
      console.error('❌ Failed to discover agents:', error.message);
      throw error;
    }
  }

  // Invia testo per elaborazione nella catena di agenti
  async processTextChain(text) {
    try {
      console.log(`📤 Starting text processing chain...`);
      console.log(`   Input text: "${text}"`);
      console.log(`   Chain: Client → Agent1 → Agent2 → Agent3 → Agent2 → Agent1 → Client\\n`);

      // Invia richiesta ad Agent1 (inizio della catena)
      const rpcRequest = {
        jsonrpc: "2.0",
        method: "process_text_chain",
        params: { text: text },
        id: uuidv4()
      };

      const response = await axios.post(`${this.agent1Url}/rpc`, rpcRequest);
      const taskId = response.data.result.task_id;
      
      console.log(`✅ Chain started! Task ID: ${taskId}\\n`);
      
      // Aspetta il completamento della catena
      const result = await this.waitForChainCompletion(taskId);
      
      console.log('🎉 Multi-agent processing completed!\\n');
      return result;
      
    } catch (error) {
      console.error('❌ Chain processing failed:', error.message);
      throw error;
    }
  }

  // Polling per aspettare il completamento della catena
  async waitForChainCompletion(taskId, maxWaitTime = 60000, pollInterval = 2000) {
    const startTime = Date.now();
    let pollCount = 0;
    
    console.log(`👂 Monitoring chain progress...\\n`);
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        pollCount++;
        const response = await axios.get(`${this.agent1Url}/task/${taskId}`);
        const taskData = response.data;
        
        console.log(`📡 Poll ${pollCount}: Chain status = ${taskData.status}`);
        
        if (taskData.status === 'completed') {
          console.log('\\n🎉 Chain completed! Processing results...\\n');
          return taskData.result;
        } else if (taskData.status === 'failed') {
          throw new Error(taskData.message || 'Chain processing failed');
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        if (error.response && error.response.status === 404) {
          throw new Error(`Task ${taskId} not found`);
        }
        console.log(`⚠️  Polling error: ${error.message}, retrying...`);
      }
    }
    
    throw new Error('Chain processing timeout');
  }

  // Mostra i risultati in modo leggibile
  displayResults(result) {
    console.log('═'.repeat(60));
    console.log('📊 MULTI-AGENT PROCESSING RESULTS');
    console.log('═'.repeat(60));
    
    if (result.agent2_result && result.agent2_result.agent3_result) {
      const finalSummary = result.agent2_result.agent3_result.language_analysis.final_summary;
      
      console.log(`\\n📝 Original Text: "${finalSummary.original_text}"`);
      console.log(`🔤 Processed Text: "${finalSummary.processed_text}"`);
      console.log(`\\n📊 Analysis Results:`);
      console.log(`   📏 Word Count: ${finalSummary.word_count}`);
      console.log(`   💭 Sentiment: ${finalSummary.sentiment} (confidence: ${(finalSummary.sentiment_confidence * 100).toFixed(1)}%)`);
      console.log(`   🌍 Language: ${finalSummary.detected_language} (confidence: ${(finalSummary.language_confidence * 100).toFixed(1)}%)`);
      console.log(`   ⏱️  Processing Time: ${finalSummary.processing_time_ms}ms`);
      console.log(`\\n🔗 Agent Chain:`);
      console.log(`   🔵 Agent1: Text Processing`);
      console.log(`   🟡 Agent2: Sentiment Analysis`);
      console.log(`   🟢 Agent3: Language Detection`);
      console.log(`\\n✅ Chain ID: ${finalSummary.chain_id}`);
    } else {
      console.log('\\n⚠️  Incomplete results received');
      console.log(JSON.stringify(result, null, 2));
    }
    
    console.log('\\n' + '═'.repeat(60));
  }
}

// Demo function
async function runMultiAgentDemo() {
  const client = new MultiAgentClient();
  
  try {
    console.log('🚀 MULTI-AGENT A2A DEMO\\n');
    
    // Discovery degli agenti
    await client.discoverAgents();
    
    // Test con diversi testi
    const testTexts = [
      "Questo è un fantastico test del protocollo Agent2Agent di Google!",
      "This is a terrible example of bad communication",
      "¡Esta es una prueba increíble de agentes inteligentes!",
      "C'est un excellent exemple de communication entre agents"
    ];
    
    for (let i = 0; i < testTexts.length; i++) {
      console.log(`\\n${'🔄'.repeat(3)} TEST ${i + 1} ${'🔄'.repeat(3)}\\n`);
      
      const result = await client.processTextChain(testTexts[i]);
      client.displayResults(result);
      
      if (i < testTexts.length - 1) {
        console.log('\\n⏸️  Waiting 3 seconds before next test...\\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    console.log('\\n🎉 Multi-agent demo completed successfully!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error.message);
  }
}

// Run demo if executed directly
if (process.argv[1] && process.argv[1].endsWith('multi-agent-client.js')) {
  setTimeout(() => {
    runMultiAgentDemo().catch(console.error);
  }, 3000); // Wait 3 seconds for servers to start
}

export default MultiAgentClient;
