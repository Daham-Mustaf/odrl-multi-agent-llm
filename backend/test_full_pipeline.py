#!/usr/bin/env python3
"""
Full Pipeline Test - From Text to Valid ODRL
Tests all 4 agents in sequence
"""
import requests
import json
import time
from datetime import datetime

API_BASE = "http://localhost:8000/api"

# Test cases
TEST_CASES = [
    {
        "name": "Simple Document Policy",
        "text": "Users can read and print the document but cannot modify or distribute it.",
        "expected": {
            "permissions": ["read", "print"],
            "prohibitions": ["modify", "distribute"]
        }
    },
    {
        "name": "Academic Dataset",
        "text": "Researchers can download and analyze the dataset for non-commercial purposes. Attribution is required. Commercial use is prohibited.",
        "expected": {
            "permissions": ["download", "analyze"],
            "prohibitions": ["commercial use"],
            "constraints": ["attribution"]
        }
    },
    {
        "name": "Time-Limited Access",
        "text": "Users can access the content until December 31, 2025. After that, access is denied.",
        "expected": {
            "permissions": ["access"],
            "constraints": ["until 2025-12-31"]
        }
    }
]

def test_pipeline(test_case, model="ollama:llama3.1:8b", temperature=0.3):
    """Test full pipeline for one case"""
    print(f"\n{'='*60}")
    print(f"🧪 Testing: {test_case['name']}")
    print(f"{'='*60}")
    print(f"Input: {test_case['text'][:80]}...")
    
    results = {
        "test_name": test_case['name'],
        "input_text": test_case['text'],
        "model": model,
        "temperature": temperature,
        "timestamp": datetime.now().isoformat(),
        "stages": {}
    }
    
    # Stage 1: Parser
    print("\n📝 Stage 1: Parser")
    start = time.time()
    try:
        response = requests.post(
            f"{API_BASE}/parse",
            json={
                "text": test_case['text'],
                "model": model,
                "temperature": temperature
            },
            timeout=30
        )
        parse_time = time.time() - start
        
        if response.status_code == 200:
            parsed = response.json()
            print(f"   ✅ Success ({parse_time:.2f}s)")
            print(f"   📊 Permissions: {len(parsed.get('permissions', []))}")
            print(f"   📊 Prohibitions: {len(parsed.get('prohibitions', []))}")
            print(f"   📊 Constraints: {len(parsed.get('constraints', []))}")
            
            results["stages"]["parser"] = {
                "success": True,
                "time": parse_time,
                "data": parsed
            }
        else:
            print(f"   ❌ Failed: {response.status_code}")
            print(f"   Error: {response.text}")
            results["stages"]["parser"] = {
                "success": False,
                "error": response.text
            }
            return results
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        results["stages"]["parser"] = {
            "success": False,
            "error": str(e)
        }
        return results
    
    # Stage 2: Reasoner
    print("\n🧠 Stage 2: Reasoner")
    start = time.time()
    try:
        response = requests.post(
            f"{API_BASE}/reason",
            json={
                "parsed_data": parsed,
                "model": model,
                "temperature": temperature
            },
            timeout=30
        )
        reason_time = time.time() - start
        
        if response.status_code == 200:
            reasoned = response.json()
            print(f"   ✅ Success ({reason_time:.2f}s)")
            
            reasoning_result = reasoned.get('reasoning_result', {})
            print(f"   📊 Policy Type: {reasoning_result.get('policy_type', 'N/A')}")
            print(f"   📊 Conflicts: {len(reasoning_result.get('conflict_detection', []))}")
            
            results["stages"]["reasoner"] = {
                "success": True,
                "time": reason_time,
                "data": reasoned
            }
        else:
            print(f"   ❌ Failed: {response.status_code}")
            results["stages"]["reasoner"] = {
                "success": False,
                "error": response.text
            }
            return results
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        results["stages"]["reasoner"] = {
            "success": False,
            "error": str(e)
        }
        return results
    
    # Stage 3: Generator
    print("\n⚙️  Stage 3: Generator")
    start = time.time()
    try:
        response = requests.post(
            f"{API_BASE}/generate",
            json={
                "reasoning_result": reasoned,
                "model": model,
                "temperature": temperature
            },
            timeout=30
        )
        gen_time = time.time() - start
        
        if response.status_code == 200:
            generated = response.json()
            odrl_policy = generated.get('odrl_policy', {})
            print(f"   ✅ Success ({gen_time:.2f}s)")
            print(f"   📊 Policy Type: {odrl_policy.get('@type', 'N/A')}")
            print(f"   📊 Has UID: {'uid' in odrl_policy}")
            print(f"   📊 Has Context: {'@context' in odrl_policy}")
            
            results["stages"]["generator"] = {
                "success": True,
                "time": gen_time,
                "data": generated
            }
        else:
            print(f"   ❌ Failed: {response.status_code}")
            results["stages"]["generator"] = {
                "success": False,
                "error": response.text
            }
            return results
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        results["stages"]["generator"] = {
            "success": False,
            "error": str(e)
        }
        return results
    
    # Stage 4: Validator
    print("\n🛡️  Stage 4: Validator")
    start = time.time()
    try:
        response = requests.post(
            f"{API_BASE}/validate",
            json={
                "odrl_policy": odrl_policy,
                "model": model,
                "temperature": temperature
            },
            timeout=30
        )
        val_time = time.time() - start
        
        if response.status_code == 200:
            validated = response.json()
            is_valid = validated.get('is_valid', False)
            
            print(f"   {'✅' if is_valid else '❌'} {('Valid' if is_valid else 'Invalid')} ({val_time:.2f}s)")
            print(f"   📊 SHACL Valid: {validated.get('shacl_valid', False)}")
            print(f"   📊 Errors: {len(validated.get('errors', []))}")
            print(f"   📊 Warnings: {len(validated.get('warnings', []))}")
            
            if validated.get('errors'):
                print("\n   ⚠️  Errors found:")
                for err in validated['errors'][:3]:
                    error_msg = err if isinstance(err, str) else err.get('message', 'Unknown error')
                    print(f"      • {error_msg}")
            
            results["stages"]["validator"] = {
                "success": True,
                "time": val_time,
                "data": validated
            }
        else:
            print(f"   ❌ Failed: {response.status_code}")
            results["stages"]["validator"] = {
                "success": False,
                "error": response.text
            }
            return results
            
    except Exception as e:
        print(f"   ❌ Exception: {e}")
        results["stages"]["validator"] = {
            "success": False,
            "error": str(e)
        }
        return results
    
    # Summary
    total_time = sum(stage.get('time', 0) for stage in results['stages'].values() if 'time' in stage)
    all_success = all(stage.get('success', False) for stage in results['stages'].values())
    
    print(f"\n{'='*60}")
    print(f"{'✅ ALL STAGES PASSED' if all_success else '❌ SOME STAGES FAILED'}")
    print(f"Total Time: {total_time:.2f}s")
    print(f"{'='*60}")
    
    return results


def main():
    print("🚀 ODRL Demo - Full Pipeline Test")
    print("="*60)
    
    # Check if backend is running
    try:
        response = requests.get(f"{API_BASE}/../health", timeout=5)
        print("✅ Backend is running\n")
    except:
        print("❌ Backend not running!")
        print("Start it with: uvicorn api.main:app --reload")
        return
    
    # Run tests
    all_results = []
    
    for test_case in TEST_CASES:
        result = test_pipeline(test_case)
        all_results.append(result)
        time.sleep(1)  # Small delay between tests
    
    # Save results
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_file = f"test_results_{timestamp}.json"
    
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2)
    
    print(f"\n💾 Results saved to: {results_file}")
    
    # Summary
    print(f"\n{'='*60}")
    print("📊 SUMMARY")
    print(f"{'='*60}")
    
    successful = sum(1 for r in all_results if all(s.get('success', False) for s in r['stages'].values()))
    print(f"Tests Run: {len(all_results)}")
    print(f"Successful: {successful}")
    print(f"Failed: {len(all_results) - successful}")
    
    avg_times = {}
    for stage in ['parser', 'reasoner', 'generator', 'validator']:
        times = [r['stages'][stage].get('time', 0) for r in all_results if stage in r['stages']]
        if times:
            avg_times[stage] = sum(times) / len(times)
    
    print(f"\n⏱️  Average Times:")
    for stage, avg_time in avg_times.items():
        print(f"   {stage.capitalize()}: {avg_time:.2f}s")
    
    print(f"\n{'='*60}")


if __name__ == "__main__":
    main()