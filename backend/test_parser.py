from agents.text_parser.parser import TextParser

def test_parser():
    parser = TextParser(model="groq/llama-3.3-70b", temperature=0.1)
    
    test_cases = [
        "Users can stream Netflix movies for 30 days in Germany but cannot download",
        "Netflix offers subscribers streaming access",
        "Between Acme Corp and User123: download allowed for research only"
    ]
    
    for text in test_cases:
        print("\n" + "="*80)
        print(f"INPUT: {text}")
        print("="*80)
        
        result = parser.parse(text)
        
        print(f"\nPolicy Type: {result['policy_type']}")
        print(f"Assigner: {result['assigner']}")
        print(f"Assignee: {result['assignee']}")
        print(f"Assets: {len(result['assets'])}")
        print(f"Actions: {len(result['actions'])}")
        print(f"Constraints: {len(result['constraints'])}")
        print(f"Issues: {len(result['issues'])}")
        
        print("\n--- ISSUES ---")
        for issue in result['issues']:
            print(f"  [{issue['severity']}] {issue['description']}")

if __name__ == "__main__":
    test_parser()