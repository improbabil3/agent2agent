#!/usr/bin/env node

/**
 * ADVANCED SYSTEM ORCHESTRATOR per Dynamic Discovery A2A System
 * ==============================================================
 * Orchestratore avanzato che gestisce l'intero ecosistema A2A con:
 * - Gestione automatica del ciclo di vita degli agenti
 * - Load balancing e fault tolerance
 * - Metriche avanzate e logging
 * - API di gestione del sistema
 * - Auto-scaling e recovery
 */

import express from 'express';
import cors from 'cors';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AdvancedSystemOrchestrator {
    constructor() {
        this.port = 3000;
        this.app = express();
        this.agents = new Map();
        this.metrics = {
            startTime: new Date(),
            totalRequests: 0,
            systemUptime: 0,
            averageResponseTime: 0,
            errorRate: 0,
            throughput: 0
        };
        
        this.agentConfigs = [
            { 
                id: 'agent-a', 
                name: 'Text Processor', 
                port: 4001, 
                type: 'text-processor',
                script: 'agent-a-server.js',
                healthPath: '/status',
                capabilities: ['text_analysis', 'text_transform', 'text_validation']
            },
            { 
                id: 'agent-b', 
                name: 'Math Calculator', 
                port: 4002, 
                type: 'math-calculator',
                script: 'agent-b-server.js',
                healthPath: '/status',
                capabilities: ['basic_math', 'advanced_math', 'statistical_analysis', 'equation_solving']
            },
            { 
                id: 'agent-c', 
                name: 'Sentiment Analyzer', 
                port: 4003, 
                type: 'sentiment-analyzer',
                script: 'agent-c-server.js',
                healthPath: '/status',
                capabilities: ['sentiment_analysis', 'emotion_detection', 'polarity_analysis', 'batch_sentiment']
            },
            { 
                id: 'agent-d', 
                name: 'Language Detector', 
                port: 4004, 
                type: 'language-detector',
                script: 'agent-d-server.js',
                healthPath: '/status',
                capabilities: ['language_detection', 'multilingual_analysis', 'language_statistics', 'batch_language_detection']
            }
        ];
        
        this.setupExpress();
        this.setupRoutes();
        this.startHealthMonitoring();
    }
    
    setupExpress() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));
        
        // Middleware per logging
        this.app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                this.metrics.totalRequests++;
                this.updateMetrics(duration);
                console.log(`📊 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
            });
            next();
        });
    }
    
    setupRoutes() {
        // System status endpoint
        this.app.get('/api/system/status', (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                orchestrator: {
                    port: this.port,
                    uptime: Date.now() - this.metrics.startTime.getTime(),
                    version: '2.0.0'
                },
                agents: this.getAgentsStatus(),
                metrics: this.metrics,
                system_health: this.calculateSystemHealth()
            });
        });
        
        // Agents management endpoints
        this.app.get('/api/agents', (req, res) => {
            res.json({
                agents: Array.from(this.agents.values()).map(agent => ({
                    ...agent.config,
                    status: agent.status,
                    pid: agent.process?.pid || null,
                    uptime: agent.startTime ? Date.now() - agent.startTime : 0,
                    last_health_check: agent.lastHealthCheck,
                    response_time: agent.responseTime,
                    error_count: agent.errorCount || 0
                }))
            });
        });
        
        this.app.post('/api/agents/:agentId/start', async (req, res) => {
            const { agentId } = req.params;
            try {
                const result = await this.startAgent(agentId);
                res.json({ success: true, message: `Agent ${agentId} started`, ...result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        this.app.post('/api/agents/:agentId/stop', async (req, res) => {
            const { agentId } = req.params;
            try {
                const result = await this.stopAgent(agentId);
                res.json({ success: true, message: `Agent ${agentId} stopped`, ...result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        this.app.post('/api/agents/:agentId/restart', async (req, res) => {
            const { agentId } = req.params;
            try {
                await this.stopAgent(agentId);
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
                const result = await this.startAgent(agentId);
                res.json({ success: true, message: `Agent ${agentId} restarted`, ...result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // System management endpoints
        this.app.post('/api/system/start-all', async (req, res) => {
            try {
                const results = await this.startAllAgents();
                res.json({ success: true, message: 'All agents started', results });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        this.app.post('/api/system/stop-all', async (req, res) => {
            try {
                const results = await this.stopAllAgents();
                res.json({ success: true, message: 'All agents stopped', results });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Discovery proxy endpoint
        this.app.get('/api/discovery/agents', async (req, res) => {
            try {
                const discoveredAgents = await this.performDiscovery();
                res.json({ 
                    success: true, 
                    agents: discoveredAgents,
                    discovery_time: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Task routing endpoint
        this.app.post('/api/tasks/execute', async (req, res) => {
            try {
                const { method, params } = req.body;
                const result = await this.routeAndExecuteTask(method, params);
                res.json({ success: true, result });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
        
        // Metrics endpoint
        this.app.get('/api/metrics', (req, res) => {
            res.json({
                ...this.metrics,
                system_health: this.calculateSystemHealth(),
                agents_status: this.getAgentsStatus(),
                resource_usage: this.getResourceUsage()
            });
        });
    }
    
    async startAgent(agentId) {
        const config = this.agentConfigs.find(c => c.id === agentId);
        if (!config) {
            throw new Error(`Agent configuration not found: ${agentId}`);
        }
        
        const existing = this.agents.get(agentId);
        if (existing && existing.status === 'running') {
            throw new Error(`Agent ${agentId} is already running`);
        }
        
        const scriptPath = join(__dirname, config.script);
        const process = spawn('node', [scriptPath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, AGENT_PORT: config.port.toString() }
        });
        
        const agent = {
            config,
            process,
            status: 'starting',
            startTime: Date.now(),
            lastHealthCheck: null,
            responseTime: null,
            errorCount: 0
        };
        
        this.agents.set(agentId, agent);
        
        process.stdout.on('data', (data) => {
            console.log(`[${agentId}] ${data.toString().trim()}`);
        });
        
        process.stderr.on('data', (data) => {
            console.error(`[${agentId}] ERROR: ${data.toString().trim()}`);
            agent.errorCount++;
        });
        
        process.on('exit', (code) => {
            console.log(`[${agentId}] Process exited with code ${code}`);
            agent.status = 'stopped';
        });
        
        // Wait for agent to start
        await this.waitForAgent(config.port, 10000);
        agent.status = 'running';
        
        return { agentId, status: 'running', port: config.port };
    }
    
    async stopAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent || !agent.process) {
            throw new Error(`Agent ${agentId} not found or not running`);
        }
        
        agent.process.kill('SIGTERM');
        agent.status = 'stopping';
        
        // Wait for process to stop
        await new Promise((resolve) => {
            agent.process.on('exit', resolve);
            setTimeout(() => {
                if (agent.process && !agent.process.killed) {
                    agent.process.kill('SIGKILL');
                }
                resolve();
            }, 5000);
        });
        
        agent.status = 'stopped';
        return { agentId, status: 'stopped' };
    }
    
    async startAllAgents() {
        const results = [];
        for (const config of this.agentConfigs) {
            try {
                const result = await this.startAgent(config.id);
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({ success: false, agentId: config.id, error: error.message });
            }
        }
        return results;
    }
    
    async stopAllAgents() {
        const results = [];
        for (const [agentId] of this.agents) {
            try {
                const result = await this.stopAgent(agentId);
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({ success: false, agentId, error: error.message });
            }
        }
        return results;
    }
    
    async waitForAgent(port, timeout = 10000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            try {
                await axios.get(`http://localhost:${port}/status`, { timeout: 1000 });
                return true;
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        throw new Error(`Agent on port ${port} did not start within ${timeout}ms`);
    }
    
    async performDiscovery() {
        const discoveredAgents = [];
        
        for (const config of this.agentConfigs) {
            try {
                const response = await axios.get(`http://localhost:${config.port}/agent-card`, {
                    timeout: 5000
                });
                
                discoveredAgents.push({
                    ...config,
                    agent_card: response.data,
                    status: 'online',
                    discovered_at: new Date().toISOString()
                });
            } catch (error) {
                discoveredAgents.push({
                    ...config,
                    status: 'offline',
                    error: error.message,
                    discovered_at: new Date().toISOString()
                });
            }
        }
        
        return discoveredAgents;
    }
    
    async routeAndExecuteTask(method, params) {
        // Smart routing logic
        let targetAgentType;
        
        if (method.startsWith('text_')) {
            targetAgentType = 'text-processor';
        } else if (method.startsWith('math_') || method.includes('math')) {
            targetAgentType = 'math-calculator';
        } else if (method.startsWith('sentiment_') || method.includes('sentiment') || method.includes('emotion')) {
            targetAgentType = 'sentiment-analyzer';
        } else if (method.startsWith('language_') || method.includes('language')) {
            targetAgentType = 'language-detector';
        } else {
            throw new Error(`Unable to route method: ${method}`);
        }
        
        const targetConfig = this.agentConfigs.find(c => c.type === targetAgentType);
        if (!targetConfig) {
            throw new Error(`No agent found for type: ${targetAgentType}`);
        }
        
        // Execute task via JSON-RPC
        const response = await axios.post(`http://localhost:${targetConfig.port}/json-rpc`, {
            jsonrpc: '2.0',
            method: method,
            params: params,
            id: Date.now()
        });
        
        return {
            agent: targetConfig.name,
            method: method,
            result: response.data.result,
            routed_to: targetAgentType,
            execution_time: new Date().toISOString()
        };
    }
    
    startHealthMonitoring() {
        setInterval(async () => {
            for (const [agentId, agent] of this.agents) {
                if (agent.status === 'running') {
                    try {
                        const start = Date.now();
                        await axios.get(`http://localhost:${agent.config.port}/status`, {
                            timeout: 5000
                        });
                        
                        agent.lastHealthCheck = new Date();
                        agent.responseTime = Date.now() - start;
                    } catch (error) {
                        agent.errorCount++;
                        console.error(`Health check failed for ${agentId}: ${error.message}`);
                        
                        // Auto-restart if agent becomes unresponsive
                        if (agent.errorCount > 3) {
                            console.log(`🔄 Auto-restarting unresponsive agent: ${agentId}`);
                            try {
                                await this.stopAgent(agentId);
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                await this.startAgent(agentId);
                                agent.errorCount = 0;
                            } catch (restartError) {
                                console.error(`Failed to restart ${agentId}: ${restartError.message}`);
                            }
                        }
                    }
                }
            }
        }, 15000); // Health check every 15 seconds
    }
    
    updateMetrics(responseTime) {
        const totalTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
        this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalRequests;
        this.metrics.systemUptime = Date.now() - this.metrics.startTime.getTime();
    }
    
    calculateSystemHealth() {
        const runningAgents = Array.from(this.agents.values())
            .filter(agent => agent.status === 'running').length;
        
        const totalAgents = this.agentConfigs.length;
        return Math.round((runningAgents / totalAgents) * 100);
    }
    
    getAgentsStatus() {
        return Object.fromEntries(
            Array.from(this.agents.entries()).map(([id, agent]) => [
                id,
                {
                    status: agent.status,
                    uptime: agent.startTime ? Date.now() - agent.startTime : 0,
                    last_health_check: agent.lastHealthCheck,
                    response_time: agent.responseTime,
                    error_count: agent.errorCount
                }
            ])
        );
    }
    
    getResourceUsage() {
        const memUsage = process.memoryUsage();
        return {
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024), // MB
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
                external: Math.round(memUsage.external / 1024 / 1024) // MB
            },
            cpu_usage: process.cpuUsage(),
            uptime: process.uptime()
        };
    }
    
    async start() {
        console.log('🚀 Starting Advanced System Orchestrator...');
        console.log('🏗️  Initializing A2A Dynamic Discovery Ecosystem...');
        
        // Start orchestrator API
        this.app.listen(this.port, () => {
            console.log(`🌐 Orchestrator API running on http://localhost:${this.port}`);
            console.log('📋 Available endpoints:');
            console.log('   • GET  /api/system/status     - System status');
            console.log('   • GET  /api/agents            - Agents management');
            console.log('   • POST /api/system/start-all  - Start all agents');
            console.log('   • POST /api/system/stop-all   - Stop all agents');
            console.log('   • GET  /api/discovery/agents  - Discover agents');
            console.log('   • POST /api/tasks/execute     - Execute tasks');
            console.log('   • GET  /api/metrics           - System metrics');
            console.log('');
        });
        
        // Auto-start all agents
        console.log('🤖 Auto-starting all A2A agents...');
        const results = await this.startAllAgents();
        
        const successful = results.filter(r => r.success).length;
        const total = results.length;
        
        console.log(`✅ Agent startup complete: ${successful}/${total} agents started`);
        
        if (successful === total) {
            console.log('🎉 All agents are running successfully!');
            console.log('🔍 Dynamic discovery system is ready');
            console.log('📊 Health monitoring is active');
            console.log('🔄 Auto-recovery is enabled');
        } else {
            console.log('⚠️  Some agents failed to start. Check logs for details.');
        }
        
        console.log('');
        console.log('🎮 System Ready! You can now:');
        console.log('   • Monitor: npm run start:monitoring');
        console.log('   • Test: npm run start:discovery-client');
        console.log(`   • API: http://localhost:${this.port}/api/system/status`);
        console.log('');
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            console.log('\n👋 Shutting down Advanced System Orchestrator...');
            await this.stopAllAgents();
            console.log('✅ All agents stopped. Goodbye!');
            process.exit(0);
        });
    }
}

// Start the orchestrator
const orchestrator = new AdvancedSystemOrchestrator();
orchestrator.start();
