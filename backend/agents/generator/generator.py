"""
How LLMs Are Actually Used Inside Each Agent
==============================================

This shows the exact pattern of how self.llm is used in each agent.
All agents follow the same pattern:

1. Initialize LLM in __init__ using factory
2. Create a ChatPromptTemplate
3. Build a chain: prompt | self.llm | parser
4. Invoke the chain with input data
"""

from typing import Dict, Any, List
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from utils.llm_factory import LLMFactory
import os


# ============================================
# AGENT 3: GENERATOR
# ============================================

class Generator:
    """Agent 3: Shows how LLM is used for generation"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        """
        Initialize Generator
        
        Args:
            model: Model identifier
            temperature: Temperature setting
            custom_config: Custom model configuration dict
        """
        self.model = model
        self.temperature = temperature
        self.custom_config = custom_config
        
        # Create LLM with custom config if provided
        self.llm = LLMFactory.create_llm(
            model=model,
            temperature=temperature,
            custom_config=custom_config  # ✅ PASS IT HERE
        )
        
        # STEP 2: Create prompt
        self.generate_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an ODRL policy generation expert. Generate valid JSON-LD policies."),
            ("human", """Generate ODRL policy from:
            
Policy Type: {policy_type}
Risk Level: {risk_level}
Parsed Data: {parsed_data}
Inferred Permissions: {inferred_permissions}

Return ONLY valid JSON.""")
        ])
    
    def generate(self, reasoning_result: Dict[str, Any]) -> Dict[str, Any]:
        """Shows how LLM generates ODRL policy"""
        print(f"[Generator] Generating with LLM: {type(self.llm).__name__}")
        
        # Build chain with JSON parser
        chain = self.generate_prompt | self.llm | JsonOutputParser()
        
        # Invoke
        odrl_policy = chain.invoke({
            "policy_type": reasoning_result.get("policy_type", "unknown"),
            "risk_level": reasoning_result.get("risk_level", "unknown"),
            "parsed_data": str(reasoning_result.get("original_parsed_data", {})),
            "inferred_permissions": str(reasoning_result.get("inferred_permissions", []))
        })
        
        # The LLM generates:
        # 1. Complete ODRL JSON-LD structure
        # 2. Proper action URIs
        # 3. Constraints in ODRL format
        # 4. Metadata and identifiers
        
        return odrl_policy

