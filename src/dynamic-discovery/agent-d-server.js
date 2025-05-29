import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent D - Language Detector
 * Rileva e analizza le lingue dei testi con varie funzionalità avanzate
 * Implementa il protocollo A2A con discovery dinamico
 */
class AgentDServer {
  constructor(port = 4004) {
    this.port = port;
    this.agentId = 'language-detector-agent-d';
    this.app = express();
    this.tasks = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupLanguageData();
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
        uptime: process.uptime()
      });
    });

    // Agent Card endpoint per discovery
    this.app.get('/agent-card', (req, res) => {
      res.json(this.getAgentCard());
    });

    // JSON-RPC 2.0 endpoint per task
    this.app.post('/rpc', (req, res) => {
      this.handleRPCRequest(req, res);
    });

    // Task status endpoint
    this.app.get('/task/:taskId', (req, res) => {
      const { taskId } = req.params;
      const task = this.tasks.get(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      
      res.json(task);
    });
  }

  setupLanguageData() {
    // Database semplificato per il rilevamento delle lingue
    this.languagePatterns = {
      english: {
        commonWords: ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'],
        patterns: [/\b(the|and|is|are|was|were|have|has|will|would|could|should)\b/gi],
        characteristics: ['frequent use of articles', 'Germanic structure']
      },
      italian: {
        commonWords: ['il', 'di', 'che', 'e', 'la', 'un', 'a', 'per', 'non', 'in'],
        patterns: [/\b(il|la|di|che|e|un|una|per|non|in|con|sono|è)\b/gi],
        characteristics: ['vowel endings', 'Romance language structure']
      },
      spanish: {
        commonWords: ['el', 'de', 'que', 'y', 'la', 'un', 'en', 'es', 'se', 'no'],
        patterns: [/\b(el|la|de|que|y|un|una|en|es|se|no|con|por|para)\b/gi],
        characteristics: ['frequent use of articles', 'Romance language structure']
      },
      french: {
        commonWords: ['le', 'de', 'et', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que'],
        patterns: [/\b(le|la|de|et|un|une|il|elle|être|avoir|que|en|pour)\b/gi],
        characteristics: ['liaison patterns', 'Romance language structure']
      },
      german: {
        commonWords: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
        patterns: [/\b(der|die|das|und|in|den|von|zu|mit|sich|ist|sind)\b/gi],
        characteristics: ['compound words', 'Germanic structure', 'case system']
      },
      portuguese: {
        commonWords: ['o', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para', 'é'],
        patterns: [/\b(o|a|de|que|e|do|da|em|um|uma|para|é|são|com)\b/gi],
        characteristics: ['nasal sounds', 'Romance language structure']
      }
    };

    this.languageStats = {
      english: { name: 'English', family: 'Germanic', speakers: '1.5B', region: 'Global' },
      italian: { name: 'Italian', family: 'Romance', speakers: '65M', region: 'Italy, Switzerland' },
      spanish: { name: 'Spanish', family: 'Romance', speakers: '500M', region: 'Spain, Latin America' },
      french: { name: 'French', family: 'Romance', speakers: '280M', region: 'France, Canada, Africa' },
      german: { name: 'German', family: 'Germanic', speakers: '100M', region: 'Germany, Austria, Switzerland' },
      portuguese: { name: 'Portuguese', family: 'Romance', speakers: '260M', region: 'Brazil, Portugal' }
    };
  }

  getAgentCard() {
    return {
      agent_id: this.agentId,
      name: 'Agent D - Language Detector',
      type: 'language-detector',
      version: '1.0.0',
      description: 'Advanced language detection and linguistic analysis agent',
      capabilities: [
        {
          id: 'language_detection',
          name: 'Language Detection',
          description: 'Detects the primary language of a text with confidence score',
          parameters: {
            text: { type: 'string', required: true, description: 'Text to analyze' }
          }
        },
        {
          id: 'multilingual_analysis',
          name: 'Multilingual Analysis',
          description: 'Analyzes text for multiple languages and mixing patterns',
          parameters: {
            text: { type: 'string', required: true, description: 'Text to analyze' }
          }
        },
        {
          id: 'language_statistics',
          name: 'Language Statistics',
          description: 'Provides detailed statistics about detected languages',
          parameters: {
            text: { type: 'string', required: true, description: 'Text to analyze' }
          }
        },
        {
          id: 'batch_language_detection',
          name: 'Batch Language Detection',
          description: 'Detects languages for multiple texts in batch',
          parameters: {
            texts: { type: 'array', required: true, description: 'Array of texts to analyze' }
          }
        }
      ],
      endpoints: {
        status: `http://localhost:${this.port}/status`,
        rpc: `http://localhost:${this.port}/rpc`,
        agent_card: `http://localhost:${this.port}/agent-card`
      },
      communication: {
        protocol: 'json-rpc-2.0',
        transport: 'http',
        format: 'json'
      },
      metadata: {
        created: new Date().toISOString(),
        author: 'A2A Dynamic Discovery System',
        tags: ['language-detection', 'linguistics', 'nlp', 'multilingual']
      }
    };
  }

  async handleRPCRequest(req, res) {
    const { jsonrpc, method, params, id } = req.body;

    // Validazione JSON-RPC 2.0
    if (jsonrpc !== '2.0' || !method || !id) {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
        id: id || null
      });
    }

    const taskId = uuidv4();
    
    // Crea task
    const task = {
      id: taskId,
      method,
      params,
      status: 'processing',
      created: new Date().toISOString(),
      agent_id: this.agentId
    };

    this.tasks.set(taskId, task);

    // Risposta immediata con task ID
    res.json({
      jsonrpc: '2.0',
      result: { task_id: taskId, status: 'accepted' },
      id
    });

    // Elabora task in background
    this.processTask(task);
  }

  async processTask(task) {
    try {
      let result;

      switch (task.method) {
        case 'language_detection':
          result = await this.detectLanguage(task.params);
          break;
        case 'multilingual_analysis':
          result = await this.analyzeMultilingual(task.params);
          break;
        case 'language_statistics':
          result = await this.getLanguageStatistics(task.params);
          break;
        case 'batch_language_detection':
          result = await this.batchLanguageDetection(task.params);
          break;
        default:
          throw new Error(`Unknown method: ${task.method}`);
      }

      // Aggiorna task con risultato
      task.status = 'completed';
      task.result = result;
      task.completed = new Date().toISOString();

    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.completed = new Date().toISOString();
    }
  }

  async detectLanguage(params) {
    const { text } = params;
    
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text parameter');
    }

    await this.simulateProcessing(500); // Simula elaborazione

    const scores = {};
    const cleanText = text.toLowerCase();

    // Calcola score per ogni lingua
    for (const [langCode, langData] of Object.entries(this.languagePatterns)) {
      let score = 0;
      
      // Controlla parole comuni
      const wordMatches = langData.commonWords.filter(word => 
        cleanText.includes(` ${word} `) || 
        cleanText.startsWith(`${word} `) || 
        cleanText.endsWith(` ${word}`)
      );
      score += wordMatches.length * 2;

      // Controlla pattern
      for (const pattern of langData.patterns) {
        const matches = cleanText.match(pattern);
        if (matches) {
          score += matches.length;
        }
      }

      scores[langCode] = score;
    }

    // Trova lingua con score più alto
    const detectedLang = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );

    const maxScore = scores[detectedLang];
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? maxScore / totalScore : 0;

    return {
      text: text,
      detected_language: {
        code: detectedLang,
        name: this.languageStats[detectedLang]?.name || detectedLang,
        confidence: Math.min(confidence, 1),
        family: this.languageStats[detectedLang]?.family || 'Unknown'
      },
      all_scores: scores,
      analysis: {
        text_length: text.length,
        word_count: text.split(/\s+/).filter(w => w.length > 0).length,
        character_distribution: this.analyzeCharacterDistribution(text)
      },
      metadata: {
        processed_by: 'agent-d',
        timestamp: new Date().toISOString(),
        model: 'rule-based-language-detection-v1.0'
      }
    };
  }

  async analyzeMultilingual(params) {
    const { text } = params;
    
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text parameter');
    }

    await this.simulateProcessing(800);

    // Analizza per segmenti
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const languageSegments = [];

    for (const sentence of sentences) {
      const detection = await this.detectLanguage({ text: sentence.trim() });
      languageSegments.push({
        text: sentence.trim(),
        language: detection.detected_language,
        position: text.indexOf(sentence.trim())
      });
    }

    // Statistiche multilingue
    const languageCounts = {};
    languageSegments.forEach(segment => {
      const lang = segment.language.code;
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    const isMultilingual = Object.keys(languageCounts).length > 1;
    const primaryLanguage = Object.keys(languageCounts).reduce((a, b) => 
      languageCounts[a] > languageCounts[b] ? a : b
    );

    return {
      text: text,
      multilingual_analysis: {
        is_multilingual: isMultilingual,
        primary_language: {
          code: primaryLanguage,
          name: this.languageStats[primaryLanguage]?.name || primaryLanguage,
          segments: languageCounts[primaryLanguage]
        },
        language_distribution: languageCounts,
        detected_languages: Object.keys(languageCounts).length,
        segments: languageSegments
      },
      mixing_patterns: {
        code_switching: isMultilingual,
        language_transitions: this.analyzeLanguageTransitions(languageSegments),
        consistency_score: 1 - (Object.keys(languageCounts).length - 1) * 0.2
      },
      metadata: {
        processed_by: 'agent-d',
        timestamp: new Date().toISOString(),
        model: 'multilingual-analysis-v1.0'
      }
    };
  }

  async getLanguageStatistics(params) {
    const { text } = params;
    
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text parameter');
    }

    await this.simulateProcessing(600);

    const detection = await this.detectLanguage(params);
    const detectedLang = detection.detected_language.code;
    const langStats = this.languageStats[detectedLang];

    return {
      text: text,
      detected_language: detection.detected_language,
      language_info: {
        name: langStats?.name || 'Unknown',
        family: langStats?.family || 'Unknown',
        estimated_speakers: langStats?.speakers || 'Unknown',
        primary_regions: langStats?.region || 'Unknown',
        writing_system: this.getWritingSystem(detectedLang),
        characteristics: this.languagePatterns[detectedLang]?.characteristics || []
      },
      text_statistics: {
        character_count: text.length,
        word_count: text.split(/\s+/).filter(w => w.length > 0).length,
        sentence_count: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length,
        average_word_length: this.calculateAverageWordLength(text),
        unique_characters: [...new Set(text.toLowerCase())].length
      },
      linguistic_features: {
        has_diacritics: /[àáâãäåæçèéêëìíîïñòóôõöøùúûüýÿ]/i.test(text),
        has_numbers: /\d/.test(text),
        has_punctuation: /[.,;:!?]/.test(text),
        capitalization_pattern: this.analyzeCapitalization(text)
      },
      metadata: {
        processed_by: 'agent-d',
        timestamp: new Date().toISOString(),
        model: 'language-statistics-v1.0'
      }
    };
  }

  async batchLanguageDetection(params) {
    const { texts } = params;
    
    if (!Array.isArray(texts)) {
      throw new Error('Invalid texts parameter - must be an array');
    }

    await this.simulateProcessing(300 * texts.length);

    const results = [];
    const languageCounts = {};

    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      const detection = await this.detectLanguage({ text });
      
      const lang = detection.detected_language.code;
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;

      results.push({
        index: i,
        text: text,
        language: detection.detected_language,
        confidence: detection.detected_language.confidence
      });
    }

    // Statistiche del batch
    const totalTexts = texts.length;
    const uniqueLanguages = Object.keys(languageCounts).length;
    const mostCommonLang = Object.keys(languageCounts).reduce((a, b) => 
      languageCounts[a] > languageCounts[b] ? a : b
    );

    return {
      batch_size: totalTexts,
      results: results,
      summary: {
        unique_languages: uniqueLanguages,
        language_distribution: languageCounts,
        most_common_language: {
          code: mostCommonLang,
          name: this.languageStats[mostCommonLang]?.name || mostCommonLang,
          count: languageCounts[mostCommonLang],
          percentage: Math.round((languageCounts[mostCommonLang] / totalTexts) * 100)
        },
        average_confidence: Math.round(
          results.reduce((sum, r) => sum + r.confidence, 0) / totalTexts * 100
        ) / 100,
        multilingual_batch: uniqueLanguages > 1
      },
      metadata: {
        processed_by: 'agent-d',
        timestamp: new Date().toISOString(),
        model: 'batch-language-detection-v1.0'
      }
    };
  }

  // Utility methods
  analyzeCharacterDistribution(text) {
    const chars = text.toLowerCase().split('');
    const distribution = {};
    chars.forEach(char => {
      if (/[a-z]/.test(char)) {
        distribution[char] = (distribution[char] || 0) + 1;
      }
    });
    return distribution;
  }

  analyzeLanguageTransitions(segments) {
    const transitions = [];
    for (let i = 1; i < segments.length; i++) {
      const from = segments[i-1].language.code;
      const to = segments[i].language.code;
      if (from !== to) {
        transitions.push({ from, to, position: i });
      }
    }
    return transitions;
  }

  getWritingSystem(langCode) {
    const writingSystems = {
      english: 'Latin',
      italian: 'Latin',
      spanish: 'Latin',
      french: 'Latin',
      german: 'Latin',
      portuguese: 'Latin'
    };
    return writingSystems[langCode] || 'Unknown';
  }

  calculateAverageWordLength(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const totalLength = words.reduce((sum, word) => sum + word.length, 0);
    return words.length > 0 ? Math.round((totalLength / words.length) * 100) / 100 : 0;
  }

  analyzeCapitalization(text) {
    const uppercase = (text.match(/[A-Z]/g) || []).length;
    const lowercase = (text.match(/[a-z]/g) || []).length;
    const total = uppercase + lowercase;
    
    if (total === 0) return 'no_letters';
    
    const uppercaseRatio = uppercase / total;
    if (uppercaseRatio > 0.8) return 'mostly_uppercase';
    if (uppercaseRatio < 0.1) return 'mostly_lowercase';
    return 'mixed_case';
  }

  async simulateProcessing(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  start() {
    this.app.listen(this.port, () => {
      console.log(`🟠 Agent D (Language Detector) running on http://localhost:${this.port}`);
      console.log(`📋 Agent Card: http://localhost:${this.port}/agent-card`);
      console.log(`✅ Ready for A2A discovery and communication`);
    });
  }
}

// Esportazione per utilizzo come modulo
export default AgentDServer;

// Avvio diretto se eseguito come script principale
if (process.argv[1] && process.argv[1].endsWith('agent-d-server.js')) {
  const agent = new AgentDServer();
  agent.start();
}
