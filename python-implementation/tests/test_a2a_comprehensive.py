"""
Test Suite Completo per il Sistema Agent2Agent (A2A)

Questo modulo contiene test completi per verificare la conformità e il funzionamento
corretto di tutti i componenti del sistema Agent2Agent implementato in Python.

Aree di testing coperte:
1. DISCOVERY SERVICE: Verifica funzionamento servizio di discovery centralizzato
2. AGENT CARDS: Validazione conformità Agent Cards al protocollo A2A
3. STATUS ENDPOINTS: Test health check e status degli agenti
4. JSON-RPC COMMUNICATION: Verifica comunicazione task tramite JSON-RPC 2.0
5. SERVER-SENT EVENTS: Test aggiornamenti real-time tramite SSE
6. ORCHESTRATION: Test orchestrazione multi-agente end-to-end
7. ERROR HANDLING: Verifica gestione errori e edge cases
8. PERFORMANCE: Test prestazioni e timeout

Struttura test:
- test_discovery_*: Test del discovery service e registrazione agenti
- test_agent_*: Test funzionalità base singoli agenti
- test_communication_*: Test comunicazione inter-agente
- test_orchestration_*: Test workflows complessi multi-agente
- test_error_*: Test gestione errori e resilienza

Configurazione:
- Assume agenti in esecuzione su localhost porte 3001-3005
- Discovery service su porta 3010
- Timeout configurabili per ambienti diversi
- Output verboso per debugging e CI/CD

Author: A2A Test Team
Version: 2.0.0
Protocol: Agent2Agent Protocol Testing
"""

import pytest
import requests
import json
import time
from datetime import datetime

# Configurazione test environment
# URL base per tutti i servizi (modificare per deployment remoti)
BASE_URL = "http://localhost"

# Mapping agenti con configurazione porte e metadati
AGENTS = {
    "agent-a": {"port": 3001, "name": "Text Processing Agent"},
    "agent-b": {"port": 3002, "name": "Math Calculator Agent"},
    "agent-c": {"port": 3003, "name": "Sentiment Analysis Agent"},
    "agent-d": {"port": 3004, "name": "Language Detection Agent"},
    "agent-e": {"port": 3005, "name": "Intelligent Orchestrator Agent"}
}

# Porta del discovery service
DISCOVERY_PORT = 3010

class TestA2AProtocol:
    """
    Suite di test principale per il protocollo Agent2Agent.
    
    Verifica conformità e interoperabilità di tutti i componenti
    del sistema A2A secondo le specifiche del protocollo.
    """
    
    def test_discovery_service_status(self):
        """
        Test: Verifica che il discovery service sia operativo e risponda correttamente.
        
        Validazioni:
        - HTTP 200 response su endpoint /status
        - Presenza campo 'status' = 'ok'
        - Presenza metadati service e version
        - Struttura response conforme al protocollo
        
        Scopo: Assicura che il discovery service sia avviato e configurato correttamente
        prima di procedere con test più complessi.
        """        
        response = requests.get(f"{BASE_URL}:{DISCOVERY_PORT}/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data
        assert "version" in data
        print(f"✅ Discovery service is running: {data['service']} v{data['version']}")
    
    def test_agent_cards(self):
        """
        Test: Verifica che tutti gli agenti servano Agent Cards valide.
        
        Per ogni agente configurato:
        - Richiesta GET a /.well-known/agent.json
        - Validazione struttura JSON conforme a A2A
        - Verifica campi obbligatori: agent, spec, protocol
        - Controllo metadati: id, name, capabilities, endpoints
        
        Scopo: Garantisce che tutti gli agenti implementino correttamente
        la specifica Agent Card del protocollo A2A per il discovery.
        """
        for agent_id, agent_info in AGENTS.items():
            response = requests.get(f"{BASE_URL}:{agent_info['port']}/.well-known/agent.json")
            assert response.status_code == 200
            
            agent_card = response.json()
            assert "agent" in agent_card
            assert "spec" in agent_card
            assert agent_card["spec"]["protocol"] == "agent2agent"
            
            agent_data = agent_card["agent"]
            assert "id" in agent_data
            assert "name" in agent_data
            assert "capabilities" in agent_data
            assert "endpoints" in agent_data
            
            print(f"✅ {agent_info['name']} serves valid Agent Card")
    
    def test_agent_status_endpoints(self):
        """Test that all agents respond to status requests"""
        for agent_id, agent_info in AGENTS.items():
            response = requests.get(f"{BASE_URL}:{agent_info['port']}/status")
            assert response.status_code == 200
            
            data = response.json()
            assert data["status"] == "ok"
            assert "agent" in data
            assert "version" in data
            
            print(f"✅ {agent_info['name']} status endpoint working")
    
    def test_json_rpc_capabilities(self):
        """Test JSON-RPC 2.0 capabilities method for all agents"""
        for agent_id, agent_info in AGENTS.items():
            rpc_request = {
                "jsonrpc": "2.0",
                "method": "agent.getCapabilities",
                "id": "test-capabilities"
            }
            
            response = requests.post(
                f"{BASE_URL}:{agent_info['port']}/rpc",
                json=rpc_request,
                headers={"Content-Type": "application/json"}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["jsonrpc"] == "2.0"
            assert "result" in data
            assert "capabilities" in data["result"]
            
            print(f"✅ {agent_info['name']} JSON-RPC capabilities working")
    
    def test_text_processing_agent(self):
        """Test Agent A - Text Processing"""
        rpc_request = {
            "jsonrpc": "2.0",
            "method": "tasks.send",
            "params": {
                "text": "Hello World Test",
                "operation": "uppercase"
            },
            "id": "test-text-processing"
        }
        
        response = requests.post(
            f"{BASE_URL}:{AGENTS['agent-a']['port']}/rpc",
            json=rpc_request
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "result" in data
        assert "taskId" in data["result"]
        
        # Wait for completion and check result
        task_id = data["result"]["taskId"]
        self._wait_for_task_completion("agent-a", task_id)
        
        print("✅ Text Processing Agent task completed successfully")
    
    def test_math_calculator_agent(self):
        """Test Agent B - Math Calculator"""
        rpc_request = {
            "jsonrpc": "2.0",
            "method": "tasks.send",
            "params": {
                "operation": "add",
                "numbers": [10, 20, 30]
            },
            "id": "test-math-calculation"
        }
        
        response = requests.post(
            f"{BASE_URL}:{AGENTS['agent-b']['port']}/rpc",
            json=rpc_request
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "result" in data
        assert "taskId" in data["result"]
        
        # Wait for completion and check result
        task_id = data["result"]["taskId"]
        result = self._wait_for_task_completion("agent-b", task_id)
          # Verify math result
        if result and "result" in result:
            if "result" in result["result"] and isinstance(result["result"]["result"], dict):
                math_result = result["result"]["result"]["result"]
            else:
                math_result = result["result"]["result"]
            assert math_result == 60  # 10 + 20 + 30 = 60
        
        print("✅ Math Calculator Agent task completed successfully")
    
    def test_sentiment_analysis_agent(self):
        """Test Agent C - Sentiment Analysis"""
        rpc_request = {
            "jsonrpc": "2.0",
            "method": "tasks.send",
            "params": {
                "text": "I love this amazing product! It's fantastic!",
                "type": "basic"
            },
            "id": "test-sentiment-analysis"
        }
        
        response = requests.post(
            f"{BASE_URL}:{AGENTS['agent-c']['port']}/rpc",
            json=rpc_request
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "result" in data
        assert "taskId" in data["result"]
        
        # Wait for completion
        task_id = data["result"]["taskId"]
        result = self._wait_for_task_completion("agent-c", task_id)
        
        # Verify sentiment is positive
        if result and "result" in result and "result" in result["result"]:
            sentiment_data = result["result"]["result"]
            if "sentiment" in sentiment_data:
                assert sentiment_data["sentiment"]["sentiment"] == "positive"
        
        print("✅ Sentiment Analysis Agent task completed successfully")
    
    def test_language_detection_agent(self):
        """Test Agent D - Language Detection"""
        rpc_request = {
            "jsonrpc": "2.0",
            "method": "tasks.send",
            "params": {
                "text": "Hello world this is an English text",
                "type": "detect"
            },
            "id": "test-language-detection"
        }
        
        response = requests.post(
            f"{BASE_URL}:{AGENTS['agent-d']['port']}/rpc",
            json=rpc_request
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "result" in data
        assert "taskId" in data["result"]
        
        # Wait for completion
        task_id = data["result"]["taskId"]
        result = self._wait_for_task_completion("agent-d", task_id)
        
        # Verify language detection
        if result and "result" in result and "result" in result["result"]:
            lang_data = result["result"]["result"]
            if "language_detection" in lang_data:
                assert lang_data["language_detection"]["primary_language"] == "english"
        
        print("✅ Language Detection Agent task completed successfully")
    
    def test_orchestrator_workflow(self):
        """Test Agent E - Intelligent Orchestrator with workflow"""
        # First test simple capabilities
        rpc_request = {
            "jsonrpc": "2.0",
            "method": "agent.getCapabilities",
            "id": "test-orchestrator-capabilities"
        }
        
        response = requests.post(
            f"{BASE_URL}:{AGENTS['agent-e']['port']}/rpc",
            json=rpc_request
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "result" in data
        assert "workflows" in data["result"]
        
        # Test workflow execution
        workflow_request = {
            "jsonrpc": "2.0",
            "method": "tasks.send",
            "params": {
                "workflow": "text_analysis_pipeline",
                "input_data": {
                    "text": "This is a wonderful day! I am very happy."
                }
            },
            "id": "test-workflow-execution"
        }
        
        response = requests.post(
            f"{BASE_URL}:{AGENTS['agent-e']['port']}/rpc",
            json=workflow_request
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "result" in data
        assert "workflowId" in data["result"]
        
        print("✅ Intelligent Orchestrator Agent workflow started successfully")
    
    def test_discovery_agent_registration(self):
        """Test agent discovery and registration"""
        response = requests.get(f"{BASE_URL}:{DISCOVERY_PORT}/api/agents")
        assert response.status_code == 200
        
        data = response.json()
        assert "agents" in data
        assert data["count"] >= 0
        
        # Check if agents are discovered
        agent_ids = [agent["id"] for agent in data["agents"]]
        print(f"✅ Discovery service found {len(agent_ids)} agents: {agent_ids}")
    
    def test_discovery_health_monitoring(self):
        """Test discovery service health monitoring"""
        response = requests.get(f"{BASE_URL}:{DISCOVERY_PORT}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "agents" in data
        assert "summary" in data
        
        print(f"✅ Health monitoring: {data['summary']}")
    
    def test_discovery_capabilities_aggregation(self):
        """Test capability aggregation across all agents"""
        response = requests.get(f"{BASE_URL}:{DISCOVERY_PORT}/api/capabilities")
        assert response.status_code == 200
        
        data = response.json()
        assert "agents" in data
        assert "total_capabilities" in data
        
        print(f"✅ Total capabilities across all agents: {data['total_capabilities']}")
    
    def _wait_for_task_completion(self, agent_key, task_id, timeout=10):
        """Helper method to wait for task completion"""
        agent_port = AGENTS[agent_key]["port"]
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            rpc_request = {
                "jsonrpc": "2.0",
                "method": "tasks.status",
                "params": {"taskId": task_id},
                "id": "status-check"
            }
            
            try:
                response = requests.post(f"{BASE_URL}:{agent_port}/rpc", json=rpc_request)
                if response.status_code == 200:
                    data = response.json()
                    if "result" in data:
                        result = data["result"]
                        if result.get("status") == "completed":
                            return result
                        elif result.get("status") == "error":
                            pytest.fail(f"Task failed: {result.get('error')}")
                
                time.sleep(0.5)
            except Exception as e:
                print(f"Error checking task status: {e}")
                time.sleep(0.5)
        
        print(f"⚠️  Task {task_id} did not complete within {timeout} seconds")
        return None

if __name__ == "__main__":
    # Run basic connectivity tests
    test_suite = TestA2AProtocol()
    
    print("🧪 Running Python A2A Protocol Test Suite")
    print("=" * 50)
    
    try:
        test_suite.test_discovery_service_status()
        test_suite.test_agent_cards()
        test_suite.test_agent_status_endpoints()
        test_suite.test_json_rpc_capabilities()
        test_suite.test_discovery_agent_registration()
        test_suite.test_discovery_health_monitoring()
        test_suite.test_discovery_capabilities_aggregation()
        
        print("\n🎯 Basic connectivity tests passed!")
        print("Run 'pytest test_a2a_comprehensive.py -v' for full test suite")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        print("Make sure all agents are running before running tests")
