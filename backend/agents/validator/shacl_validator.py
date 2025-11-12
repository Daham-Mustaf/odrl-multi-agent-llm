# odrl_validation_tool.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Dict, Any, Set, Optional
from enum import Enum
import rdflib
from pyshacl import validate

# --------------------------
# Core Data Structures
# --------------------------

@dataclass
class ValidationIssue:
    """Structured validation issue without suggestions."""
    issue_type: str
    focus_node: str
    property_path: str
    actual_value: str
    constraint_violated: str
    severity: str = "Violation"

@dataclass
class ValidationReport:
    """Complete validation report for LLM feedback."""
    user_text: str
    generated_kg: str
    is_valid: bool
    issues: List[ValidationIssue]
    
    def to_learning_prompt(self) -> str:
        """Generate learning-focused prompt without suggestions."""
        lines = []
        
        # Header
        lines.append("# ODRL Knowledge Graph Validation Report")
        lines.append("")
        
        # Input Section
        lines.append("## Original User Request")
        lines.append(f'"{self.user_text}"')
        lines.append("")
        
        lines.append("## Generated Knowledge Graph")
        lines.append("```turtle")
        lines.append(self.generated_kg.strip())
        lines.append("```")
        lines.append("")
        
        # Validation Results
        lines.append("## Validation Results")
        if self.is_valid:
            lines.append("**Status**: VALID - No issues detected")
            lines.append("")
            lines.append("The generated knowledge graph conforms to all ODRL validation rules.")
        else:
            lines.append(f"**Status**: INVALID - {len(self.issues)} issue(s) detected")
            lines.append("")
            
            # Group issues by type for better learning
            issue_groups = self._group_issues_by_type()
            
            for issue_type, type_issues in issue_groups.items():
                lines.append(f"### {issue_type}")
                for i, issue in enumerate(type_issues, 1):
                    lines.append(f"{i}. **Node**: `{issue.focus_node}`")
                    lines.append(f"   **Property**: `{issue.property_path}`")
                    lines.append(f"   **Current Value**: `{issue.actual_value}`")
                    lines.append(f"   **Constraint Violated**: {issue.constraint_violated}")
                    if issue.severity != "Violation":
                        lines.append(f"   **Severity**: {issue.severity}")
                    lines.append("")
            
            # Learning Section
            lines.append("## Learning Notes")
            lines.append("The above issues indicate areas where the knowledge graph doesn't conform to ODRL standards.")
            lines.append("Review the constraint violations to understand what corrections are needed.")
        
        return "\n".join(lines)
    
    def _group_issues_by_type(self) -> Dict[str, List[ValidationIssue]]:
        """Group issues by type for better organization."""
        groups = {}
        for issue in self.issues:
            if issue.issue_type not in groups:
                groups[issue.issue_type] = []
            groups[issue.issue_type].append(issue)
        return groups

# --------------------------
# Constraint System Classes
# --------------------------

class OperatorType(Enum):
    """ODRL Core Constraint Operators from http://www.w3.org/ns/odrl/2/#constraintRelationalOperators"""
    EQ = "eq"           # equal to
    GT = "gt"           # greater than  
    GTEQ = "gteq"       # greater than or equal to
    LT = "lt"           # less than
    LTEQ = "lteq"       # less than or equal to
    NEQ = "neq"         # not equal to
    IS_A = "isA"        # is a member of the class
    HAS_PART = "hasPart" # has as a part/component
    IS_PART_OF = "isPartOf"  # is a part/component of
    IS_ALL_OF = "isAllOf"    # is all of (set equality)
    IS_ANY_OF = "isAnyOf"    # is any of (set intersection)
    IS_NONE_OF = "isNoneOf"  # is none of (set disjoint)

@dataclass
class LeftOperandInfo:
    """Information about ODRL left operands"""
    uri: str
    label: str
    definition: str
    compatible_operators: Set[OperatorType]
    expected_datatype: Optional[str] = None

class ODRLLeftOperands:
    """Registry of ODRL left operands with their properties"""
    
    OPERANDS = {
        "dateTime": LeftOperandInfo(
            uri="http://www.w3.org/ns/odrl/2/dateTime",
            label="Datetime",
            definition="The date (and optional time and timezone) of exercising the action of the Rule",
            compatible_operators={OperatorType.LT, OperatorType.LTEQ, OperatorType.GT, OperatorType.GTEQ, OperatorType.EQ},
            expected_datatype="xsd:date"
        ),
        "count": LeftOperandInfo(
            uri="http://www.w3.org/ns/odrl/2/count",
            label="Count",
            definition="Numeric count of executions of the action of the Rule",
            compatible_operators={OperatorType.LT, OperatorType.LTEQ, OperatorType.GT, OperatorType.GTEQ, OperatorType.EQ},
            expected_datatype="xsd:integer"
        ),
        "elapsedTime": LeftOperandInfo(
            uri="http://www.w3.org/ns/odrl/2/elapsedTime",
            label="Elapsed Time",
            definition="A continuous elapsed time period which may be used for exercising of the action of the Rule",
            compatible_operators={OperatorType.EQ, OperatorType.LT, OperatorType.LTEQ},
            expected_datatype="xsd:duration"
        ),
        "payAmount": LeftOperandInfo(
            uri="http://www.w3.org/ns/odrl/2/payAmount",
            label="Payment Amount",
            definition="The amount of a financial payment",
            compatible_operators={OperatorType.EQ, OperatorType.LT, OperatorType.LTEQ, OperatorType.GT, OperatorType.GTEQ},
            expected_datatype="xsd:decimal"
        ),
        "percentage": LeftOperandInfo(
            uri="http://www.w3.org/ns/odrl/2/percentage",
            label="Asset Percentage",
            definition="A percentage amount of the target Asset relevant for exercising the action of the Rule",
            compatible_operators={OperatorType.EQ, OperatorType.LT, OperatorType.LTEQ, OperatorType.GT, OperatorType.GTEQ},
            expected_datatype="xsd:decimal"
        ),
        "spatial": LeftOperandInfo(
            uri="http://www.w3.org/ns/odrl/2/spatial",
            label="Geospatial Named Area",
            definition="A named and identified geospatial area with defined borders",
            compatible_operators={OperatorType.EQ, OperatorType.IS_A, OperatorType.IS_ANY_OF, OperatorType.IS_NONE_OF}
        ),
        "purpose": LeftOperandInfo(
            uri="http://www.w3.org/ns/odrl/2/purpose",
            label="Purpose",
            definition="A defined purpose for exercising the action of the Rule",
            compatible_operators={OperatorType.EQ, OperatorType.IS_A, OperatorType.IS_ANY_OF, OperatorType.IS_NONE_OF}
        ),
        "recipient": LeftOperandInfo(
            uri="http://www.w3.org/ns/odrl/2/recipient",
            label="Recipient",
            definition="The party receiving the result/outcome of exercising the action of the Rule",
            compatible_operators={OperatorType.EQ, OperatorType.IS_A, OperatorType.IS_ANY_OF, OperatorType.IS_NONE_OF}
        )
    }
    
    @classmethod
    def get_operand(cls, name: str) -> Optional[LeftOperandInfo]:
        return cls.OPERANDS.get(name)
    
    @classmethod
    def list_operands(cls) -> List[str]:
        return list(cls.OPERANDS.keys())


class BaseValidator(ABC):
    """Abstract base class for ODRL validators."""
    
    @abstractmethod
    def get_shape_ttl(self) -> str:
        pass
    
    @abstractmethod
    def process_violations(self, violations: List[Dict[str, Any]]) -> List[ValidationIssue]:
        pass

class ConstraintStructureValidator(BaseValidator):
    """Validates basic constraint structure."""
    
    def get_shape_ttl(self) -> str:
        left_operands = " ".join([f"odrl:{op}" for op in ODRLLeftOperands.list_operands()])
        operators = " ".join([f"odrl:{op.value}" for op in OperatorType])
        
        return f"""
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<ConstraintStructureShape> a sh:NodeShape ;
    sh:targetClass odrl:Constraint ;
    sh:not [
        sh:or (
            [ sh:property [ sh:path odrl:and ; sh:minCount 1 ] ]
            [ sh:property [ sh:path odrl:or ; sh:minCount 1 ] ]
            [ sh:property [ sh:path odrl:xone ; sh:minCount 1 ] ]
            [ sh:property [ sh:path odrl:andSequence ; sh:minCount 1 ] ]
        )
    ] ;
    
    sh:property [
        sh:path odrl:leftOperand ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:in ( {left_operands} ) ;
        sh:message "Invalid or missing left operand" ;
    ] ;
    
    sh:property [
        sh:path odrl:operator ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:in ( {operators} ) ;
        sh:message "Invalid or missing operator" ;
    ] ;
    
    sh:xone (
        [ sh:property [ sh:path odrl:rightOperand ; sh:minCount 1 ] ]
        [ sh:property [ sh:path odrl:rightOperandReference ; sh:minCount 1 ] ]
    ) ;
    sh:message "Missing right operand or reference" .
"""
    
    def process_violations(self, violations: List[Dict[str, Any]]) -> List[ValidationIssue]:
        issues = []
        for violation in violations:
            constraint_type = violation.get("source_constraint_component", "")
            
            if "leftOperand" in str(violation.get("result_path", "")):
                issue_type = "Invalid Left Operand"
                actual_operand = self._extract_operand_from_value(violation.get("value", ""))
                constraint_violated = f"Left operand '{actual_operand}' is not in ODRL Core vocabulary. Valid operands: dateTime, count, elapsedTime, payAmount, percentage, spatial, purpose, recipient"
            elif "operator" in str(violation.get("result_path", "")):
                issue_type = "Invalid Operator"
                actual_op = self._extract_operator_from_value(violation.get("value", ""))
                constraint_violated = f"Operator '{actual_op}' is not in ODRL Core constraintRelationalOperators collection. Valid operators: eq, gt, gteq, lt, lteq, neq, isA, hasPart, isPartOf, isAllOf, isAnyOf, isNoneOf"
            elif "XoneConstraintComponent" in constraint_type:
                issue_type = "Missing Right Operand"
                constraint_violated = "Must have either rightOperand or rightOperandReference"
            else:
                issue_type = "Constraint Structure Error"
                constraint_violated = violation.get("message", "Unknown constraint violation")
            
            issues.append(ValidationIssue(
                issue_type=issue_type,
                focus_node=str(violation.get("focus_node", "")),
                property_path=str(violation.get("result_path", "")),
                actual_value=str(violation.get("value", "not specified")),
                constraint_violated=constraint_violated
            ))
        
        return issues
    
    def _extract_operand_from_value(self, uri_value: str) -> str:
        """Extract operand name from URI value."""
        if "odrl/2/" in uri_value:
            return uri_value.split("odrl/2/")[-1]
        elif ":" in uri_value:
            return uri_value.split(":")[-1]
        return uri_value
    
    def _extract_operator_from_value(self, uri_value: str) -> str:
        """Extract operator name from URI value."""
        return self._extract_operand_from_value(uri_value)  # Same logic

class ConstraintCompatibilityValidator(BaseValidator):
    """Validates operand-operator compatibility."""
    
    def get_shape_ttl(self) -> str:
        rules = []
        for operand_name, operand_info in ODRLLeftOperands.OPERANDS.items():
            compatible_ops = " ".join([f"odrl:{op.value}" for op in operand_info.compatible_operators])
            
            rule = f"""
<CompatibilityRule_{operand_name}> a sh:NodeShape ;
    sh:targetClass odrl:Constraint ;
    sh:sparql [
        sh:select '''
            SELECT $this ?operator
            WHERE {{
                $this odrl:leftOperand odrl:{operand_name} ;
                      odrl:operator ?operator .
                FILTER (?operator NOT IN ({compatible_ops}))
            }}
        ''' ;
        sh:message "Incompatible operator for {operand_name}" ;
        sh:severity sh:Warning ;
    ] ."""
            rules.append(rule)
        
        return f"""
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .

{chr(10).join(rules)}
"""
    
    def process_violations(self, violations: List[Dict[str, Any]]) -> List[ValidationIssue]:
        issues = []
        for violation in violations:
            actual_operand = self._extract_operand_from_value(violation.get("value", ""))
            issues.append(ValidationIssue(
                issue_type="Operator Compatibility",
                focus_node=str(violation.get("focus_node", "")),
                property_path="odrl:operator",
                actual_value=str(violation.get("value", "")),
                constraint_violated=f"Operator is not compatible with left operand '{actual_operand}'. Check ODRL specification for valid operator-operand combinations.",
                severity="Warning"
            ))
        return issues
    
    def _extract_operand_from_value(self, uri_value: str) -> str:
        """Extract operand name from URI value."""
        if "odrl/2/" in uri_value:
            return uri_value.split("odrl/2/")[-1]
        elif ":" in uri_value:
            return uri_value.split(":")[-1]
        return uri_value

class LogicalConstraintValidator(BaseValidator):
    """Validates logical constraint structures."""
    
    def get_shape_ttl(self) -> str:
        return """
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

<LogicalConstraintShape> a sh:NodeShape ;
    sh:targetClass odrl:LogicalConstraint ;
    
    sh:xone (
        [ sh:property [ sh:path odrl:and ; sh:minCount 1 ] ]
        [ sh:property [ sh:path odrl:or ; sh:minCount 1 ] ]
        [ sh:property [ sh:path odrl:xone ; sh:minCount 1 ] ]
        [ sh:property [ sh:path odrl:andSequence ; sh:minCount 1 ] ]
    ) ;
    sh:message "Must have exactly one logical operator" ;
    
    sh:sparql [
        sh:select '''
            SELECT $this ?operator
            WHERE {
                $this ?operator ?operands .
                FILTER (?operator IN (odrl:and, odrl:or, odrl:xone, odrl:andSequence))
                {
                    SELECT (COUNT(?operand) AS ?count) WHERE {
                        $this ?operator ?operands .
                        ?operands rdf:rest*/rdf:first ?operand .
                    }
                }
                FILTER (?count < 2)
            }
        ''' ;
        sh:message "Logical operators require at least 2 operands" ;
    ] .
"""
    
    def process_violations(self, violations: List[Dict[str, Any]]) -> List[ValidationIssue]:
        issues = []
        for violation in violations:
            constraint_type = violation.get("source_constraint_component", "")
            
            if "XoneConstraintComponent" in constraint_type:
                issue_type = "Logical Operator Error"
                constraint_violated = "Must have exactly one logical operator (and/or/xone/andSequence)"
            elif "SPARQLConstraint" in constraint_type:
                issue_type = "Insufficient Operands"
                constraint_violated = "Logical operators require at least 2 constraint operands"
            else:
                issue_type = "Logical Constraint Error"
                constraint_violated = violation.get("message", "Unknown logical constraint violation")
            
            issues.append(ValidationIssue(
                issue_type=issue_type,
                focus_node=str(violation.get("focus_node", "")),
                property_path=str(violation.get("result_path", "odrl:constraint")),
                actual_value=str(violation.get("value", "logical constraint")),
                constraint_violated=constraint_violated
            ))
        
        return issues

class PolicyStructureValidator(BaseValidator):
    """Validates basic ODRL policy structure."""
    
    def get_shape_ttl(self) -> str:
        return """
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .

<PolicyStructureShape> a sh:NodeShape ;
    sh:targetClass odrl:Policy ;
    sh:property [
        sh:path odrl:uid ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
        sh:nodeKind sh:IRI ;
        sh:message "Policy must have exactly one uid with IRI value" ;
    ] ;
    sh:or (
        [ sh:property [ sh:path odrl:permission ; sh:minCount 1 ] ]
        [ sh:property [ sh:path odrl:prohibition ; sh:minCount 1 ] ]
        [ sh:property [ sh:path odrl:obligation ; sh:minCount 1 ] ]
    ) ;
    sh:message "Policy must have at least one rule" .
"""
    
    def process_violations(self, violations: List[Dict[str, Any]]) -> List[ValidationIssue]:
        issues = []
        for violation in violations:
            constraint_type = violation.get("source_constraint_component", "")
            
            if "uid" in str(violation.get("result_path", "")):
                issue_type = "Missing Policy UID"
                constraint_violated = "ODRL Policy must have exactly one odrl:uid property with an IRI value as per ODRL Information Model specification"
            elif "OrConstraintComponent" in constraint_type:
                issue_type = "Missing Policy Rules"  
                constraint_violated = "ODRL Policy must contain at least one Rule (odrl:permission, odrl:prohibition, or odrl:obligation) as per ODRL Information Model specification"
            else:
                issue_type = "Policy Structure Error"
                constraint_violated = violation.get("message", "Unknown policy structure violation")
            
            issues.append(ValidationIssue(
                issue_type=issue_type,
                focus_node=str(violation.get("focus_node", "")),
                property_path=str(violation.get("result_path", "")),
                actual_value=str(violation.get("value", "not specified")),
                constraint_violated=constraint_violated
            ))
        
        return issues

# --------------------------
# Main Validation Tool
# --------------------------

class ODRLValidationTool:
    """Main validation tool for ODRL knowledge graphs."""
    
    def __init__(self):
        self.validators = [
            PolicyStructureValidator(),
            ConstraintStructureValidator(),
            ConstraintCompatibilityValidator(),
            LogicalConstraintValidator(),
        ]
    
    def validate_kg(self, user_text: str, kg_turtle: str) -> ValidationReport:
        """Validate knowledge graph and return structured report."""
        all_issues = []
        
        for validator in self.validators:
            violations = self._run_shacl_validation(kg_turtle, validator.get_shape_ttl())
            issues = validator.process_violations(violations)
            all_issues.extend(issues)
        
        is_valid = len(all_issues) == 0
        
        return ValidationReport(
            user_text=user_text,
            generated_kg=kg_turtle,
            is_valid=is_valid,
            issues=all_issues
        )
    
    def _run_shacl_validation(self, data_ttl: str, shape_ttl: str) -> List[Dict[str, Any]]:
        """Run SHACL validation and extract violations."""
        try:
            data_graph = rdflib.Graph()
            data_graph.parse(data=data_ttl, format="turtle")
            
            shape_graph = rdflib.Graph()
            shape_graph.parse(data=shape_ttl, format="turtle")
            
            conforms, report_graph, report_text = validate(
                data_graph,
                shacl_graph=shape_graph,
                inference='rdfs',
                serialize_report_graph=True,
                debug=False
            )
            
            if isinstance(report_graph, bytes):
                parsed_report_graph = rdflib.Graph()
                parsed_report_graph.parse(data=report_graph.decode('utf-8'), format="turtle")
                report_graph = parsed_report_graph
            
            # Extract violations
            SH = rdflib.Namespace("http://www.w3.org/ns/shacl#")
            violations = []
            
            for s in report_graph.subjects(rdflib.RDF.type, SH.ValidationResult):
                violation = {}
                for pred, obj in report_graph.predicate_objects(s):
                    if pred == SH.focusNode:
                        violation["focus_node"] = str(obj)
                    elif pred == SH.value:
                        violation["value"] = str(obj)
                    elif pred == SH.sourceConstraintComponent:
                        violation["source_constraint_component"] = str(obj)
                    elif pred == SH.resultPath:
                        violation["result_path"] = str(obj)
                    elif pred == SH.resultMessage:
                        violation["message"] = str(obj)
                
                violations.append(violation)
            
            return violations
            
        except Exception as e:
            return [{"message": f"Validation error: {str(e)}", "focus_node": "", "value": "", "source_constraint_component": "", "result_path": ""}]

# --------------------------
# Usage Example
# --------------------------

if __name__ == "__main__":
    # Example usage
    user_text = "Alice can read the document until December 31, 2025, maximum 5 times"
    
    # Example KG with errors
    kg_with_errors = """
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix ex: <http://example.com/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

ex:policy1 a odrl:Policy ;
    odrl:permission [
        a odrl:Permission ;
        odrl:action odrl:read ;
        odrl:target ex:document ;
        odrl:constraint [
            a odrl:Constraint ;
            odrl:leftOperand odrl:dateTime ;
            odrl:operator odrl:invalidOp ;  # Invalid operator
            odrl:rightOperand "2025-12-31"^^xsd:date ;
        ] ;
    ] .
"""
    
    # Run validation
    tool = ODRLValidationTool()
    report = tool.validate_kg(user_text, kg_with_errors)
    
    # Output structured feedback
    print(report.to_learning_prompt())