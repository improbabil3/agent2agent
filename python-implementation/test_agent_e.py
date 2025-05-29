#!/usr/bin/env python3
"""
Quick test script for Agent E - Intelligent Orchestrator
Python implementation of Agent2Agent protocol
"""

import requests
import json
import time
import asyncio

# Configuration
AGENT_E_URL = "http://localhost:3005"
DISCOVERY_URL = "http://localhost:3010"

def test_orchestrator_status():
    """Test Agent E status endpoint"""
    try:
        response = requests.get(f"{AGENT_E_URL}/status")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Agent E Status: {data['status']}")
            print(f"   - Active Workflows: {data.get('activeWorkflows', 0)}")
            print(f"   - Registered Agents: {data.get('registeredAgents', 0)}")
            print(f"   - Available Workflows: {data.get('availableWorkflows', [])}")
            return True
        else:
            print(f"❌ Agent E status check failed: HTTP {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error connecting to Agent E: {e}")
        return False

def test_orchestrator_capabilities():
    """Test Agent E capabilities via JSON-RPC"""
    try:
        rpc_request = {
            "jsonrpc": "2.0",
            "method": "agent.getCapabilities",
            "id": "test-capabilities"
        }
        
        response = requests.post(
            f"{AGENT_E_URL}/rpc",
            json=rpc_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            result = data.get("result", {})
            
            print(f"✅ Agent E Capabilities:")
            print(f"   - Agent: {result.get('agent')}")
            print(f"   - Version: {result.get('version')}")
            print(f"   - Capabilities: {len(result.get('capabilities', []))}")
            print(f"   - Available Workflows: {result.get('workflows', [])}")
            print(f"   - Registered Agents: {result.get('registeredAgents', [])}")
            
            return True
        else:
            print(f"❌ Capabilities request failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing capabilities: {e}")
        return False

def test_workflow_execution(workflow_type="text_analysis_pipeline", input_text="Hello world! This is a test."):
    """Test workflow execution"""
    try:
        print(f"\n🔄 Testing workflow: {workflow_type}")
        print(f"   Input: {input_text}")
        
        rpc_request = {
            "jsonrpc": "2.0",
            "method": "tasks.send",
            "params": {
                "workflow": workflow_type,
                "input_data": {
                    "text": input_text
                }
            },
            "id": "test-workflow"
        }
        
        response = requests.post(
            f"{AGENT_E_URL}/rpc",
            json=rpc_request,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            result = data.get("result", {})
            workflow_id = result.get("workflowId")
            
            print(f"✅ Workflow started successfully!")
            print(f"   - Workflow ID: {workflow_id}")
            print(f"   - Status: {result.get('status')}")
            print(f"   - Message: {result.get('message')}")
            
            if workflow_id:
                # Monitor workflow progress
                print(f"\n⏳ Monitoring workflow progress...")
                return monitor_workflow(workflow_id)
            
            return True
        else:
            print(f"❌ Workflow execution failed: HTTP {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing workflow execution: {e}")
        return False

def monitor_workflow(workflow_id, timeout=30):
    """Monitor workflow execution progress"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            rpc_request = {
                "jsonrpc": "2.0",
                "method": "tasks.status",
                "params": {"workflowId": workflow_id},
                "id": "status-check"
            }
            
            response = requests.post(
                f"{AGENT_E_URL}/rpc",
                json=rpc_request,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                result = data.get("result", {})
                status = result.get("status")
                
                if status == "completed":
                    print(f"✅ Workflow completed successfully!")
                    print(f"   - Completion time: {result.get('completedAt')}")
                    
                    # Display results
                    workflow_result = result.get("result", {})
                    if workflow_result:
                        print(f"   - Workflow type: {workflow_result.get('workflow')}")
                        
                        # Show step results if available
                        if "steps" in workflow_result:
                            print(f"   - Steps completed: {len(workflow_result['steps'])}")
                            for i, step in enumerate(workflow_result["steps"]):
                                if "result" in step:
                                    print(f"     Step {i+1}: {step['status']}")
                        
                        # Show combined results
                        if "sentiment" in workflow_result:
                            sentiment = workflow_result["sentiment"]
                            print(f"   - Sentiment: {sentiment.get('sentiment')} (confidence: {sentiment.get('confidence', 0):.2f})")
                        
                        if "language_detection" in workflow_result:
                            lang = workflow_result["language_detection"]
                            print(f"   - Language: {lang.get('primary_language')} (confidence: {lang.get('confidence', 0):.2f})")
                    
                    return True
                    
                elif status == "error":
                    print(f"❌ Workflow failed: {result.get('error')}")
                    return False
                    
                else:
                    # Still processing
                    print(f"⏳ Workflow status: {status}")
                    time.sleep(2)
            else:
                print(f"⚠️  Status check failed: HTTP {response.status_code}")
                time.sleep(2)
                
        except Exception as e:
            print(f"⚠️  Error checking workflow status: {e}")
            time.sleep(2)
    
    print(f"⏰ Workflow monitoring timeout after {timeout} seconds")
    return False

def test_available_workflows():
    """Test available workflows endpoint"""
    try:
        response = requests.get(f"{AGENT_E_URL}/api/workflows")
        
        if response.status_code == 200:
            data = response.json()
            workflows = data.get("workflows", {})
            active = data.get("active", {})
            
            print(f"✅ Available workflows: {len(workflows)}")
            for workflow_id, workflow_info in workflows.items():
                print(f"   - {workflow_id}: {workflow_info.get('name')}")
                print(f"     Description: {workflow_info.get('description')}")
                print(f"     Steps: {len(workflow_info.get('steps', []))}")
            
            print(f"   Active workflows: {len(active)}")
            
            return True
        else:
            print(f"❌ Workflows endpoint failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing workflows endpoint: {e}")
        return False

def test_registered_agents():
    """Test registered agents endpoint"""
    try:
        response = requests.get(f"{AGENT_E_URL}/api/agents")
        
        if response.status_code == 200:
            data = response.json()
            agents = data.get("agents", [])
            
            print(f"✅ Registered agents: {len(agents)}")
            for agent in agents:
                print(f"   - {agent.get('name', 'Unknown')} ({agent.get('id', 'No ID')})")
                print(f"     RPC: {agent.get('rpc_endpoint', 'No endpoint')}")
                print(f"     Status: {agent.get('status', 'Unknown')}")
            
            return True
        else:
            print(f"❌ Agents endpoint failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing agents endpoint: {e}")
        return False

def test_discovery_integration():
    """Test integration with discovery service"""
    try:
        response = requests.get(f"{DISCOVERY_URL}/api/agents")
        
        if response.status_code == 200:
            data = response.json()
            agents = data.get("agents", [])
            
            print(f"✅ Discovery service integration:")
            print(f"   - Total agents in registry: {len(agents)}")
            
            # Check if Agent E is registered
            agent_e_found = False
            for agent in agents:
                if agent.get("id") == "agent-e-intelligent-orchestrator":
                    agent_e_found = True
                    print(f"   - Agent E status in registry: {agent.get('status')}")
                    break
            
            if not agent_e_found:
                print("   - Agent E not found in discovery registry")
            
            return True
        else:
            print(f"❌ Discovery service connection failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing discovery integration: {e}")
        return False

def main():
    """Run comprehensive Agent E tests"""
    print("🧪 Agent E (Intelligent Orchestrator) - Python Implementation Test")
    print("=" * 70)
    
    # Basic connectivity tests
    print("\n1. Testing basic connectivity...")
    if not test_orchestrator_status():
        print("❌ Agent E is not responding. Make sure it's running on port 3005")
        return
    
    print("\n2. Testing capabilities...")
    if not test_orchestrator_capabilities():
        print("❌ Capabilities test failed")
        return
    
    print("\n3. Testing available workflows...")
    test_available_workflows()
    
    print("\n4. Testing registered agents...")
    test_registered_agents()
    
    print("\n5. Testing discovery integration...")
    test_discovery_integration()
    
    # Workflow execution tests
    print("\n6. Testing workflow execution...")
    
    # Test different workflows
    test_cases = [
        {
            "workflow": "text_analysis_pipeline",
            "input": "I love this amazing Python implementation! It works perfectly."
        },
        {
            "workflow": "multilingual_sentiment",
            "input": "This is a wonderful day for testing multilingual capabilities."
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n   6.{i} Testing {test_case['workflow']}...")
        success = test_workflow_execution(
            test_case["workflow"], 
            test_case["input"]
        )
        
        if success:
            print(f"   ✅ Workflow {test_case['workflow']} completed successfully")
        else:
            print(f"   ⚠️  Workflow {test_case['workflow']} had issues")
        
        time.sleep(2)  # Brief pause between tests
    
    print("\n" + "=" * 70)
    print("🎯 Agent E testing completed!")
    print("\nTo run full system tests:")
    print("1. Make sure all agents (A, B, C, D, E) are running")
    print("2. Make sure discovery service is running on port 3010")
    print("3. Run: python tests/test_a2a_comprehensive.py")

if __name__ == "__main__":
    main()
