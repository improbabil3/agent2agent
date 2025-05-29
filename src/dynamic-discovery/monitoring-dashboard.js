#!/usr/bin/env node

/**
 * MONITORING DASHBOARD per Dynamic Discovery A2A System
 * =======================================================
 * Dashboard di monitoraggio in tempo reale che mostra:
 * - Status degli agenti (online/offline)
 * - Statistiche delle performance
 * - Logs delle operazioni
 * - Health check automatici
 */

import axios from 'axios';

class MonitoringDashboard {
    constructor() {
        this.agents = [
            { id: 'agent-a', name: 'Text Processor', port: 4001, type: 'text-processor' },
            { id: 'agent-b', name: 'Math Calculator', port: 4002, type: 'math-calculator' },
            { id: 'agent-c', name: 'Sentiment Analyzer', port: 4003, type: 'sentiment-analyzer' },
            { id: 'agent-d', name: 'Language Detector', port: 4004, type: 'language-detector' }
        ];
        
        this.monitoringData = {
            startTime: new Date(),
            totalRequests: 0,
            agentStats: {},
            lastHealthCheck: null
        };
        
        this.initializeAgentStats();
    }
    
    initializeAgentStats() {
        this.agents.forEach(agent => {
            this.monitoringData.agentStats[agent.id] = {
                status: 'unknown',
                uptime: 0,
                requests: 0,
                lastSeen: null,
                responseTime: null,
                capabilities: 0,
                errors: 0
            };
        });
    }
    
    async checkAgentHealth(agent) {
        const startTime = Date.now();
        try {
            const response = await axios.get(`http://localhost:${agent.port}/status`, {
                timeout: 5000
            });
            
            const responseTime = Date.now() - startTime;
            
            this.monitoringData.agentStats[agent.id] = {
                ...this.monitoringData.agentStats[agent.id],
                status: response.data.status === 'ok' ? 'online' : 'degraded',
                lastSeen: new Date(),
                responseTime: responseTime
            };
            
            return { success: true, responseTime };
        } catch (error) {
            this.monitoringData.agentStats[agent.id] = {
                ...this.monitoringData.agentStats[agent.id],
                status: 'offline',
                responseTime: null,
                errors: this.monitoringData.agentStats[agent.id].errors + 1
            };
            
            return { success: false, error: error.message };
        }
    }
    
    async getAgentCapabilities(agent) {
        try {
            const response = await axios.get(`http://localhost:${agent.port}/agent-card`, {
                timeout: 5000
            });
            
            const capabilities = response.data.capabilities ? Object.keys(response.data.capabilities).length : 0;
            this.monitoringData.agentStats[agent.id].capabilities = capabilities;
            
            return capabilities;
        } catch (error) {
            return 0;
        }
    }
    
    async performHealthChecks() {
        console.log('🔍 Performing health checks...');
        
        const healthResults = [];
        
        for (const agent of this.agents) {
            const healthResult = await this.checkAgentHealth(agent);
            const capabilities = await this.getAgentCapabilities(agent);
            
            healthResults.push({
                agent: agent.name,
                ...healthResult,
                capabilities
            });
        }
        
        this.monitoringData.lastHealthCheck = new Date();
        return healthResults;
    }
    
    getSystemStatus() {
        const onlineAgents = Object.values(this.monitoringData.agentStats)
            .filter(stat => stat.status === 'online').length;
        
        const totalAgents = this.agents.length;
        const systemHealth = (onlineAgents / totalAgents) * 100;
        
        let status = 'healthy';
        if (systemHealth < 100) status = 'degraded';
        if (systemHealth < 50) status = 'critical';
        if (systemHealth === 0) status = 'down';
        
        return {
            status,
            health: systemHealth,
            onlineAgents,
            totalAgents,
            uptime: Date.now() - this.monitoringData.startTime.getTime()
        };
    }
    
    formatUptime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
      printDashboard() {
        // Clear console (Windows compatible)
        process.stdout.write('\x1Bc');
        console.log('🖥️  DYNAMIC DISCOVERY A2A - MONITORING DASHBOARD');
        console.log('='.repeat(80));
        
        const systemStatus = this.getSystemStatus();
        const statusEmoji = {
            'healthy': '🟢',
            'degraded': '🟡', 
            'critical': '🔴',
            'down': '⚫'
        };
        
        console.log(`${statusEmoji[systemStatus.status]} System Status: ${systemStatus.status.toUpperCase()}`);
        console.log(`📊 System Health: ${systemStatus.health.toFixed(1)}% (${systemStatus.onlineAgents}/${systemStatus.totalAgents} agents online)`);
        console.log(`⏱️  System Uptime: ${this.formatUptime(systemStatus.uptime)}`);
        console.log(`🕐 Last Check: ${this.monitoringData.lastHealthCheck ? this.monitoringData.lastHealthCheck.toLocaleTimeString() : 'Never'}`);
        console.log('');
        
        console.log('🤖 AGENT STATUS');
        console.log('-'.repeat(80));
        
        this.agents.forEach(agent => {
            const stats = this.monitoringData.agentStats[agent.id];
            const statusEmoji = {
                'online': '🟢',
                'degraded': '🟡',
                'offline': '🔴',
                'unknown': '⚪'
            };
            
            const responseTimeStr = stats.responseTime ? `${stats.responseTime}ms` : 'N/A';
            const lastSeenStr = stats.lastSeen ? stats.lastSeen.toLocaleTimeString() : 'Never';
            
            console.log(`${statusEmoji[stats.status]} ${agent.name} (Port ${agent.port})`);
            console.log(`   Status: ${stats.status.toUpperCase()} | Response: ${responseTimeStr} | Last Seen: ${lastSeenStr}`);
            console.log(`   Capabilities: ${stats.capabilities} | Errors: ${stats.errors} | Type: ${agent.type}`);
            console.log('');
        });
        
        console.log('📈 SYSTEM METRICS');
        console.log('-'.repeat(80));
        console.log(`Total Health Checks: ${this.monitoringData.totalRequests}`);
        console.log(`Average Response Time: ${this.getAverageResponseTime()}ms`);
        console.log(`Total Errors: ${this.getTotalErrors()}`);
        console.log(`Monitoring Since: ${this.monitoringData.startTime.toLocaleString()}`);
        console.log('');
        
        console.log('🔧 AVAILABLE COMMANDS');
        console.log('-'.repeat(80));
        console.log('Press CTRL+C to exit monitoring');
        console.log('Automatic refresh every 10 seconds');
        console.log('');
    }
    
    getAverageResponseTime() {
        const responseTimes = Object.values(this.monitoringData.agentStats)
            .map(stat => stat.responseTime)
            .filter(time => time !== null);
        
        if (responseTimes.length === 0) return 0;
        
        const average = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        return Math.round(average);
    }
    
    getTotalErrors() {
        return Object.values(this.monitoringData.agentStats)
            .reduce((total, stat) => total + stat.errors, 0);
    }
      async startMonitoring() {
        console.log('🚀 Starting Dynamic Discovery A2A Monitoring Dashboard...');
        console.log('🔍 Initializing agent discovery and health monitoring...');
        
        // Initial health check
        console.log('⏳ Performing initial health check...');
        await this.performHealthChecks();
        this.monitoringData.totalRequests++;
        console.log('✅ Initial health check completed');
        
        // Print initial dashboard
        this.printDashboard();
        
        // Set up periodic monitoring
        setInterval(async () => {
            await this.performHealthChecks();
            this.monitoringData.totalRequests++;
            this.printDashboard();
        }, 10000); // Check every 10 seconds
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n👋 Shutting down monitoring dashboard...');
            console.log('📊 Final Statistics:');
            console.log(`   Total Health Checks: ${this.monitoringData.totalRequests}`);
            console.log(`   Monitoring Duration: ${this.formatUptime(Date.now() - this.monitoringData.startTime.getTime())}`);
            console.log(`   Average Response Time: ${this.getAverageResponseTime()}ms`);
            console.log('✅ Monitoring dashboard stopped.');
            process.exit(0);
        });
    }
}

// Avvio del dashboard
const dashboard = new MonitoringDashboard();
dashboard.startMonitoring();
