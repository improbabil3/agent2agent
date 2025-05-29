import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/agent-server.js';
import AgentClient from '../src/agent-client.js';

describe('Agent2Agent Protocol Tests', () => {
  let server;
  let client;

  beforeAll(async () => {
    // Avvia il server per i test
    server = app.listen(3001); // Usa una porta diversa per i test
    client = new AgentClient('http://localhost:3001');
    
    // Aspetta che il server sia pronto
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('Agent Server', () => {
    test('should respond to status endpoint', async () => {
      const response = await request(app).get('/status');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('agent_id');
    });

    test('should serve agent card', async () => {
      const response = await request(app).get('/agent-card');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('capabilities');
      expect(response.body.capabilities).toBeInstanceOf(Array);
      expect(response.body.capabilities.length).toBeGreaterThan(0);
    });

    test('should accept RPC tasks', async () => {
      const rpcRequest = {
        jsonrpc: "2.0",
        method: "text_analysis",
        params: { text: "Test message" },
        id: "test-123"
      };

      const response = await request(app)
        .post('/rpc')
        .send(rpcRequest);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('jsonrpc', '2.0');
      expect(response.body).toHaveProperty('result');
      expect(response.body.result).toHaveProperty('task_id');
      expect(response.body.result).toHaveProperty('status', 'accepted');
    });

    test('should reject invalid RPC requests', async () => {
      const invalidRequest = {
        jsonrpc: "1.0", // Versione non valida
        method: "test",
        params: {},
        id: "test-456"
      };

      const response = await request(app)
        .post('/rpc')
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Agent Client', () => {
    test('should discover agent successfully', async () => {
      const agentCard = await client.discoverAgent();
      
      expect(agentCard).toBeDefined();
      expect(agentCard).toHaveProperty('id');
      expect(agentCard).toHaveProperty('capabilities');
      expect(agentCard.capabilities).toBeInstanceOf(Array);
    });

    test('should check capabilities correctly', async () => {
      await client.discoverAgent();
      
      expect(client.hasCapability('text-processing')).toBe(true);
      expect(client.hasCapability('math-operations')).toBe(true);
      expect(client.hasCapability('non-existent')).toBe(false);
    });

    test('should list capabilities', async () => {
      await client.discoverAgent();
      
      const capabilities = client.listCapabilities();
      expect(capabilities).toBeInstanceOf(Array);
      expect(capabilities.length).toBeGreaterThan(0);
      expect(capabilities[0]).toHaveProperty('id');
      expect(capabilities[0]).toHaveProperty('name');
      expect(capabilities[0]).toHaveProperty('description');
    });

    test('should send and execute text analysis task', async () => {
      await client.discoverAgent();
      
      const result = await client.executeTask('text_analysis', {
        text: 'This is a test message for analysis'
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('word_count');
      expect(result).toHaveProperty('char_count');
      expect(result.word_count).toBe(7);
    }, 10000); // Timeout più lungo per task asincroni

    test('should send and execute math operation task', async () => {
      await client.discoverAgent();
      
      const result = await client.executeTask('math_operation', {
        operation: 'add',
        a: 5,
        b: 3
      });
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('result', 8);
    }, 10000);

    test('should handle unsupported methods gracefully', async () => {
      await client.discoverAgent();
      
      await expect(
        client.executeTask('unsupported_method', { test: true })
      ).rejects.toThrow();
    }, 10000);
  });

  describe('End-to-End Communication', () => {
    test('should complete full A2A workflow', async () => {
      // Discovery
      const agentCard = await client.discoverAgent();
      expect(agentCard).toBeDefined();
      
      // Task execution
      const result = await client.executeTask('text_analysis', {
        text: 'Agent2Agent protocol test'
      });
      
      expect(result).toBeDefined();
      expect(result.word_count).toBe(3);
      expect(result.analysis).toBe('Text analysis completed');
    }, 15000);

    test('should handle multiple concurrent tasks', async () => {
      await client.discoverAgent();
      
      const tasks = [
        client.executeTask('math_operation', { operation: 'add', a: 1, b: 2 }),
        client.executeTask('math_operation', { operation: 'multiply', a: 3, b: 4 }),
        client.executeTask('text_analysis', { text: 'concurrent test' })
      ];
      
      const results = await Promise.all(tasks);
      
      expect(results).toHaveLength(3);
      expect(results[0].result).toBe(3);
      expect(results[1].result).toBe(12);
      expect(results[2].word_count).toBe(2);
    }, 15000);
  });
});
