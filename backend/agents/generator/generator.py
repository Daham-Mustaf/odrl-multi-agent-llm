"""
Agent 3: ODRL Generator
Generates ODRL JSON-LD from parsed data + original text + optional reasoning
Supports regeneration with SHACL validation error fixes
"""
from typing import Dict, Any, Optional
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from utils.llm_factory import LLMFactory
import uuid
from datetime import datetime


class Generator:
    """Agent 3: Generate or regenerate ODRL from parsed data"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        self.model = model
        self.temperature = temperature
        self.custom_config = custom_config
        
        self.llm = LLMFactory.create_llm(
            model=model,
            temperature=temperature,
            custom_config=custom_config
        )
    
    def generate(
        self, 
        parsed_data: Dict[str, Any],
        original_text: str,
        reasoning: Optional[Dict[str, Any]] = None,
        validation_errors: Optional[Dict[str, Any]] = None,  
        previous_odrl: Optional[Dict[str, Any]] = None,      
        attempt_number: int = 1                              
    ) -> Dict[str, Any]:
        """
        Generate or regenerate ODRL policy
        
        Args:
            parsed_data: Parser output (required)
            original_text: User's input (required)
            reasoning: Reasoner analysis (optional)
            validation_errors: SHACL issues to fix (optional, for regeneration)
            previous_odrl: Previously generated ODRL (optional, for regeneration)
            attempt_number: Generation attempt number (1, 2, 3...)
            
        Returns:
            Valid ODRL JSON-LD
        """
        
        print(f"[Generator] Generation attempt #{attempt_number}")
        print(f"[Generator] Original: {original_text[:50]}...")
        print(f"[Generator] Policies: {parsed_data.get('total_policies', 0)}")
        
        if reasoning:
            print(f"[Generator] Has reasoning context: {reasoning.get('decision', 'unknown')}")
        
        # ============================================
        # REGENERATION MODE: Fix SHACL validation errors
        # ============================================
        if validation_errors and previous_odrl:
            print(f"[Generator] 🔧 REGENERATION MODE")
            print(f"[Generator] 🐛 Fixing {len(validation_errors.get('issues', []))} SHACL issues")
            
            return self._regenerate_with_fixes(
                parsed_data,
                original_text,
                validation_errors,
                previous_odrl,
                attempt_number
            )
        
        # ============================================
        # FIRST GENERATION MODE: Fresh from parsed data
        # ============================================
        else:
            print(f"[Generator] FIRST GENERATION from parsed data")
            return self._generate_fresh(parsed_data, original_text, reasoning)
    
    def _generate_fresh(
        self, 
        parsed_data: Dict[str, Any],
        original_text: str,
        reasoning: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generate fresh ODRL policy from parsed data"""
        
        try:
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an ODRL policy generator. Create valid ODRL JSON-LD.

CRITICAL RULES:
1. Use @context: http://www.w3.org/ns/odrl.jsonld
2. Generate unique uid with http://example.com/policy: prefix
3. Set @type based on policy_type from parsed data (odrl:Set, odrl:Offer, odrl:Agreement)
4. Map rule_type to correct ODRL property:
   - permission → "permission" array
   - prohibition → "prohibition" array
   - duty/obligation → "obligation" array
5. Use ODRL action URIs (odrl:read, odrl:write, odrl:modify, odrl:delete, etc)
6. Create proper constraint structure:
   {{
     "leftOperand": "odrl:dateTime",
     "operator": "odrl:lteq",
     "rightOperand": "2025-12-31T23:59:59Z"
   }}
7. Use correct ODRL operators:
   - odrl:eq (equals)
   - odrl:lteq (less than or equal)
   - odrl:gteq (greater than or equal)
   - odrl:lt (less than)
   - odrl:gt (greater than)
8. Add assigner and assignee as URIs (http://example.com/party/...)
9. Add target as URI (http://example.com/asset/...)

IMPORTANT: Return ONLY valid JSON-LD, no markdown, no code blocks, no explanations."""),
                
                ("human", """Generate ODRL policy from:

PARSED DATA:
{parsed_data}

ORIGINAL TEXT:
{original_text}

Return valid ODRL JSON-LD only.""")
            ])
            
            chain = prompt | self.llm | JsonOutputParser()
            
            odrl_policy = chain.invoke({
                "parsed_data": str(parsed_data),
                "original_text": original_text
            })
            
            print(f"[Generator] Fresh generation complete")
            print(f"[Generator] Policy type: {odrl_policy.get('@type', 'unknown')}")
            
            return odrl_policy
            
        except Exception as e:
            print(f"[Generator] Error in fresh generation: {e}")
            raise
    
    def _regenerate_with_fixes(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        validation_errors: Dict[str, Any],
        previous_odrl: Dict[str, Any],
        attempt_number: int
    ) -> Dict[str, Any]:
        """Regenerate ODRL by fixing SHACL validation errors"""
        
        try:
            # Extract issues
            issues = validation_errors.get('issues', [])
            issues_text = "\n".join([
                f"- [{issue.get('severity', 'error')}] {issue.get('field', 'unknown')}: {issue.get('message', 'No message')}"
                for issue in issues
            ])
            
            print(f"[Generator] 🔍 Issues to fix:\n{issues_text}")
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an ODRL expert fixing SHACL validation errors.

CRITICAL RULES:
1. DO NOT change the policy meaning or intent
2. ONLY fix technical SHACL violations
3. Keep all actions, constraints, parties, and targets the same
4. Just correct formatting, namespaces, operators, and structure

COMMON FIXES:
- Missing @context → Add "http://www.w3.org/ns/odrl.jsonld"
- Wrong operator "lte" → Change to "odrl:lteq"
- Wrong operator "gte" → Change to "odrl:gteq"
- Missing "odrl:" prefix in leftOperand → Add "odrl:dateTime", "odrl:spatial", etc
- Invalid property names → Use correct ODRL vocabulary
- Missing required fields → Add uid, @type, etc
- Wrong URI format → Correct to valid URIs

PRESERVE:
- All policy rules (permissions, prohibitions, obligations)
- All actions (odrl:read, odrl:write, etc)
- All constraints and their values
- The policy intent

Return ONLY the corrected ODRL JSON-LD, no markdown, no explanations."""),
                
                ("human", """Fix these SHACL validation errors:

VALIDATION ERRORS:
{validation_errors}

CURRENT ODRL (has errors):
{previous_odrl}

ORIGINAL PARSED DATA (for reference - preserve policy intent):
{parsed_data}

ORIGINAL TEXT (for context):
{original_text}

Return the CORRECTED ODRL policy as valid JSON-LD.""")
            ])
            
            chain = prompt | self.llm | JsonOutputParser()
            
            odrl_policy = chain.invoke({
                "validation_errors": issues_text,
                "previous_odrl": str(previous_odrl),
                "parsed_data": str(parsed_data),
                "original_text": original_text
            })
            
            print(f"[Generator] Regeneration complete (attempt #{attempt_number})")
            print(f"[Generator] Fixed policy returned")
            
            return odrl_policy
            
        except Exception as e:
            print(f"[Generator] Error in regeneration: {e}")
            raise