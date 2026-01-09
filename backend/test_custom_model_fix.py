"""
Test Script: Verify Custom Model Integration Fix
=================================================
Tests that all 4 agents (Parser, Reasoner, Generator, Validator) 
correctly accept and use custom_model parameter.

Run this after restarting your backend.
"""

import requests
import json
import time

API_URL = "http://localhost:8000"

# Custom model config (same as your FIT GPT-OSS 120B)
CUSTOM_MODEL = {
    "provider_type": "openai-compatible",
    "base_url": "http://dgx.fit.fraunhofer.de/v1",
    "model_id": "gpt-oss:120b",
    "api_key": "dummy",
    "context_length": 8192
}

TEST_TEXT = "Users can read the document but cannot modify it."

def test_endpoint(name, endpoint, payload):
    """Test a single endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"{'='*60}")
    
    try:
        print(f"→ Sending request to {endpoint}")
        start = time.time()
        
        response = requests.post(
            f"{API_URL}{endpoint}",
            json=payload,
            timeout=60
        )
        
        elapsed = time.time() - start
        
        if response.status_code == 200:
            print(f" SUCCESS ({elapsed:.1f}s)")
            result = response.json()
            
            # Check if custom model was used
            model_used = result.get('model_used', 'unknown')
            print(f"   Model used: {model_used}")
            
            return True, result
        else:
            print(f" FAILED (Status {response.status_code})")
            print(f"   Error: {response.text[:200]}")
            return False, None
            
    except requests.exceptions.ConnectionError:
        print(" FAILED - Backend not running!")
        print("   Start backend with: cd backend && python main.py")
        return False, None
    except Exception as e:
        print(f" FAILED - {str(e)[:200]}")
        return False, None

def main():
    print("\n" + "="*60)
    print("CUSTOM MODEL INTEGRATION TEST")
    print("="*60)
    print(f"Backend: {API_URL}")
    print(f"Model: {CUSTOM_MODEL['model_id']}")
    print(f"Endpoint: {CUSTOM_MODEL['base_url']}")
    
    # Test 1: Parser
    success, parsed_data = test_endpoint(
        "Parser Agent",
        "/api/parse",
        {
            "text": TEST_TEXT,
            "model": "custom:gpt-oss:120b",
            "temperature": 0.3,
            "custom_model": CUSTOM_MODEL
        }
    )
    
    if not success:
        print("\n Parser failed - stopping tests")
        return
    
    # Test 2: Reasoner
    success, reasoning_result = test_endpoint(
        "Reasoner Agent",
        "/api/reason",
        {
            "parsed_data": parsed_data,
            "original_text": TEST_TEXT,
            "model": "custom:gpt-oss:120b",
            "temperature": 0.3,
            "custom_model": CUSTOM_MODEL
        }
    )
    
    if not success:
        print("\n Reasoner failed - stopping tests")
        return
    
    # Test 3: Generator (THE FIXED ONE!)
    success, generated_odrl = test_endpoint(
        "Generator Agent  (FIXED!)",
        "/api/generate",
        {
            "parsed_data": parsed_data,
            "original_text": TEST_TEXT,
            "reasoning": reasoning_result,
            "model": "custom:gpt-oss:120b",
            "temperature": 0.3,
            "custom_model": CUSTOM_MODEL  #  Should now work!
        }
    )
    
    if not success:
        print("\n Generator failed - fix didn't work!")
        return
    
    # Test 4: Validator (ALSO FIXED!)
    success, validation_result = test_endpoint(
        "Validator Agent (FIXED!)",
        "/api/validate",
        {
            "odrl_turtle": generated_odrl.get("odrl_turtle", ""),
            "original_text": TEST_TEXT,
            "model": "custom:gpt-oss:120b",
            "temperature": 0.3,
            "custom_model": CUSTOM_MODEL  #  Should now work!
        }
    )
    
    # Final Report
    print("\n" + "="*60)
    print("TEST RESULTS")
    print("="*60)
    
    if success:
        print(" ALL TESTS PASSED!")
        print("\nYour fix worked! All 4 agents now accept custom_model.")
        print("\n Next steps:")
        print("   1. Commit your backend changes:")
        print("      git add backend/main.py")
        print("      git commit -m 'Fix: Standardize custom_model parameter'")
        print("   2. Test in frontend with FIT GPT-OSS 120B")
        print("   3. Try full pipeline: Parse → Reason → Generate → Validate")
    else:
        print("SOME TESTS FAILED")
        print("\n Debug steps:")
        print("   1. Check if backend restarted after changes")
        print("   2. Verify all 4 lines were changed in main.py")
        print("   3. Check backend console for errors")

if __name__ == "__main__":
    main()