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
# AGENT 4: VALIDATOR (Uses LLM Differently)
# ============================================

class SHACLValidator:
    """Agent 4: Uses LLM for error analysis (not primary validation)"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        """
        Initialize Validator
        
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
        
        # STEP 2: Create prompt for error analysis
        self.analysis_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are an ODRL validation expert. Explain errors clearly."),
            ("human", """Analyze these validation errors:

{errors}

Provide:
1. Summary of issues
2. Severity assessment
3. Suggested fixes""")
        ])
    
    def validate(self, odrl_policy: Dict[str, Any]) -> Dict[str, Any]:
        """
        Shows how LLM is used AFTER SHACL validation
        (SHACL does the actual validation, LLM explains errors)
        """
        print(f"[Validator] Validating with SHACL...")
        
        # SHACL validation happens first (no LLM)
        validation_errors = self._run_shacl_validation(odrl_policy)
        
        if validation_errors:
            print(f"[Validator] Found {len(validation_errors)} errors, using LLM to analyze...")
            
            # NOW use LLM to explain errors
            chain = self.analysis_prompt | self.llm
            
            errors_str = "\n".join([f"- {e['message']}" for e in validation_errors])
            
            analysis = chain.invoke({"errors": errors_str})
            
            # The LLM provides:
            # 1. Human-readable explanations
            # 2. Suggested fixes
            # 3. Priority of issues
            
            return {
                "is_valid": False,
                "errors": validation_errors,
                "llm_analysis": analysis.content
            }
        else:
            print("[Validator] Policy is valid!")
            return {"is_valid": True, "errors": []}
    
    def _run_shacl_validation(self, policy: Dict[str, Any]) -> List[Dict]:
        """SHACL validation (no LLM, just rule-based)"""
        # This uses pyshacl library, not LLM
        errors = []
        
        if not policy.get("uid"):
            errors.append({"message": "Missing uid", "severity": "high"})
        if not policy.get("@context"):
            errors.append({"message": "Missing @context", "severity": "high"})
        
        return errors

