"""
Agent 3: ODRL Generator
Generates ODRL Turtle from parsed data + original text + optional reasoning
Supports regeneration with SHACL validation error fixes
"""
from typing import Dict, Any, Optional
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from utils.llm_factory import LLMFactory
import uuid
from datetime import datetime


class Generator:
    """Agent 3: Generate or regenerate ODRL in Turtle format"""
    
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
        previous_odrl: Optional[str] = None,  # Now a string (Turtle)
        attempt_number: int = 1                              
    ) -> Dict[str, Any]:
        """
        Generate or regenerate ODRL policy in Turtle format
        
        Args:
            parsed_data: Parser output (required)
            original_text: User's input (required)
            reasoning: Reasoner analysis (optional)
            validation_errors: SHACL issues to fix (optional, for regeneration)
            previous_odrl: Previously generated Turtle (optional, for regeneration)
            attempt_number: Generation attempt number (1, 2, 3...)
            
        Returns:
            Dict with 'odrl_turtle' key containing Turtle string
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
            
            odrl_turtle = self._regenerate_with_fixes(
                parsed_data,
                original_text,
                validation_errors,
                previous_odrl,
                attempt_number
            )
        else:
            # ============================================
            # FIRST GENERATION MODE: Fresh from parsed data
            # ============================================
            print(f"[Generator] 🆕 FIRST GENERATION from parsed data")
            odrl_turtle = self._generate_fresh(parsed_data, original_text, reasoning)
        
        # Return Turtle string
        return {
            'odrl_turtle': odrl_turtle,
            'format': 'turtle',
            'attempt_number': attempt_number
        }
    
    def _generate_fresh(
        self, 
        parsed_data: Dict[str, Any],
        original_text: str,
        reasoning: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate fresh ODRL policy in Turtle format"""
        
        try:
            # Generate unique policy ID
            policy_id = f"http://example.com/policy:{uuid.uuid4().hex[:8]}"
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an ODRL policy generator. Create valid ODRL in Turtle format.

CRITICAL RULES:
1. Use standard ODRL prefixes:
   @prefix odrl: <http://www.w3.org/ns/odrl/2/> .
   @prefix ex: <http://example.com/> .
   @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

2. Policy structure:
   ex:policyX a odrl:Policy, odrl:Set ;
       odrl:uid ex:policyX ;
       odrl:permission [ ... ] ;
       odrl:prohibition [ ... ] .

3. Permission/Prohibition structure:
   odrl:permission [
       a odrl:Permission ;
       odrl:action odrl:read ;
       odrl:target ex:asset ;
       odrl:assignee ex:party ;
       odrl:constraint [ ... ] ;
   ] .

4. Constraint structure:
   odrl:constraint [
       a odrl:Constraint ;
       odrl:leftOperand odrl:dateTime ;
       odrl:operator odrl:lteq ;
       odrl:rightOperand "2025-12-31"^^xsd:date ;
   ] .

5. Use CORRECT ODRL operators:
   - odrl:eq (equals)
   - odrl:lteq (less than or equal)
   - odrl:gteq (greater than or equal)
   - odrl:lt (less than)
   - odrl:gt (greater than)
   - odrl:neq (not equal)

6. Use CORRECT ODRL leftOperands:
   - odrl:dateTime (with xsd:date or xsd:dateTime)
   - odrl:count (with xsd:integer)
   - odrl:spatial (with URI)
   - odrl:purpose (with URI)
   - odrl:recipient (with URI)

IMPORTANT: Return ONLY valid Turtle syntax. No markdown, no code blocks, no explanations."""),
                
                ("human", """Generate ODRL policy in Turtle format from:

POLICY ID: {policy_id}

PARSED DATA:
{parsed_data}

ORIGINAL TEXT:
{original_text}

Return ONLY valid Turtle syntax.""")
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            odrl_turtle = chain.invoke({
                "policy_id": policy_id,
                "parsed_data": str(parsed_data),
                "original_text": original_text
            })
            
            # Clean up potential markdown wrapping
            odrl_turtle = self._clean_turtle(odrl_turtle)
            
            print(f"[Generator] ✅ Fresh generation complete")
            print(f"[Generator] 📋 Turtle length: {len(odrl_turtle)} chars")
            
            return odrl_turtle
            
        except Exception as e:
            print(f"[Generator] ❌ Error in fresh generation: {e}")
            raise
    
    def _regenerate_with_fixes(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        validation_errors: Dict[str, Any],
        previous_odrl: str,
        attempt_number: int
    ) -> str:
        """Regenerate ODRL Turtle by fixing SHACL validation errors"""
        
        try:
            # Extract issues
            issues = validation_errors.get('issues', [])
            issues_text = "\n".join([
                f"- [{issue.get('severity', 'error')}] {issue.get('field', 'unknown')}: {issue.get('message', 'No message')}"
                for issue in issues
            ])
            
            print(f"[Generator] 🔍 Issues to fix:\n{issues_text}")
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an ODRL expert fixing SHACL validation errors in Turtle format.

CRITICAL RULES:
1. DO NOT change the policy meaning or intent
2. ONLY fix technical SHACL violations
3. Keep all actions, constraints, parties, and targets the same
4. Just correct formatting, URIs, operators, and structure

COMMON FIXES:
- Missing odrl:uid → Add: odrl:uid ex:policyX ;
- Wrong operator "lte" → Change to odrl:lteq
- Wrong operator "gte" → Change to odrl:gteq
- Missing odrl: prefix in leftOperand → Add odrl:dateTime, odrl:spatial, etc.
- Invalid property names → Use correct ODRL vocabulary
- Missing constraint type → Add: a odrl:Constraint ;
- Wrong datatype → Use xsd:date, xsd:integer, etc.

PRESERVE:
- All policy rules (permissions, prohibitions)
- All actions (odrl:read, odrl:write, etc.)
- All constraints and their values
- The policy intent

Return ONLY the corrected Turtle. No markdown, no explanations."""),
                
                ("human", """Fix these SHACL validation errors:

VALIDATION ERRORS:
{validation_errors}

CURRENT TURTLE (has errors):
{previous_odrl}

ORIGINAL PARSED DATA (for reference):
{parsed_data}

Return the CORRECTED Turtle only.""")
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            odrl_turtle = chain.invoke({
                "validation_errors": issues_text,
                "previous_odrl": previous_odrl,
                "parsed_data": str(parsed_data)
            })
            
            # Clean up potential markdown wrapping
            odrl_turtle = self._clean_turtle(odrl_turtle)
            
            print(f"[Generator] ✅ Regeneration complete (attempt #{attempt_number})")
            print(f"[Generator] 🔧 Fixed Turtle returned")
            
            return odrl_turtle
            
        except Exception as e:
            print(f"[Generator] ❌ Error in regeneration: {e}")
            raise
    
    def _clean_turtle(self, turtle_str: str) -> str:
        """Remove markdown code blocks and extra whitespace"""
        # Remove markdown code blocks
        turtle_str = turtle_str.replace('```turtle', '').replace('```', '')
        
        # Remove leading/trailing whitespace
        turtle_str = turtle_str.strip()
        
        return turtle_str