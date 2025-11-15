# test_reasoner.py
"""
Comprehensive test suite for Pure Reasoner Agent
Tests: conflicts, enforceability, vague terms, expired policies
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

from agents.text_parser.parser import TextParser
from agents.reasoner.reasoner import Reasoner
from dotenv import load_dotenv
import json

load_dotenv()

def print_result(title, result):
    """Helper to print results nicely"""
    print(f"\n{'='*80}")
    print(f"{title}")
    print(f"{'='*80}")
    print(f"Decision: {result['decision'].upper()}")
    print(f"Confidence: {result['confidence']:.0%}")
    print(f"Risk: {result['risk_level'].upper()}")
    print(f"Issues: {len(result['issues'])}")
    
    if result['issues']:
        print(f"\nIssues Found:")
        for i, issue in enumerate(result['issues'], 1):
            print(f"  {i}. [{issue['severity'].upper()}] {issue['message']}")
            if issue.get('suggestion'):
                print(f"     → Suggestion: {issue['suggestion']}")
    
    if result['recommendations']:
        print(f"\nRecommendations:")
        for i, rec in enumerate(result['recommendations'], 1):
            print(f"  {i}. {rec}")
    
    print(f"\nReasoning: {result['reasoning']}")

def test_good_policy():
    """Test 1: Well-formed policy - should APPROVE"""
    print("\n" + "="*80)
    print("TEST 1: GOOD POLICY")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Users can read the document 'report.pdf' until December 31, 2025."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] == 'approve', "Should approve good policy"
    assert result['confidence'] >= 0.8, "Should have high confidence"

def test_vague_policy():
    """Test 2: Vague terms - should NEEDS_INPUT"""
    print("\n" + "="*80)
    print("TEST 2: VAGUE POLICY")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Everyone can do things with the data for a while."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] in ['needs_input', 'reject'], "Should reject or need input"
    assert len(result['issues']) > 0, "Should have issues"

def test_action_conflict():
    """Test 3: Action conflict - should NEEDS_INPUT or REJECT"""
    print("\n" + "="*80)
    print("TEST 3: ACTION CONFLICT")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Users can read the document but cannot read the document."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] in ['needs_input', 'reject'], "Should detect conflict"
    assert any('conflict' in i['category'].lower() for i in result['issues']), "Should flag conflict"

def test_expired_policy():
    """Test 4: Expired policy - should REJECT or NEEDS_INPUT"""
    print("\n" + "="*80)
    print("TEST 4: EXPIRED POLICY")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Users can read the document until January 1, 2020."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] in ['needs_input', 'reject'], "Should flag expired"

def test_unenforceable_mental():
    """Test 5: Unenforceable mental action - should REJECT or NEEDS_INPUT"""
    print("\n" + "="*80)
    print("TEST 5: UNENFORCEABLE MENTAL ACTION")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Users cannot think about the confidential data."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] in ['needs_input', 'reject'], "Should flag unenforceable"
    assert any('unenforceable' in i['category'].lower() for i in result['issues']), "Should detect unenforceable"

def test_unenforceable_technical():
    """Test 6: Unenforceable technical restriction - should NEEDS_INPUT"""
    print("\n" + "="*80)
    print("TEST 6: UNENFORCEABLE TECHNICAL")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Users cannot take screenshots of the document."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] in ['needs_input', 'reject'], "Should flag technical enforceability"

def test_purpose_conflict():
    """Test 7: Purpose conflict - should NEEDS_INPUT"""
    print("\n" + "="*80)
    print("TEST 7: PURPOSE CONFLICT")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Users can read the data for research purposes but cannot read for research purposes."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] in ['needs_input', 'reject'], "Should detect purpose conflict"

def test_location_conflict():
    """Test 8: Location conflict - should NEEDS_INPUT"""
    print("\n" + "="*80)
    print("TEST 8: LOCATION CONFLICT")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Users in Germany can access the data but users in Germany cannot access the data."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] in ['needs_input', 'reject'], "Should detect location conflict"

def test_vague_obligation():
    """Test 9: Vague obligation - should NEEDS_INPUT"""
    print("\n" + "="*80)
    print("TEST 9: VAGUE OBLIGATION")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = "Users must use the data responsibly and ethically."
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text}")
    print_result("Result", result)
    
    assert result['decision'] in ['needs_input', 'reject'], "Should flag vague terms"

def test_complex_good_policy():
    """Test 10: Complex but good policy - should APPROVE"""
    print("\n" + "="*80)
    print("TEST 10: COMPLEX GOOD POLICY")
    print("="*80)
    
    parser = TextParser(model="groq:llama-3.3-70b-versatile")
    reasoner = Reasoner(model="groq:llama-3.3-70b-versatile")
    
    text = """Registered researchers can read and download the dataset 'CulturalImages2024' 
    for non-commercial research purposes only, within the EU, until December 31, 2025. 
    Users must attribute the source and delete all copies after 30 days."""
    
    parsed = parser.parse(text)
    result = reasoner.reason(parsed, text)
    
    print(f"\nInput: {text[:100]}...")
    print_result("Result", result)
    
    assert result['decision'] == 'approve', "Should approve well-specified complex policy"
    assert result['confidence'] >= 0.7, "Should have reasonable confidence"

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("REASONER AGENT TEST SUITE")
    print("Testing: conflicts, enforceability, vague terms, expired policies")
    print("="*80)
    
    tests = [
        ("Good Policy", test_good_policy),
        ("Vague Policy", test_vague_policy),
        ("Action Conflict", test_action_conflict),
        ("Expired Policy", test_expired_policy),
        ("Unenforceable Mental", test_unenforceable_mental),
        ("Unenforceable Technical", test_unenforceable_technical),
        ("Purpose Conflict", test_purpose_conflict),
        ("Location Conflict", test_location_conflict),
        ("Vague Obligation", test_vague_obligation),
        ("Complex Good Policy", test_complex_good_policy)
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            test_func()
            passed += 1
            print(f"\n{test_name} PASSED")
        except AssertionError as e:
            failed += 1
            print(f"\n{test_name} FAILED: {e}")
        except Exception as e:
            failed += 1
            print(f"\n{test_name} ERROR: {e}")
    
    print("\n" + "="*80)
    print(f"TEST RESULTS: {passed} passed, {failed} failed")
    print("="*80)

if __name__ == "__main__":
    main()