import AgentAServer from './agent-a-server.js';
import AgentBServer from './agent-b-server.js';
import AgentCServer from './agent-c-server.js';
import AgentDServer from './agent-d-server.js';

/**
 * Dynamic Discovery System
 * Orchestratore che avvia tutti gli agenti per il sistema di discovery dinamico
 */

console.log('🚀 Starting Dynamic Discovery A2A System...\n');

// Crea istanze degli agenti
const agentA = new AgentAServer(4001); // Text Processor  
const agentB = new AgentBServer(4002); // Math Calculator
const agentC = new AgentCServer(4003); // Sentiment Analyzer
const agentD = new AgentDServer(4004); // Language Detector

// Avvia tutti gli agenti
console.log('🔥 Starting agent servers...\n');

agentA.start();
agentB.start();
agentC.start();
agentD.start();

console.log('\n✅ Dynamic Discovery System ready!');
console.log('\n📋 Agent Directory:');
console.log('   🟢 Agent A (Text Processor): http://localhost:4001/agent-card');
console.log('   🔵 Agent B (Math Calculator): http://localhost:4002/agent-card');
console.log('   🟡 Agent C (Sentiment Analyzer): http://localhost:4003/agent-card');
console.log('   🟠 Agent D (Language Detector): http://localhost:4004/agent-card');

console.log('\n🔍 Discovery Features:');
console.log('   • Automatic agent discovery via port scanning');
console.log('   • Dynamic capability detection');
console.log('   • Smart task routing based on agent type');
console.log('   • Full A2A protocol compliance');

console.log('\n🎮 To test the discovery system, run:');
console.log('   npm run start:discovery-client');

console.log('\n📝 Available Capabilities:');
console.log('   Agent A: text_analysis, text_transform, text_validation');
console.log('   Agent B: basic_math, advanced_math, statistical_analysis, equation_solving');
console.log('   Agent C: sentiment_analysis, emotion_detection, polarity_analysis, batch_sentiment');
console.log('   Agent D: language_detection, multilingual_analysis, language_statistics, batch_language_detection');

console.log('\n🔗 System Architecture:');
console.log('   Client → Dynamic Discovery → Auto-Route → Agent A/B/C/D → Result');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down dynamic discovery system...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down dynamic discovery system...');
  process.exit(0);
});
