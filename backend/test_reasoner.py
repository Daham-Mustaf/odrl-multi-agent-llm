from agents.text_parser.parser import TextParser
from agents.reasoner.reasoner import Reasoner

# Initialize agents
parser = TextParser()
reasoner = Reasoner()

# Test text
test_text = """
Users can read and print the document but cannot modify or distribute it. 
The policy expires on December 31, 2025.
Students may view the content for educational purposes only.
"""

# Step 1: Parse
parsed = parser.parse(test_text)

# Step 2: Reason
reasoning_result = reasoner.reason(parsed)

# Print results
print("\n" + "="*60)
print("REASONING RESULTS")
print("="*60)

print(f"\n📋 Policy Type: {reasoning_result['policy_type']}")
print(f"⚠️  Risk Level: {reasoning_result['risk_level']}")
print(f"\n📝 Analysis:\n{reasoning_result['analysis']}")

print(f"\n🔍 Inferred Permissions ({len(reasoning_result['inferred_permissions'])}):")
for ip in reasoning_result['inferred_permissions']:
    print(f"  - {ip['action']} (from {ip['inferred_from']}): {ip['reason']}")

print(f"\n⚠️  Conflicts ({len(reasoning_result['conflicts_detected'])}):")
for c in reasoning_result['conflicts_detected']:
    print(f"  - [{c['severity']}] {c['action']}: {c['message']}")

print(f"\n💡 Recommendations ({len(reasoning_result['recommendations'])}):")
for r in reasoning_result['recommendations']:
    print(f"  - [{r['priority']}] {r['type']}: {r['message']}")