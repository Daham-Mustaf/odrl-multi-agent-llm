from agents.validator.shacl_validator import ODRLValidationTool

# Test with invalid ODRL
test_odrl_turtle = """
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix ex: <http://example.com/> .

ex:policy1 a odrl:Policy ;
    odrl:permission [
        a odrl:Permission ;
        odrl:action odrl:read ;
        odrl:target ex:document ;
        odrl:constraint [
            a odrl:Constraint ;
            odrl:leftOperand odrl:dateTime ;
            odrl:operator odrl:invalidOp ;
            odrl:rightOperand "2025-12-31" ;
        ] ;
    ] .
"""

tool = ODRLValidationTool()
report = tool.validate_kg(
    user_text="Test policy",
    kg_turtle=test_odrl_turtle
)

print(f"Valid: {report.is_valid}")
print(f"Issues: {len(report.issues)}")
for issue in report.issues:
    print(f"  - {issue.issue_type}: {issue.constraint_violated}")