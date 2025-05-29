import Agent1Server from './agent1-server.js';
import Agent2Server from './agent2-server.js';
import Agent3Server from './agent3-server.js';

console.log('🚀 Starting Multi-Agent A2A System...\n');

// Create agent instances
const agent1 = new Agent1Server(3001);
const agent2 = new Agent2Server(3002);
const agent3 = new Agent3Server(3003);

// Start all agents
console.log('🔵🟡🟢 Starting agent servers...\n');

agent1.start();
agent2.start();
agent3.start();

console.log('\n✅ Multi-agent system ready!');
console.log('📋 Agent Cards:');
console.log('   🔵 Agent1: http://localhost:3001/agent-card');
console.log('   🟡 Agent2: http://localhost:3002/agent-card');
console.log('   🟢 Agent3: http://localhost:3003/agent-card');
console.log('\n🔗 Processing Chain:');
console.log('   Client → Agent1 → Agent2 → Agent3 → Agent2 → Agent1 → Client');
console.log('\n🎮 To test the system, run:');
console.log('   npm run start:multi-client');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down multi-agent system...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down multi-agent system...');
  process.exit(0);
});
