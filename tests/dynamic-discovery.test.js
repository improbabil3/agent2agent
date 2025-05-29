import DynamicDiscoveryClient from '../src/dynamic-discovery/discovery-client.js';
import AgentAServer from '../src/dynamic-discovery/agent-a-server.js';
import AgentBServer from '../src/dynamic-discovery/agent-b-server.js';
import AgentCServer from '../src/dynamic-discovery/agent-c-server.js';

describe('Dynamic Discovery A2A System', () => {
  let agentA, agentB, agentC, client;
  const TEST_PORT_A = 5001;
  const TEST_PORT_B = 5002;
  const TEST_PORT_C = 5003;

  beforeAll(async () => {
    // Avvia agenti su porte di test
    agentA = new AgentAServer(TEST_PORT_A);
    agentB = new AgentBServer(TEST_PORT_B);
    agentC = new AgentCServer(TEST_PORT_C);
    
    // Crea client con porte di test
    client = new DynamicDiscoveryClient();
    client.discoveryPorts = [TEST_PORT_A, TEST_PORT_B, TEST_PORT_C];
    
    // Avvia server
    await new Promise((resolve) => {
      agentA.app.listen(TEST_PORT_A, resolve);
    });
    
    await new Promise((resolve) => {
      agentB.app.listen(TEST_PORT_B, resolve);
    });
    
    await new Promise((resolve) => {
      agentC.app.listen(TEST_PORT_C, resolve);
    });
    
    // Attendi che i server siano pronti
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(() => {
    // Cleanup non necessario per i test
  });

  describe('Agent Discovery', () => {    test('should discover available agents', async () => {
      const agents = await client.discoverAgents();
      
      expect(agents).toHaveLength(3);
      expect(agents.some(a => a.type === 'text-processor')).toBe(true);
      expect(agents.some(a => a.type === 'math-calculator')).toBe(true);
      expect(agents.some(a => a.type === 'sentiment-analyzer')).toBe(true);
    }, 10000);

    test('should filter agents by type', async () => {
      await client.discoverAgents();
      
      const textAgents = client.getAgentsByType('text-processor');
      const mathAgents = client.getAgentsByType('math-calculator');
      const sentimentAgents = client.getAgentsByType('sentiment-analyzer');
      
      expect(textAgents).toHaveLength(1);
      expect(mathAgents).toHaveLength(1);
      expect(sentimentAgents).toHaveLength(1);
      expect(mathAgents).toHaveLength(1);
      expect(textAgents[0].card.name).toContain('Text Processor');
      expect(mathAgents[0].card.name).toContain('Math Calculator');
    });

    test('should filter agents by capability', async () => {
      await client.discoverAgents();
      
      const textAnalysisAgents = client.getAgentsByCapability('text-analysis');
      const basicMathAgents = client.getAgentsByCapability('basic-math');
      
      expect(textAnalysisAgents).toHaveLength(1);
      expect(basicMathAgents).toHaveLength(1);
    });
  });

  describe('Agent A - Text Processor', () => {
    beforeEach(async () => {
      await client.discoverAgents();
    });

    test('should analyze text correctly', async () => {
      const result = await client.executeTaskAutomatically('text_analysis', {
        text: 'Hello world! This is a test.'
      });

      expect(result).toHaveProperty('statistics');
      expect(result.statistics.word_count).toBe(6);
      expect(result.statistics.sentence_count).toBe(2);
      expect(result).toHaveProperty('structure');
      expect(result.processed_by).toBe('agent-a');
    }, 15000);

    test('should transform text correctly', async () => {
      const result = await client.executeTaskAutomatically('text_transform', {
        text: 'hello world',
        operation: 'uppercase'
      });

      expect(result.original).toBe('hello world');
      expect(result.transformed).toBe('HELLO WORLD');
      expect(result.operation).toBe('uppercase');
      expect(result.processed_by).toBe('agent-a');
    }, 10000);

    test('should validate text formats', async () => {
      const emailResult = await client.executeTaskAutomatically('text_validation', {
        text: 'test@example.com',
        validation_type: 'email'
      });

      expect(emailResult.is_valid).toBe(true);
      expect(emailResult.validation_type).toBe('email');
      expect(emailResult.processed_by).toBe('agent-a');

      const invalidEmailResult = await client.executeTaskAutomatically('text_validation', {
        text: 'invalid-email',
        validation_type: 'email'
      });

      expect(invalidEmailResult.is_valid).toBe(false);
    }, 15000);
  });

  describe('Agent B - Math Calculator', () => {
    beforeEach(async () => {
      await client.discoverAgents();
    });

    test('should perform basic math operations', async () => {
      const result = await client.executeTaskAutomatically('basic_math', {
        operation: 'multiply',
        a: 15,
        b: 7
      });

      expect(result.result).toBe(105);
      expect(result.operation).toBe('multiply');
      expect(result.operands).toEqual([15, 7]);
      expect(result.processed_by).toBe('agent-b');
    }, 10000);

    test('should perform advanced math operations', async () => {
      const result = await client.executeTaskAutomatically('advanced_math', {
        operation: 'power',
        a: 2,
        b: 10
      });

      expect(result.result).toBe(1024);
      expect(result.operation).toBe('power');
      expect(result.processed_by).toBe('agent-b');
    }, 10000);

    test('should perform statistical analysis', async () => {
      const result = await client.executeTaskAutomatically('statistical_analysis', {
        numbers: [10, 20, 30, 40, 50]
      });

      expect(result.statistics.mean).toBe(30);
      expect(result.statistics.median).toBe(30);
      expect(result.statistics.count).toBe(5);
      expect(result.statistics.min).toBe(10);
      expect(result.statistics.max).toBe(50);
      expect(result.processed_by).toBe('agent-b');
    }, 10000);

    test('should solve equations', async () => {
      // Test equazione lineare: 2x + 4 = 0 → x = -2
      const linearResult = await client.executeTaskAutomatically('equation_solving', {
        type: 'linear',
        coefficients: [2, 4]
      });

      expect(linearResult.solution.x).toBe(-2);
      expect(linearResult.equation_type).toBe('linear');

      // Test equazione quadratica: x² - 5x + 6 = 0 → x = 2, 3
      const quadraticResult = await client.executeTaskAutomatically('equation_solving', {
        type: 'quadratic',
        coefficients: [1, -5, 6]
      });      expect(quadraticResult.solution.x1).toBe(3);
      expect(quadraticResult.solution.x2).toBe(2);
      expect(quadraticResult.processed_by).toBe('agent-b');
    }, 15000);
  });

  describe('Agent C - Sentiment Analysis Tasks', () => {
    beforeEach(async () => {
      await client.discoverAgents();
    });

    test('should perform sentiment analysis', async () => {
      const result = await client.executeTaskAutomatically('sentiment_analysis', {
        text: 'I love using this amazing product! It works perfectly.'
      });

      expect(result.sentiment).toBe('positive');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.processed_by).toBe('agent-c');
    }, 10000);

    test('should detect emotions', async () => {
      const result = await client.executeTaskAutomatically('emotion_detection', {
        text: 'I am so frustrated and angry with this broken system!'
      });

      expect(result.primary_emotion).toBe('anger');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.emotions).toHaveProperty('anger');
      expect(result.processed_by).toBe('agent-c');
    }, 10000);

    test('should analyze polarity', async () => {
      const result = await client.executeTaskAutomatically('polarity_analysis', {
        text: 'The product is okay, nothing special but not terrible either.'
      });

      expect(result.polarity).toBe('neutral');
      expect(result.score).toBeGreaterThanOrEqual(-1);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.processed_by).toBe('agent-c');
    }, 10000);

    test('should process batch sentiment', async () => {
      const result = await client.executeTaskAutomatically('batch_sentiment', {
        texts: [
          'I love this!',
          'This is terrible.',
          'It\'s okay, I guess.'
        ]
      });

      expect(result.results).toHaveLength(3);
      expect(result.results[0].sentiment).toBe('positive');
      expect(result.results[1].sentiment).toBe('negative');
      expect(result.results[2].sentiment).toBe('neutral');
      expect(result.processed_by).toBe('agent-c');
    }, 15000);
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await client.discoverAgents();
    });

    test('should handle unknown methods', async () => {
      await expect(
        client.executeTaskAutomatically('unknown_method', {})
      ).rejects.toThrow('Unknown method');
    });

    test('should handle invalid parameters', async () => {
      await expect(
        client.executeTaskAutomatically('basic_math', {
          operation: 'add',
          a: 'not_a_number',
          b: 5
        })
      ).rejects.toThrow();
    });

    test('should handle division by zero', async () => {
      await expect(
        client.executeTaskAutomatically('basic_math', {
          operation: 'divide',
          a: 10,
          b: 0
        })
      ).rejects.toThrow();
    });
  });

  describe('A2A Protocol Compliance', () => {
    test('should return proper JSON-RPC 2.0 responses', async () => {
      await client.discoverAgents();
      
      const textAgent = client.getAgentsByType('text-processor')[0];
      
      // Test direct RPC call
      const axios = require('axios');
      const response = await axios.post(`${textAgent.url}/rpc`, {
        jsonrpc: "2.0",
        method: "text_analysis",
        params: { text: "test" },
        id: "test-123"
      });

      expect(response.data.jsonrpc).toBe("2.0");
      expect(response.data.result).toHaveProperty('task_id');
      expect(response.data.id).toBe("test-123");
    });

    test('should provide valid agent cards', async () => {
      await client.discoverAgents();
      
      for (const [port, agent] of client.discoveredAgents) {
        const card = agent.card;
        
        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('name');
        expect(card).toHaveProperty('version');
        expect(card).toHaveProperty('capabilities');
        expect(card).toHaveProperty('endpoints');
        expect(card.capabilities).toBeInstanceOf(Array);
        expect(card.capabilities.length).toBeGreaterThan(0);
      }
    });
  });
});
