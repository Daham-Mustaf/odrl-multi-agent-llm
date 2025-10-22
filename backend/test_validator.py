from agents.generator.generator import Generator
from agents.validator.validator import SHACLValidator
import json

# Create a sample ODRL policy
sample_policy = {
    "@context": "http://www.w3.org/ns/odrl.jsonld",
    "@type": "Set",
    "uid": "http://example.com/policy:001",
    "permission": [
        {
            "target": "http://example.com/asset:001",
            "action": "http://www.w3.org/ns/odrl/2/read"
        }
    ]
}

# Initialize validator
validator = SHACLValidator()

# Validate
result = validator.validate(sample_policy)

# Print results
print("\n" + "="*60)
print("VALIDATION RESULTS")
print("="*60)
print(f"\n✓ Is Valid: {result['is_valid']}")
print(f"✓ SHACL Conformance: {result['shacl_valid']}")
print(f"\n❌ Errors ({len(result['errors'])}):")
for err in result['errors']:
    print(f"  - [{err['severity']}] {err['message']}")

print(f"\n⚠️  Warnings ({len(result['warnings'])}):")
for warn in result['warnings']:
    print(f"  - {warn['message']}")

print(f"\n💡 Recommendations ({len(result['recommendations'])}):")
for rec in result['recommendations']:
    print(f"  - {rec}")

if result.get('shacl_report'):
    print(f"\n📋 SHACL Report:\n{result['shacl_report']}")