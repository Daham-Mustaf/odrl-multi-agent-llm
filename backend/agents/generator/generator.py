"""
Agent 3: ODRL Generator
Generates ODRL JSON-LD from parsed data + original text + optional reasoning
"""
from typing import Dict, Any, Optional
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from utils.llm_factory import LLMFactory
import uuid
from datetime import datetime


class Generator:
    """Agent 3: Generate ODRL from parsed data"""
    
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
        reasoning: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate ODRL from parsed data
        
        Args:
            parsed_data: Parser output (required)
            original_text: User's input (required)
            reasoning: Reasoner analysis (optional)
            
        Returns:
            Valid ODRL JSON-LD
        """
        
        print(f"[Generator] 🎨 Starting ODRL generation...")
        print(f"[Generator] 📝 Original: {original_text[:50]}...")
        print(f"[Generator] 📊 Policies: {parsed_data.get('total_policies', 0)}")
        
        if reasoning:
            print(f"[Generator] 🧠 Has reasoning context: {reasoning.get('decision', 'unknown')}")
        
        try:
            # Simple template-based generation for now
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an ODRL policy generator. Create valid ODRL JSON-LD.

Rules:
1. Use @context: http://www.w3.org/ns/odrl.jsonld
2. Generate unique uid with http://example.com/policy: prefix
3. Map rule_type to permission/prohibition/obligation
4. Use ODRL action URIs (odrl:read, odrl:write, etc)
5. Create proper constraint structure with leftOperand, operator, rightOperand
6. Add @type based on policy_type from parsed data

Return ONLY valid JSON-LD, no markdown, no code blocks."""),
                ("human", """Generate ODRL policy from:

PARSED DATA: {parsed_data}

ORIGINAL TEXT: {original_text}

Return valid ODRL JSON-LD only.""")
            ])
            
            chain = prompt | self.llm | JsonOutputParser()
            
            odrl_policy = chain.invoke({
                "parsed_data": str(parsed_data),
                "original_text": original_text
            })
            
            print(f"[Generator] ✅ Generation complete")
            print(f"[Generator] 📋 Policy type: {odrl_policy.get('@type', 'unknown')}")
            
            return odrl_policy
            
        except Exception as e:
            print(f"[Generator] ❌ Error: {e}")
            raise