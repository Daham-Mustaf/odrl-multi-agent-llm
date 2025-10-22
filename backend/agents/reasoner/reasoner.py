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
# AGENT 2: REASONER
# ============================================

class InferredPermission(BaseModel):
    action: str
    inferred_from: str
    reason: str

class Conflict(BaseModel):
    action: str
    conflict_type: str
    severity: str

class ReasoningResult(BaseModel):
    inferred_permissions: List[InferredPermission]
    conflicts: List[Conflict]
    policy_type: str
    risk_level: str
    analysis: str

class Reasoner:
    """Agent 2: Shows how LLM is used for reasoning"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        """
        Initialize Reasoner
        
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
        self.reason_prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a policy reasoning expert. Analyze for conflicts and infer permissions."),
            ("human", "Analyze this policy:\n\n{policy}\n\n{format_instructions}")
        ])
        
        # STEP 3: Create parser
        self.parser = PydanticOutputParser(pydantic_object=ReasoningResult)
    
    def reason(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Shows how LLM analyzes and reasons"""
        print(f"[Reasoner] Reasoning with LLM: {type(self.llm).__name__}")
        
        # Build chain with LLM
        chain = self.reason_prompt | self.llm | self.parser
        
        # Invoke
        result = chain.invoke({
            "policy": str(parsed_data),
            "format_instructions": self.parser.get_format_instructions()
        })
        
        # The LLM receives the parsed policy and:
        # 1. Infers implicit permissions
        # 2. Detects conflicts
        # 3. Assesses risk level
        # 4. Provides analysis
        
        return result.dict()

