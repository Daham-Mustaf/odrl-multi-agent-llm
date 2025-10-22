# """
# How LLMs Are Actually Used Inside Each Agent
# ==============================================

# This shows the exact pattern of how self.llm is used in each agent.
# All agents follow the same pattern:

# 1. Initialize LLM in __init__ using factory
# 2. Create a ChatPromptTemplate
# 3. Build a chain: prompt | self.llm | parser
# 4. Invoke the chain with input data
# """

# from typing import Dict, Any, List
# from langchain.prompts import ChatPromptTemplate
# from langchain.output_parsers import PydanticOutputParser
# from langchain_core.output_parsers import JsonOutputParser
# from pydantic import BaseModel, Field
# from utils.llm_factory import LLMFactory
# import os

# # ============================================
# # AGENT 1: TEXT PARSER
# # ============================================

# class PolicyAction(BaseModel):
#     action: str
#     sentence: str

# class ParsedPolicy(BaseModel):
#     permissions: List[PolicyAction]
#     prohibitions: List[PolicyAction]
#     summary: str

# class TextParser:
#     """Agent 1: Shows how LLM is used for parsing"""
    
#     def __init__(self, model: str = None, temperature: float = None):
#         # STEP 1: Create LLM using factory
#         llm_temp = temperature if temperature is not None else float(
#             os.getenv("LLM_TEMPERATURE_PRECISE", "0.3")
#         )
        
#         print(f"[TextParser] Creating LLM: model={model}, temp={llm_temp}")
#         self.llm = LLMFactory.create_llm(model=model, temperature=llm_temp)
        
#         # STEP 2: Create prompt template
#         self.parse_prompt = ChatPromptTemplate.from_messages([
#             ("system", "You are a policy parsing expert. Extract permissions and prohibitions."),
#             ("human", "Parse this policy:\n\n{text}\n\n{format_instructions}")
#         ])
        
#         # STEP 3: Create parser
#         self.parser = PydanticOutputParser(pydantic_object=ParsedPolicy)
    
#     def parse(self, text: str) -> Dict[str, Any]:
#         """Shows how LLM is invoked"""
#         print(f"[TextParser] Parsing with LLM: {type(self.llm).__name__}")
        
#         # STEP 4: Build chain - THIS IS WHERE LLM IS USED
#         chain = self.parse_prompt | self.llm | self.parser
#         #       ↑ Prompt        ↑ LLM     ↑ Output Parser
        
#         # STEP 5: Invoke the chain
#         result = chain.invoke({
#             "text": text,
#             "format_instructions": self.parser.get_format_instructions()
#         })
        
#         # What happens internally:
#         # 1. Prompt template formats the input
#         # 2. self.llm.invoke() sends to LLM (Groq/Ollama/OpenAI/Anthropic)
#         # 3. Parser extracts structured data from LLM response
        
#         return result.dict()

"""
Agent 1: ODRL Parser
Extracts structured information from user text with full tracing
"""

from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from utils.llm_factory import LLMFactory
import os

# ===== ENUMS =====

class PolicyType(str, Enum):
    SET = "Set"
    OFFER = "Offer"
    AGREEMENT = "Agreement"

class RuleType(str, Enum):
    PERMISSION = "permission"
    PROHIBITION = "prohibition"
    DUTY = "duty"

class CompletenessStatus(str, Enum):
    COMPLETE = "complete"
    INCOMPLETE = "incomplete"
    NEEDS_INFERENCE = "needs_inference"

# ===== MODELS =====

class ExtractionIssue(BaseModel):
    """Track extraction problems"""
    category: str
    severity: str  # critical, high, medium, low
    description: str
    field: str
    user_text: Optional[str] = None
    suggestion: Optional[str] = None

class AssetExtraction(BaseModel):
    """Asset with trace"""
    identifier: str
    asset_type: Optional[str] = None
    source_text: str
    is_vague: bool = False
    is_collection: bool = False
    confidence: float = 0.8
    notes: str = ""

class ActionExtraction(BaseModel):
    """Action with trace"""
    rule_type: RuleType
    action_raw: str
    action_mapped: Optional[str] = None
    source_sentence: str
    is_standard_odrl: bool = True
    mapping_confidence: float = 0.8
    alternative_mappings: List[str] = []
    notes: str = ""

class ConstraintExtraction(BaseModel):
    """Constraint with full trace"""
    constraint_type: str
    user_text: str
    
    # ODRL mapping
    left_operand: Optional[str] = None
    operator: Optional[str] = None
    right_operand: Optional[str] = None
    unit: Optional[str] = None
    data_type: Optional[str] = None
    
    # Completeness
    status: CompletenessStatus
    missing_components: List[str] = []
    missing_info: str = ""
    extraction_reasoning: str = ""
    confidence: float = 0.8

class ParsedPolicy(BaseModel):
    """Complete parser output"""
    
    # Original
    raw_text: str
    
    # Policy type
    policy_type: PolicyType
    policy_type_confidence: float
    policy_type_reasoning: str
    
    # Entities
    assigner: Optional[str] = None
    assigner_type: Optional[str] = None
    assigner_source_text: Optional[str] = None
    
    assignee: Optional[str] = None
    assignee_type: Optional[str] = None
    assignee_source_text: Optional[str] = None
    
    # Assets
    assets: List[AssetExtraction] = []
    
    # Actions
    actions: List[ActionExtraction] = []
    
    # Constraints
    constraints: List[ConstraintExtraction] = []
    
    # Issues (for Agent 2)
    issues: List[ExtractionIssue] = []
    
    # Quality
    overall_confidence: float
    extraction_notes: str = ""
    
    # Metadata
    extracted_at: str = ""
    model_used: str = ""

# ===== PROMPT =====
PARSER_PROMPT = """You are an ODRL policy parser. Extract ALL information AND explain your extraction process.

## YOUR TASK:
1. Extract structured data (policy type, entities, assets, actions, constraints)
2. Keep traces of WHERE you found each piece
3. Flag issues and missing information
4. Explain your reasoning

## WHAT TO EXTRACT:

### 1. POLICY TYPE
- **Set**: Generic rules ("Users can...")
- **Offer**: From specific party ("Netflix offers...")
- **Agreement**: Between two parties ("Netflix grants User123...")

### 2. ENTITIES
- **Assigner**: Who grants rights (extract name, type, source_text)
- **Assignee**: Who receives rights (extract name, type, source_text)

### 3. ASSETS
For each asset extract:
- identifier, asset_type, source_text
- is_vague (if unclear like "content", "materials")
- is_collection (if multiple items)
- confidence, notes

### 4. ACTIONS
For each action extract:
- rule_type (permission/prohibition/duty)
- action_raw (user's word), action_mapped (ODRL term)
- source_sentence, is_standard_odrl
- mapping_confidence, notes

**Mappings**: stream→play, download→reproduce, share→distribute, show→display

### 5. CONSTRAINTS
For each constraint extract:
- constraint_type (temporal/spatial/count/purpose)
- user_text (original)
- ODRL: leftOperand, operator, rightOperand, unit, dataType
- status (complete/incomplete/needs_inference)
- missing_components, missing_info
- extraction_reasoning, confidence

**Examples:**
- "for 30 days" → temporal, elapsedTime, lteq, 30, day (INCOMPLETE: missing start)
- "in Germany" → spatial, spatial, eq, Germany (COMPLETE)
- "5 times" → count, count, lteq, 5 (INCOMPLETE: scope unclear)
- "for research" → purpose, purpose, eq, research (COMPLETE)

### 6. ISSUES
Track problems for Agent 2:
- category, severity, description, field
- user_text, suggestion

## EXAMPLE:

Input: "Users can stream movies for 30 days"

Output:
```json
{{
  "raw_text": "Users can stream movies for 30 days",
  "policy_type": "Set",
  "policy_type_confidence": 1.0,
  "policy_type_reasoning": "Generic statement with no specific assigner",
  "assigner": null,
  "assignee": "users",
  "assignee_type": "person",
  "assignee_source_text": "Users",
  "assets": [{{
    "identifier": "movies",
    "asset_type": "video",
    "source_text": "movies",
    "is_vague": false,
    "is_collection": true,
    "confidence": 0.9,
    "notes": ""
  }}],
  "actions": [{{
    "rule_type": "permission",
    "action_raw": "stream",
    "action_mapped": "play",
    "source_sentence": "Users can stream movies",
    "is_standard_odrl": true,
    "mapping_confidence": 0.95,
    "alternative_mappings": [],
    "notes": ""
  }}],
  "constraints": [{{
    "constraint_type": "temporal",
    "user_text": "for 30 days",
    "left_operand": "elapsedTime",
    "operator": "lteq",
    "right_operand": "30",
    "unit": "day",
    "data_type": "xsd:integer",
    "status": "incomplete",
    "missing_components": ["start_date"],
    "missing_info": "Duration specified but start date not mentioned",
    "extraction_reasoning": "The phrase 'for 30 days' indicates duration using elapsedTime",
    "confidence": 0.9
  }}],
  "issues": [{{
    "category": "incomplete_constraint",
    "severity": "medium",
    "description": "Temporal constraint missing start date",
    "field": "constraints[0]",
    "user_text": "for 30 days",
    "suggestion": "Agent 2 should infer start date as 'from agreement date'"
  }}],
  "overall_confidence": 0.88,
  "extraction_notes": "Temporal constraint needs start date",
  "extracted_at": "",
  "model_used": ""
}}
```

Now extract from: {{text}}

{{format_instructions}}
"""

# ===== PARSER CLASS =====

class TextParser:
    """Agent 1: Parse user text with full tracing"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        """
        Initialize TextParser
        
        Args:
            model: Model identifier (e.g., "groq:llama-3.1-70b")
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
        
    def parse(self, text: str) -> dict:
        """Parse user text - ONE LLM CALL"""
        
        print(f"[Parser] Starting extraction...")
        print(f"[Parser] Input: {text[:100]}...")
        
        try:
            # Create parser
            parser = PydanticOutputParser(pydantic_object=ParsedPolicy)
            
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", PARSER_PROMPT),
                ("human", "{text}\n\n{format_instructions}")
            ])
            
            # Build chain - ONE LLM CALL
            chain = prompt | self.llm | parser
            
            # Invoke
            result = chain.invoke({
                "text": text,
                "format_instructions": parser.get_format_instructions()
            })
            
            # Add metadata
            result.extracted_at = datetime.utcnow().isoformat() + "Z"
            result.model_used = self.model
            
            # Set requirement flags
            result = self._set_requirement_flags(result)
            
            print(f"[Parser] ✓ Extraction complete")
            print(f"[Parser] Policy type: {result.policy_type}")
            print(f"[Parser] Found: {len(result.assets)} assets, {len(result.actions)} actions, {len(result.constraints)} constraints")
            print(f"[Parser] Issues: {len(result.issues)}")
            print(f"[Parser] Confidence: {result.overall_confidence:.2f}")
            
            return result.dict()
            
        except Exception as e:
            print(f"[Parser] ✗ Error: {e}")
            raise
    
    def _set_requirement_flags(self, parsed: ParsedPolicy) -> ParsedPolicy:
        """Add requirement flags based on policy type"""
        
        if parsed.policy_type == PolicyType.OFFER:
            if not parsed.assigner:
                parsed.issues.append(ExtractionIssue(
                    category="missing_required_assigner",
                    severity="critical",
                    description="Offer policy requires an assigner but none was found",
                    field="assigner",
                    suggestion="Agent 2 must reject or ask user to specify assigner"
                ))
        
        elif parsed.policy_type == PolicyType.AGREEMENT:
            if not parsed.assigner:
                parsed.issues.append(ExtractionIssue(
                    category="missing_required_assigner",
                    severity="critical",
                    description="Agreement policy requires an assigner but none was found",
                    field="assigner",
                    suggestion="Agent 2 must reject or ask user to specify assigner"
                ))
            
            if not parsed.assignee:
                parsed.issues.append(ExtractionIssue(
                    category="missing_required_assignee",
                    severity="critical",
                    description="Agreement policy requires an assignee but none was found",
                    field="assignee",
                    suggestion="Agent 2 must reject or ask user to specify assignee"
                ))
        
        return parsed