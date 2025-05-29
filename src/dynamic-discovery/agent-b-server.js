import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent B - Math Calculator
 * Esegue operazioni matematiche avanzate e calcoli scientifici
 * Implementa il protocollo A2A con discovery dinamico
 */
class AgentBServer {
  constructor(port = 4002) {
    this.port = port;
    this.agentId = 'math-calculator-agent-b';
    this.app = express();
    this.tasks = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
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
        port: this.port
      });
    });

    // Agent Card per discovery dinamico
    this.app.get('/agent-card', (req, res) => {
      res.json({
        id: this.agentId,
        name: 'Agent B - Math Calculator',
        description: 'Advanced mathematical operations and scientific calculations agent',
        version: '1.0.0',
        type: 'math-calculator',
        endpoints: {
          status: '/status',
          rpc: '/rpc',
          task_status: '/task/{task_id}',
          agent_card: '/agent-card'
        },
        capabilities: [
          {
            id: 'basic-math',
            name: 'Basic Mathematics',
            description: 'Basic operations: addition, subtraction, multiplication, division',
            input_format: 'application/json',
            output_format: 'application/json'
          },
          {
            id: 'advanced-math',
            name: 'Advanced Mathematics',
            description: 'Advanced operations: power, square root, logarithm, trigonometry',
            input_format: 'application/json',
            output_format: 'application/json'
          },
          {
            id: 'statistical-analysis',
            name: 'Statistical Analysis',
            description: 'Statistical operations on number arrays',
            input_format: 'application/json',
            output_format: 'application/json'
          },
          {
            id: 'equation-solving',
            name: 'Equation Solving',
            description: 'Solves simple linear and quadratic equations',
            input_format: 'application/json',
            output_format: 'application/json'
          }
        ],
        authentication: {
          type: 'none'
        },
        discovery_info: {
          discoverable: true,
          category: 'mathematics',
          tags: ['calculator', 'math', 'statistics', 'equations']
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
            id
          });
        }

        // Gestione dei metodi supportati
        const supportedMethods = ['basic_math', 'advanced_math', 'statistical_analysis', 'equation_solving'];
        
        if (!supportedMethods.includes(method)) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32601, message: `Method not found: ${method}` },
            id
          });
        }

        const taskId = uuidv4();
        
        // Crea task
        this.tasks.set(taskId, {
          id: taskId,
          status: 'processing',
          method,
          params,
          created_at: new Date().toISOString(),
          agent: 'agent-b'
        });

        // Elabora task in modo asincrono
        this.processTask(taskId, method, params);

        // Risposta immediata A2A
        res.json({
          jsonrpc: '2.0',
          result: { 
            task_id: taskId, 
            status: 'accepted',
            message: `Math task ${method} accepted for processing`
          },
          id
        });

      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal error', data: error.message },
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

  // Elaborazione dei task
  async processTask(taskId, method, params) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      // Simula elaborazione matematica
      await new Promise(resolve => setTimeout(resolve, 800));

      let result;

      switch (method) {
        case 'basic_math':
          result = this.performBasicMath(params);
          break;
        case 'advanced_math':
          result = this.performAdvancedMath(params);
          break;
        case 'statistical_analysis':
          result = this.performStatisticalAnalysis(params);
          break;
        case 'equation_solving':
          result = this.solveEquation(params);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      // Aggiorna task con risultato
      task.status = 'completed';
      task.result = result;
      task.completed_at = new Date().toISOString();
      
      console.log(`🔵 Agent B: Task ${taskId} completed - ${method}`);

    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.failed_at = new Date().toISOString();
      
      console.error(`❌ Agent B: Task ${taskId} failed:`, error.message);
    }
  }

  // Operazioni matematiche base
  performBasicMath(params) {
    const { operation, a, b } = params;

    if (typeof a !== 'number' || (operation !== 'sqrt' && typeof b !== 'number')) {
      throw new Error('Invalid numeric parameters');
    }

    let result;
    let formula;

    switch (operation) {
      case 'add':
        result = a + b;
        formula = `${a} + ${b} = ${result}`;
        break;
      case 'subtract':
        result = a - b;
        formula = `${a} - ${b} = ${result}`;
        break;
      case 'multiply':
        result = a * b;
        formula = `${a} × ${b} = ${result}`;
        break;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        result = a / b;
        formula = `${a} ÷ ${b} = ${result}`;
        break;
      case 'modulo':
        if (b === 0) throw new Error('Modulo by zero');
        result = a % b;
        formula = `${a} mod ${b} = ${result}`;
        break;
      default:
        throw new Error(`Unsupported basic operation: ${operation}`);
    }

    return {
      operation: operation,
      operands: operation === 'sqrt' ? [a] : [a, b],
      result: result,
      formula: formula,
      type: 'basic_math',
      processed_by: 'agent-b',
      timestamp: new Date().toISOString()
    };
  }

  // Operazioni matematiche avanzate
  performAdvancedMath(params) {
    const { operation, a, b } = params;

    if (typeof a !== 'number') {
      throw new Error('Invalid numeric parameter');
    }

    let result;
    let formula;

    switch (operation) {
      case 'power':
        if (typeof b !== 'number') throw new Error('Power requires two parameters');
        result = Math.pow(a, b);
        formula = `${a}^${b} = ${result}`;
        break;
      case 'sqrt':
        if (a < 0) throw new Error('Square root of negative number');
        result = Math.sqrt(a);
        formula = `√${a} = ${result}`;
        break;
      case 'cbrt':
        result = Math.cbrt(a);
        formula = `∛${a} = ${result}`;
        break;
      case 'log':
        if (a <= 0) throw new Error('Logarithm of non-positive number');
        result = Math.log(a);
        formula = `ln(${a}) = ${result}`;
        break;
      case 'log10':
        if (a <= 0) throw new Error('Logarithm of non-positive number');
        result = Math.log10(a);
        formula = `log₁₀(${a}) = ${result}`;
        break;
      case 'sin':
        result = Math.sin(a);
        formula = `sin(${a}) = ${result}`;
        break;
      case 'cos':
        result = Math.cos(a);
        formula = `cos(${a}) = ${result}`;
        break;
      case 'tan':
        result = Math.tan(a);
        formula = `tan(${a}) = ${result}`;
        break;
      case 'factorial':
        if (a < 0 || !Number.isInteger(a)) throw new Error('Factorial requires non-negative integer');
        result = this.calculateFactorial(a);
        formula = `${a}! = ${result}`;
        break;
      default:
        throw new Error(`Unsupported advanced operation: ${operation}`);
    }

    return {
      operation: operation,
      operands: ['power'].includes(operation) ? [a, b] : [a],
      result: result,
      formula: formula,
      type: 'advanced_math',
      processed_by: 'agent-b',
      timestamp: new Date().toISOString()
    };
  }

  // Analisi statistica
  performStatisticalAnalysis(params) {
    const { numbers } = params;

    if (!Array.isArray(numbers) || numbers.length === 0) {
      throw new Error('Numbers array is required and cannot be empty');
    }

    if (!numbers.every(n => typeof n === 'number')) {
      throw new Error('All elements must be numbers');
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    const mean = sum / numbers.length;
    const variance = numbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / numbers.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Mediana
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];

    // Moda
    const frequency = {};
    numbers.forEach(n => frequency[n] = (frequency[n] || 0) + 1);
    const maxFreq = Math.max(...Object.values(frequency));
    const mode = Object.keys(frequency)
      .filter(n => frequency[n] === maxFreq)
      .map(n => parseFloat(n));

    return {
      data: numbers,
      statistics: {
        count: numbers.length,
        sum: sum,
        mean: mean,
        median: median,
        mode: mode.length === numbers.length ? 'No mode' : mode,
        variance: variance,
        standard_deviation: standardDeviation,
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        range: Math.max(...numbers) - Math.min(...numbers)
      },
      type: 'statistical_analysis',
      processed_by: 'agent-b',
      timestamp: new Date().toISOString()
    };
  }

  // Risoluzione equazioni
  solveEquation(params) {
    const { type, coefficients } = params;

    if (!type || !Array.isArray(coefficients)) {
      throw new Error('Equation type and coefficients array are required');
    }

    let solution;
    let formula;

    switch (type) {
      case 'linear':
        // ax + b = 0
        if (coefficients.length !== 2) {
          throw new Error('Linear equation requires 2 coefficients [a, b]');
        }
        const [a, b] = coefficients;
        if (a === 0) throw new Error('Coefficient a cannot be zero for linear equation');
        solution = { x: -b / a };
        formula = `${a}x + ${b} = 0 → x = ${solution.x}`;
        break;

      case 'quadratic':
        // ax² + bx + c = 0
        if (coefficients.length !== 3) {
          throw new Error('Quadratic equation requires 3 coefficients [a, b, c]');
        }
        const [qa, qb, qc] = coefficients;
        if (qa === 0) throw new Error('Coefficient a cannot be zero for quadratic equation');
        
        const discriminant = qb * qb - 4 * qa * qc;
        
        if (discriminant < 0) {
          solution = { complex: true, message: 'No real solutions (complex roots)' };
        } else if (discriminant === 0) {
          const x = -qb / (2 * qa);
          solution = { x1: x, x2: x, note: 'One solution (repeated root)' };
        } else {
          const x1 = (-qb + Math.sqrt(discriminant)) / (2 * qa);
          const x2 = (-qb - Math.sqrt(discriminant)) / (2 * qa);
          solution = { x1: x1, x2: x2 };
        }
        
        formula = `${qa}x² + ${qb}x + ${qc} = 0`;
        break;

      default:
        throw new Error(`Unsupported equation type: ${type}`);
    }

    return {
      equation_type: type,
      coefficients: coefficients,
      formula: formula,
      solution: solution,
      type: 'equation_solving',
      processed_by: 'agent-b',
      timestamp: new Date().toISOString()
    };
  }

  // Funzione ausiliaria per fattoriale
  calculateFactorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🔵 Agent B (Math Calculator) running on http://localhost:${this.port}`);
      console.log(`📋 Agent Card: http://localhost:${this.port}/agent-card`);
      console.log(`✅ Ready for A2A discovery and communication`);
    });
  }
}

// Avvia server se eseguito direttamente
if (process.argv[1] && process.argv[1].endsWith('agent-b-server.js')) {
  const agentB = new AgentBServer();
  agentB.start();
}

export default AgentBServer;
