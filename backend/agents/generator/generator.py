# agents/generator/generator.py
"""
ODRL Generator Agent (GA) v3.0
Generates ODRL Turtle from parsed data + reasoning
Supports regeneration with SHACL validation feedback
"""
from typing import Dict, Any, Optional
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from utils.llm_factory import LLMFactory
import uuid
import logging

logger = logging.getLogger(__name__)

# ===== GENERATION PROMPTS =====

FRESH_GENERATION_PROMPT = """You are an ODRL policy generator. Create valid ODRL in Turtle format.

## CRITICAL RULES:

### 1. Prefixes (ALWAYS include these first):
```turtle
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix ex: <http://example.com/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
```

### 2. Policy Structure:
```turtle
ex:policy123 a odrl:Policy, odrl:Set ;
    odrl:uid ex:policy123 ;
    odrl:permission [ ... ] ;
    odrl:prohibition [ ... ] ;
    odrl:duty [ ... ] .
```

### 3. Permission/Prohibition Structure:
```turtle
odrl:permission [
    a odrl:Permission ;
    odrl:action odrl:read ;
    odrl:target ex:asset ;
    odrl:assignee ex:party ;
    odrl:assigner ex:provider ;
    odrl:constraint [ ... ] ;
    odrl:duty [ ... ] ;
] .
```

### 4. Constraint Structure:
```turtle
odrl:constraint [
    a odrl:Constraint ;
    odrl:leftOperand odrl:dateTime ;
    odrl:operator odrl:lteq ;
    odrl:rightOperand "2025-12-31"^^xsd:date ;
] .
```

### 5. CORRECT ODRL Operators:
- odrl:eq (equals)
- odrl:lteq (less than or equal)
- odrl:gteq (greater than or equal)
- odrl:lt (less than)
- odrl:gt (greater than)
- odrl:neq (not equal)
- odrl:isA, odrl:hasPart, odrl:isPartOf

### 6. CORRECT ODRL leftOperands:
- odrl:dateTime (with ^^xsd:date or ^^xsd:dateTime)
- odrl:count (with ^^xsd:integer)
- odrl:spatial (with URI)
- odrl:purpose (with URI)
- odrl:recipient (with URI)
- odrl:elapsedTime (with duration)
- odrl:fileSize (with ^^xsd:decimal)

### 7. Valid Actions:
odrl:read, odrl:write, odrl:print, odrl:modify, odrl:delete, odrl:execute, 
odrl:play, odrl:display, odrl:reproduce, odrl:distribute, odrl:derive, 
odrl:attribute, odrl:inform, odrl:compensate, odrl:archive

### 8. Actor URIs:
- Use real URIs if provided in parsed data
- Otherwise use ex:party, ex:provider format

IMPORTANT: 
- Return ONLY valid Turtle syntax
- No markdown code blocks
- No explanations
- Start directly with @prefix lines
"""

REGENERATION_PROMPT = """You are an ODRL expert fixing SHACL validation errors in Turtle format.

## CRITICAL RULES FOR FIXING:

1. **DO NOT** change the policy meaning or intent
2. **ONLY** fix technical SHACL violations
3. **PRESERVE** all actions, constraints, parties, targets
4. **CORRECT** only formatting, URIs, operators, structure issues

## COMMON ODRL FIXES:

### Missing odrl:uid:
```turtle
ex:policy123 a odrl:Policy, odrl:Set ;
    odrl:uid ex:policy123 ;  ← ADD THIS
```

### Wrong Operators:
- "lte" → "odrl:lteq"
- "gte" → "odrl:gteq"
- "eq" → "odrl:eq" (add odrl: prefix)

### Missing odrl: Prefix in leftOperand:
- "dateTime" → "odrl:dateTime"
- "count" → "odrl:count"
- "spatial" → "odrl:spatial"

### Missing Constraint Type:
```turtle
odrl:constraint [
    a odrl:Constraint ;  ← ADD THIS
    odrl:leftOperand odrl:dateTime ;
    ...
] .
```

### Wrong Datatype:
- Date values → ^^xsd:date
- Numbers → ^^xsd:integer or ^^xsd:decimal
- Durations → xsd:duration

### Valid ODRL Operators (ONLY use these):
**Comparison:** odrl:eq, odrl:lt, odrl:gt, odrl:lteq, odrl:gteq, odrl:neq
**Set:** odrl:isA, odrl:hasPart, odrl:isPartOf, odrl:isAllOf, odrl:isAnyOf, odrl:isNoneOf

## PRESERVE FROM ORIGINAL:
- All policy rules (permissions, prohibitions, duties)
- All actions (odrl:read, odrl:write, etc.)
- All constraint values and semantic meaning
- Complete policy intent from user's request

## OUTPUT:
Return ONLY the corrected Turtle. No markdown, no explanations, no code blocks.
"""


class Generator:
    """
    ODRL Generator Agent
    Generates or regenerates ODRL Turtle with SHACL compliance
    """
    
    def __init__(self, model=None, temperature=0.0, custom_config=None):
        self.model = model
        self.temperature = temperature if temperature is not None else 0.0
        self.custom_config = custom_config
        
        self.llm = LLMFactory.create_llm(
            model=model,
            temperature=self.temperature,
            custom_config=custom_config
        )
    
    def generate(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        reasoning: Optional[Dict[str, Any]] = None,
        validation_errors: Optional[Dict[str, Any]] = None,
        previous_odrl: Optional[str] = None,
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
        
        logger.info(f"[Generator] Starting generation attempt #{attempt_number}")
        logger.info(f"[Generator] Original text: {original_text[:50]}...")
        logger.info(f"[Generator] Policies to generate: {parsed_data.get('total_policies', 0)}")
        
        if reasoning:
            logger.info(f"[Generator] Has reasoning: decision={reasoning.get('decision')}")
        
        # Decide: fresh generation or regeneration
        if validation_errors and previous_odrl:
            logger.info(f"[Generator] 🔄 REGENERATION MODE")
            logger.info(f"[Generator] Fixing {len(validation_errors.get('issues', []))} SHACL violations")
            odrl_turtle = self._regenerate_with_fixes(
                parsed_data,
                original_text,
                validation_errors,
                previous_odrl,
                attempt_number
            )
        else:
            logger.info(f"[Generator] 🆕 FRESH GENERATION")
            odrl_turtle = self._generate_fresh(parsed_data, original_text, reasoning)
        
        logger.info(f"[Generator] ✓ Generation complete")
        logger.info(f"[Generator] Turtle length: {len(odrl_turtle)} chars")
        
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
            
            logger.info(f"[Generator] Policy ID: {policy_id}")
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", FRESH_GENERATION_PROMPT),
                ("human", """Generate ODRL policy in Turtle format from:

POLICY ID: {policy_id}

ORIGINAL USER REQUEST:
{original_text}

PARSED DATA:
{parsed_data}

Return ONLY valid Turtle syntax. Start with @prefix lines.""")
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            odrl_turtle = chain.invoke({
                "policy_id": policy_id,
                "original_text": original_text,
                "parsed_data": str(parsed_data)
            })
            
            # Clean up potential markdown wrapping
            odrl_turtle = self._clean_turtle(odrl_turtle)
            
            logger.info(f"[Generator] ✓ Fresh generation complete")
            
            return odrl_turtle
            
        except Exception as e:
            logger.error(f"[Generator] ✗ Error in fresh generation: {e}")
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
            # Extract issues with full details
            issues = validation_errors.get('issues', [])
            
            # Build detailed issue description
            issues_text = "\n".join([
                f"""Issue {i+1}: {issue.get('type', 'Unknown')}
  - Field: {issue.get('field', 'unknown')}
  - Problem: {issue.get('message', 'No message')}
  - Current Value: {issue.get('actual_value', 'N/A')}
  - Focus Node: {issue.get('focus_node', 'N/A')}
  - Severity: {issue.get('severity', 'Error')}"""
                for i, issue in enumerate(issues)
            ])
            
            logger.info(f"[Generator] SHACL issues to fix:")
            for line in issues_text.split('\n'):
                logger.info(f"[Generator]   {line}")
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", REGENERATION_PROMPT),
                ("human", """Fix the SHACL validation errors while preserving the original policy intent.

ORIGINAL USER REQUEST:
{original_text}

PARSED POLICY STRUCTURE:
{parsed_data}

CURRENT TURTLE (with SHACL violations):
{previous_odrl}

SHACL VALIDATION ERRORS TO FIX:
{validation_errors}

INSTRUCTIONS:
1. Read the original user request to understand the intended policy
2. Look at the current Turtle to see what was generated
3. Fix ONLY the specific SHACL violations listed above
4. Ensure the fixed policy still matches the user's original intent
5. Return ONLY the corrected Turtle

Return the CORRECTED Turtle only (no markdown, no explanations).""")
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            odrl_turtle = chain.invoke({
                "original_text": original_text,
                "parsed_data": str(parsed_data),
                "previous_odrl": previous_odrl,
                "validation_errors": issues_text
            })
            
            # Clean up potential markdown wrapping
            odrl_turtle = self._clean_turtle(odrl_turtle)
            
            logger.info(f"[Generator] ✓ Regeneration complete (attempt #{attempt_number})")
            
            return odrl_turtle
            
        except Exception as e:
            logger.error(f"[Generator] ✗ Error in regeneration: {e}")
            raise
    
    def _clean_turtle(self, turtle_str: str) -> str:
        """Remove markdown code blocks and extra whitespace"""
        # Remove markdown code blocks
        turtle_str = turtle_str.replace('```turtle', '').replace('```', '')
        
        # Remove leading/trailing whitespace
        turtle_str = turtle_str.strip()
        
        return turtle_str