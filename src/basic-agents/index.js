import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Agent2Agent Demo System\\n');

// Avvia il server
console.log('📡 Starting Agent Server...');
const serverProcess = spawn('node', [path.join(__dirname, 'src', 'agent-server.js')], {
  stdio: 'pipe'
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[SERVER] ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR] ${data.toString().trim()}`);
});

// Aspetta che il server sia avviato, poi avvia il client
setTimeout(() => {
  console.log('\\n🤖 Starting Agent Client...');
  const clientProcess = spawn('node', [path.join(__dirname, 'src', 'agent-client.js')], {
    stdio: 'pipe'
  });

  clientProcess.stdout.on('data', (data) => {
    console.log(`[CLIENT] ${data.toString().trim()}`);
  });

  clientProcess.stderr.on('data', (data) => {
    console.error(`[CLIENT ERROR] ${data.toString().trim()}`);
  });

  clientProcess.on('close', (code) => {
    console.log(`\\n[CLIENT] Process exited with code ${code}`);
    console.log('\\n🛑 Shutting down server...');
    serverProcess.kill();
  });

}, 3000);

// Gestione della chiusura
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down...');
  serverProcess.kill();
  process.exit(0);
});

serverProcess.on('close', (code) => {
  console.log(`\\n[SERVER] Process exited with code ${code}`);
  process.exit(0);
});
