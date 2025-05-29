// Simple test for Agent E
import axios from 'axios';

async function testAgentE() {
    try {
        console.log('🧪 Testing Agent E - Intelligent Text Orchestrator...');
        
        // Test status endpoint
        const statusResponse = await axios.get('http://localhost:4005/status');
        console.log('✅ Status endpoint working:', statusResponse.data);
        
        // Test agent card
        const cardResponse = await axios.get('http://localhost:4005/agent-card');
        console.log('✅ Agent Card endpoint working');
        console.log('📋 Agent capabilities:', cardResponse.data.capabilities.map(c => c.id));
        
        // Test intelligent text analysis
        const rpcResponse = await axios.post('http://localhost:4005/rpc', {
            jsonrpc: '2.0',
            method: 'intelligent_text_analysis',
            params: {
                text: 'This is a wonderful test message!',
                include_sentiment: true,
                include_language: true
            },
            id: 'test-1'
        });
        
        console.log('✅ RPC endpoint working, task created:', rpcResponse.data.result.task_id);
        
        // Check task status
        const taskId = rpcResponse.data.result.task_id;
        let attempts = 0;
        while (attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const taskResponse = await axios.get(`http://localhost:4005/task/${taskId}`);
            console.log(`📊 Task status (attempt ${attempts + 1}):`, taskResponse.data.status);
            
            if (taskResponse.data.status === 'completed') {
                console.log('✅ Task completed successfully!');
                console.log('📊 Result:', JSON.stringify(taskResponse.data.result, null, 2));
                break;
            } else if (taskResponse.data.status === 'failed') {
                console.log('❌ Task failed:', taskResponse.data.error);
                break;
            }
            attempts++;
        }
        
        console.log('🎉 Agent E test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('💡 Make sure Agent E is running on port 4005');
        }
    }
}

// Run the test
testAgentE();
