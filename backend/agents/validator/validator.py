"""
Agent 4: ODRL Validator
Validates ODRL Turtle using SHACL constraints + LLM analysis
"""
from typing import Dict, Any, Optional
from langchain.prompts import ChatPromptTemplate
from utils.llm_factory import LLMFactory
from .shacl_validator import ODRLValidationTool, ValidationReport


class Validator:
    """Agent 4: Validate ODRL policies using SHACL + LLM"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        self.model = model
        self.temperature = temperature
        self.custom_config = custom_config
        
        # Create LLM (for explaining errors)
        self.llm = LLMFactory.create_llm(
            model=model,
            temperature=temperature,
            custom_config=custom_config
        )
        
        # Create SHACL validator
        self.shacl_tool = ODRLValidationTool()
    
    def validate(
        self, 
        odrl_turtle: str,  # ✅ Now accepts Turtle string directly
        original_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate ODRL Turtle using SHACL constraints
        
        Args:
            odrl_turtle: ODRL in Turtle format
            original_text: Original user input (for context)
            
        Returns:
            Validation report with issues and suggestions
        """
        
        print(f"[Validator] Validating with SHACL...")
        print(f"[Validator] 🐢 Turtle input ({len(odrl_turtle)} chars)")
        
        try:
            # Run SHACL validation directly on Turtle
            report: ValidationReport = self.shacl_tool.validate_kg(
                user_text=original_text or "Policy validation",
                kg_turtle=odrl_turtle
            )
            
            if report.is_valid:
                print("[Validator] ✅ Policy is valid!")
                return {
                    'is_valid': True,
                    'issues': [],
                    'summary': 'All SHACL constraints passed'
                }
            else:
                print(f"[Validator] ❌ Found {len(report.issues)} issues")
                
                # Convert issues to frontend format
                issues = []
                for issue in report.issues:
                    issues.append({
                        'severity': issue.severity,
                        'type': issue.issue_type,
                        'field': issue.property_path,
                        'message': issue.constraint_violated,
                        'actual_value': issue.actual_value,
                        'focus_node': issue.focus_node
                    })
                
                # Optionally use LLM to explain errors (if configured)
                llm_explanation = None
                if self.llm and len(issues) > 0:
                    llm_explanation = self._get_llm_explanation(issues)
                
                return {
                    'is_valid': False,
                    'issues': issues,
                    'summary': f'{len(issues)} validation issue(s) found',
                    'llm_explanation': llm_explanation
                }
                
        except Exception as e:
            print(f"[Validator] ❌ Error: {e}")
            import traceback
            traceback.print_exc()
            
            return {
                'is_valid': False,
                'issues': [{
                    'severity': 'Error',
                    'type': 'Validation Error',
                    'field': 'unknown',
                    'message': f'Validation failed: {str(e)}',
                    'actual_value': 'N/A',
                    'focus_node': 'N/A'
                }],
                'summary': 'Validation error occurred'
            }
    
    def _get_llm_explanation(self, issues: list) -> Optional[str]:
        """
        Use LLM to provide human-friendly explanation of errors
        """
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an ODRL validation expert. Explain SHACL validation errors clearly and suggest fixes.

Be concise and actionable. Focus on what needs to be fixed."""),
                
                ("human", """These ODRL validation issues were found:

{issues}

Provide:
1. Brief summary (1 sentence)
2. Most critical issue
3. Suggested fix for critical issue""")
            ])
            
            chain = prompt | self.llm
            
            # Format issues for LLM (limit to top 5)
            issues_text = "\n".join([
                f"- [{issue['severity']}] {issue['type']}: {issue['message']}"
                for issue in issues[:5]
            ])
            
            result = chain.invoke({"issues": issues_text})
            
            explanation = result.content if hasattr(result, 'content') else str(result)
            
            print(f"[Validator] 💡 LLM explanation generated")
            return explanation
            
        except Exception as e:
            print(f"[Validator] ⚠️  LLM explanation failed: {e}")
            return None