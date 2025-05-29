import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent C - Sentiment Analyzer
 * Analizza il sentiment dei testi con varie funzionalità avanzate
 * Implementa il protocollo A2A con discovery dinamico
 */
class AgentCServer {
  constructor(port = 4003) {
    this.port = port;
    this.agentId = 'sentiment-analyzer-agent-c';
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
        name: 'Agent C - Sentiment Analyzer',
        description: 'Advanced sentiment analysis and emotion detection agent',
        version: '1.0.0',
        type: 'sentiment-analyzer',
        endpoints: {
          status: '/status',
          rpc: '/rpc',
          task_status: '/task/{task_id}',
          agent_card: '/agent-card'
        },
        capabilities: [
          {
            id: 'sentiment-analysis',
            name: 'Sentiment Analysis',
            description: 'Analyzes text sentiment (positive, negative, neutral) with confidence score',
            input_format: 'text/plain',
            output_format: 'application/json'
          },
          {
            id: 'emotion-detection',
            name: 'Emotion Detection',
            description: 'Detects specific emotions (joy, anger, fear, sadness, etc.)',
            input_format: 'text/plain',
            output_format: 'application/json'
          },
          {
            id: 'polarity-analysis',
            name: 'Polarity Analysis',
            description: 'Detailed polarity scoring from -1 (very negative) to +1 (very positive)',
            input_format: 'text/plain',
            output_format: 'application/json'
          },
          {
            id: 'batch-sentiment',
            name: 'Batch Sentiment Analysis',
            description: 'Analyzes sentiment for multiple texts in batch',
            input_format: 'application/json',
            output_format: 'application/json'
          }
        ],
        authentication: {
          type: 'none'
        },
        discovery_info: {
          discoverable: true,
          category: 'sentiment-analysis',
          tags: ['nlp', 'sentiment', 'emotion', 'polarity', 'text-analysis']
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
        const supportedMethods = ['sentiment_analysis', 'emotion_detection', 'polarity_analysis', 'batch_sentiment'];
        
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
          agent: 'agent-c'
        });

        // Elabora task in modo asincrono
        this.processTask(taskId, method, params);

        // Risposta immediata A2A
        res.json({
          jsonrpc: '2.0',
          result: { 
            task_id: taskId, 
            status: 'accepted',
            message: `Sentiment analysis task ${method} accepted for processing`
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
      // Simula elaborazione sentiment
      await new Promise(resolve => setTimeout(resolve, 1200));

      let result;

      switch (method) {
        case 'sentiment_analysis':
          result = this.analyzeSentiment(params.text);
          break;
        case 'emotion_detection':
          result = this.detectEmotions(params.text);
          break;
        case 'polarity_analysis':
          result = this.analyzePolarity(params.text);
          break;
        case 'batch_sentiment':
          result = this.batchSentimentAnalysis(params.texts);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      // Aggiorna task con risultato
      task.status = 'completed';
      task.result = result;
      task.completed_at = new Date().toISOString();
      
      console.log(`🟡 Agent C: Task ${taskId} completed - ${method}`);

    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.failed_at = new Date().toISOString();
      
      console.error(`❌ Agent C: Task ${taskId} failed:`, error.message);
    }
  }

  // Analisi sentiment base
  analyzeSentiment(text) {
    if (!text) throw new Error('Text is required');
    
    const sentiment = this.calculateSentiment(text);
    const confidence = this.calculateConfidence(text, sentiment);
    
    return {
      text: text,
      sentiment: {
        label: sentiment,
        confidence: confidence,
        score: this.sentimentToScore(sentiment)
      },
      analysis: {
        word_count: text.split(/\s+/).filter(w => w.length > 0).length,
        positive_indicators: this.findPositiveWords(text),
        negative_indicators: this.findNegativeWords(text),
        neutral_indicators: this.findNeutralWords(text)
      },
      metadata: {
        processed_by: 'agent-c',
        timestamp: new Date().toISOString(),
        model: 'rule-based-sentiment-v1.0'
      }
    };
  }

  // Rilevamento emozioni
  detectEmotions(text) {
    if (!text) throw new Error('Text is required');
    
    const emotions = this.identifyEmotions(text);
    const dominantEmotion = this.findDominantEmotion(emotions);
    
    return {
      text: text,
      emotions: emotions,
      dominant_emotion: dominantEmotion,
      emotional_intensity: this.calculateIntensity(text),
      emotional_categories: {
        positive: ['joy', 'love', 'surprise', 'trust'].filter(e => emotions[e] > 0.3),
        negative: ['anger', 'fear', 'sadness', 'disgust'].filter(e => emotions[e] > 0.3),
        neutral: emotions.neutral > 0.5 ? ['neutral'] : []
      },
      metadata: {
        processed_by: 'agent-c',
        timestamp: new Date().toISOString(),
        model: 'emotion-detection-v1.0'
      }
    };
  }

  // Analisi polarità
  analyzePolarity(text) {
    if (!text) throw new Error('Text is required');
    
    const polarity = this.calculatePolarity(text);
    const subjectivity = this.calculateSubjectivity(text);
    
    return {
      text: text,
      polarity: {
        score: polarity,
        interpretation: this.interpretPolarity(polarity)
      },
      subjectivity: {
        score: subjectivity,
        interpretation: this.interpretSubjectivity(subjectivity)
      },
      detailed_analysis: {
        positive_score: this.getPositiveScore(text),
        negative_score: this.getNegativeScore(text),
        objective_score: this.getObjectiveScore(text),
        subjective_score: this.getSubjectiveScore(text)
      },
      metadata: {
        processed_by: 'agent-c',
        timestamp: new Date().toISOString(),
        model: 'polarity-analysis-v1.0'
      }
    };
  }

  // Analisi sentiment batch
  batchSentimentAnalysis(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts array is required and cannot be empty');
    }

    const results = texts.map((text, index) => ({
      index: index,
      text: text,
      sentiment: this.calculateSentiment(text),
      confidence: this.calculateConfidence(text, this.calculateSentiment(text)),
      polarity: this.calculatePolarity(text)
    }));

    const summary = this.calculateBatchSummary(results);

    return {
      batch_size: texts.length,
      results: results,
      summary: summary,
      metadata: {
        processed_by: 'agent-c',
        timestamp: new Date().toISOString(),
        model: 'batch-sentiment-v1.0'
      }
    };
  }

  // Funzioni ausiliarie per sentiment
  calculateSentiment(text) {
    const positiveWords = [
      'fantastico', 'ottimo', 'eccellente', 'perfetto', 'magnifico', 'straordinario',
      'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 
      'love', 'happy', 'joy', 'beautiful', 'good', 'best', 'perfect'
    ];
    
    const negativeWords = [
      'terribile', 'pessimo', 'orribile', 'sbagliato', 'fallimento', 'disastro',
      'terrible', 'awful', 'horrible', 'bad', 'worst', 'hate', 'angry', 
      'sad', 'disappointed', 'frustrated', 'annoyed', 'upset'
    ];

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  calculateConfidence(text, sentiment) {
    const indicators = sentiment === 'positive' ? this.findPositiveWords(text) : 
                     sentiment === 'negative' ? this.findNegativeWords(text) : [];
    
    const wordCount = text.split(/\s+/).length;
    const indicatorRatio = indicators.length / wordCount;
    
    return Math.min(0.9, Math.max(0.5, 0.6 + indicatorRatio * 2));
  }

  sentimentToScore(sentiment) {
    switch (sentiment) {
      case 'positive': return Math.random() * 0.4 + 0.6; // 0.6-1.0
      case 'negative': return Math.random() * 0.4; // 0.0-0.4
      default: return Math.random() * 0.2 + 0.4; // 0.4-0.6
    }
  }

  findPositiveWords(text) {
    const positiveWords = ['fantastico', 'ottimo', 'eccellente', 'great', 'excellent', 'amazing', 'love', 'happy', 'beautiful'];
    return positiveWords.filter(word => text.toLowerCase().includes(word));
  }

  findNegativeWords(text) {
    const negativeWords = ['terribile', 'pessimo', 'orribile', 'terrible', 'awful', 'bad', 'hate', 'sad', 'angry'];
    return negativeWords.filter(word => text.toLowerCase().includes(word));
  }

  findNeutralWords(text) {
    const neutralWords = ['forse', 'probabilmente', 'maybe', 'perhaps', 'possibly', 'might', 'could', 'should'];
    return neutralWords.filter(word => text.toLowerCase().includes(word));
  }

  // Funzioni per rilevamento emozioni
  identifyEmotions(text) {
    const emotionKeywords = {
      joy: ['felice', 'gioia', 'allegro', 'happy', 'joy', 'cheerful', 'delighted'],
      anger: ['arrabbiato', 'furioso', 'angry', 'mad', 'furious', 'irritated'],
      fear: ['paura', 'spaventato', 'afraid', 'scared', 'fearful', 'terrified'],
      sadness: ['triste', 'depresso', 'sad', 'depressed', 'melancholy', 'sorrowful'],
      surprise: ['sorpreso', 'stupito', 'surprised', 'amazed', 'astonished'],
      disgust: ['disgusto', 'schifo', 'disgusted', 'revolted', 'repulsed'],
      trust: ['fiducia', 'sicuro', 'trust', 'confident', 'secure'],
      love: ['amore', 'amo', 'love', 'adore', 'cherish']
    };

    const lowerText = text.toLowerCase();
    const emotions = {};

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
      emotions[emotion] = Math.min(1.0, matches * 0.3 + Math.random() * 0.2);
    }

    emotions.neutral = 1.0 - Math.max(...Object.values(emotions));
    return emotions;
  }

  findDominantEmotion(emotions) {
    let maxEmotion = 'neutral';
    let maxScore = emotions.neutral;

    for (const [emotion, score] of Object.entries(emotions)) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion;
      }
    }

    return { emotion: maxEmotion, intensity: maxScore };
  }

  calculateIntensity(text) {
    const intensifiers = ['molto', 'estremamente', 'incredibly', 'extremely', 'really', 'absolutely'];
    const hasIntensifiers = intensifiers.some(word => text.toLowerCase().includes(word));
    const hasExclamation = text.includes('!');
    const hasCapitals = /[A-Z]{2,}/.test(text);

    let intensity = 0.5;
    if (hasIntensifiers) intensity += 0.2;
    if (hasExclamation) intensity += 0.15;
    if (hasCapitals) intensity += 0.1;

    return Math.min(1.0, intensity);
  }

  // Funzioni per analisi polarità
  calculatePolarity(text) {
    const sentiment = this.calculateSentiment(text);
    const positiveWords = this.findPositiveWords(text);
    const negativeWords = this.findNegativeWords(text);
    
    let polarity = 0;
    
    if (sentiment === 'positive') {
      polarity = 0.2 + (positiveWords.length * 0.15);
    } else if (sentiment === 'negative') {
      polarity = -0.2 - (negativeWords.length * 0.15);
    }
    
    return Math.max(-1.0, Math.min(1.0, polarity));
  }

  calculateSubjectivity(text) {
    const subjectiveWords = ['penso', 'credo', 'sento', 'think', 'feel', 'believe', 'opinion', 'personally'];
    const objectiveWords = ['fatto', 'statistiche', 'fact', 'data', 'research', 'study', 'evidence'];
    
    const lowerText = text.toLowerCase();
    const subjectiveCount = subjectiveWords.filter(word => lowerText.includes(word)).length;
    const objectiveCount = objectiveWords.filter(word => lowerText.includes(word)).length;
    
    return Math.max(0.0, Math.min(1.0, 0.5 + (subjectiveCount - objectiveCount) * 0.2));
  }

  interpretPolarity(polarity) {
    if (polarity > 0.5) return 'very positive';
    if (polarity > 0.1) return 'positive';
    if (polarity > -0.1) return 'neutral';
    if (polarity > -0.5) return 'negative';
    return 'very negative';
  }

  interpretSubjectivity(subjectivity) {
    if (subjectivity > 0.7) return 'highly subjective';
    if (subjectivity > 0.4) return 'moderately subjective';
    return 'mostly objective';
  }

  getPositiveScore(text) {
    return this.findPositiveWords(text).length * 0.2;
  }

  getNegativeScore(text) {
    return this.findNegativeWords(text).length * 0.2;
  }

  getObjectiveScore(text) {
    return 1.0 - this.calculateSubjectivity(text);
  }

  getSubjectiveScore(text) {
    return this.calculateSubjectivity(text);
  }

  // Funzioni per analisi batch
  calculateBatchSummary(results) {
    const sentiments = results.map(r => r.sentiment);
    const polarities = results.map(r => r.polarity);
    
    const sentimentCounts = {
      positive: sentiments.filter(s => s === 'positive').length,
      negative: sentiments.filter(s => s === 'negative').length,
      neutral: sentiments.filter(s => s === 'neutral').length
    };

    const avgPolarity = polarities.reduce((sum, p) => sum + p, 0) / polarities.length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      sentiment_distribution: sentimentCounts,
      average_polarity: avgPolarity,
      average_confidence: avgConfidence,
      overall_sentiment: this.determineOverallSentiment(sentimentCounts),
      polarity_range: {
        min: Math.min(...polarities),
        max: Math.max(...polarities)
      }
    };
  }

  determineOverallSentiment(counts) {
    const { positive, negative, neutral } = counts;
    if (positive > negative && positive > neutral) return 'positive';
    if (negative > positive && negative > neutral) return 'negative';
    return 'neutral';
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🟡 Agent C (Sentiment Analyzer) running on http://localhost:${this.port}`);
      console.log(`📋 Agent Card: http://localhost:${this.port}/agent-card`);
      console.log(`✅ Ready for A2A discovery and communication`);
    });
  }
}

// Avvia server se eseguito direttamente
if (process.argv[1] && process.argv[1].endsWith('agent-c-server.js')) {
  const agentC = new AgentCServer();
  agentC.start();
}

export default AgentCServer;
