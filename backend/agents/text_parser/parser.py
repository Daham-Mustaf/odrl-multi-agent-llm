# agents/text_parser/parser.py
"""
ODRL Policy Parser Agent (PPA) v4.0
PURE PARSING with Conflict-Aware Constraint Extraction
Extracts mutually exclusive constraints within single policy for Reasoner detection
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from utils.llm_factory import LLMFactory
import logging

logger = logging.getLogger(__name__)

# ===== ENUMS =====
class PolicyType(str, Enum):
    SET = "odrl:Set"
    OFFER = "odrl:Offer"
    AGREEMENT = "odrl:Agreement"

class RuleType(str, Enum):
    PERMISSION = "permission"
    PROHIBITION = "prohibition"
    DUTY = "duty"

# ===== CORE MODELS (PURE DATA STRUCTURES) =====
class Constraint(BaseModel):
    """ODRL Constraint"""
    leftOperand: str
    operator: str
    rightOperand: str
    unit: Optional[str] = None
    dataType: Optional[str] = None
    constraint_group: Optional[int] = None

class Duty(BaseModel):
    """ODRL Duty"""
    action: str
    constraints: List[Constraint] = Field(default_factory=list)

class TemporalExpression(BaseModel):
    """Temporal information"""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration: Optional[str] = None
    recurrence: Optional[str] = None

class Metadata(BaseModel):
    """Simple metadata"""
    sentence_index: int = 0
    parser_version: str = "4.0.0"
    timestamp: str = ""
    has_conflicting_constraints: bool = False

class ParsedPolicy(BaseModel):
    """Single ODRL Policy - Pure structure"""
    policy_id: str
    policy_type: PolicyType
    assigner: str
    assignee: List[str]
    rule_type: RuleType
    actions: List[str]
    targets: List[str]
    constraints: List[Constraint] = Field(default_factory=list)
    duties: List[Duty] = Field(default_factory=list)
    temporal: Optional[TemporalExpression] = None
    source_text: str
    metadata: Metadata

class ParsedPolicies(BaseModel):
    """Parser output"""
    policies: List[ParsedPolicy]
    raw_text: str
    total_policies: int

# ===== PURE EXTRACTION PROMPT =====
PURE_EXTRACTION_PROMPT = """You are a pure ODRL policy extractor. Your ONLY job is to extract and structure information from policy text.

## CRITICAL RULES:

1. **ONE INPUT = ONE POLICY** - Always return exactly one policy per input text
2. **NO REASONING** - Do not judge, analyze, or evaluate the policy
3. **NO MODIFICATION** - Extract exactly what is stated
4. **MARK CONFLICTS** - When same constraint type appears multiple times with different values, assign different constraint_group numbers

## YOUR ONLY TASK: EXTRACT AND STRUCTURE

Extract ALL information from the input text into a single policy structure:
- Actors (assigner, assignee)
- Actions (map to ODRL vocabulary)
- Targets (assets/resources)
- Constraints (temporal, purpose, count, location, etc.)
- If the SAME constraint type appears MULTIPLE times with DIFFERENT values, mark each with a different constraint_group number

## CONSTRAINT GROUPING (MECHANICAL RULE):

When you extract constraints, check if the same leftOperand appears multiple times:

**If YES and values are different:**
- Assign constraint_group=1 to first occurrence
- Assign constraint_group=2 to second occurrence
- Assign constraint_group=3 to third occurrence (if present)
- Set has_conflicting_constraints=true

**Examples:**
- "for research" + "for backup" → purpose with group 1, purpose with group 2
- "30 times" + "unlimited" → count with group 1, count with group 2
- "until 2025" + "indefinitely" → temporal with group 1, temporal with group 2

**If NO (single value or different constraint types):**
- Do not use constraint_group
- Set has_conflicting_constraints=false

## EXTRACTION RULES:

### 1. POLICY TYPE
- Generic: "Users can..." → "odrl:Set"
- Named provider: "Company offers..." → "odrl:Offer"
- Both parties: "Company X grants User Y..." → "odrl:Agreement"

### 2. ACTORS
**Assigner:** Look for organization names, "offered by", "provided by", "from"
- If not mentioned → "not_specified"

**Assignee:** Look for "to", "for", subjects of "can/may/must"
- Normalize plurals: "users" → ["user"]
- If not mentioned → ["not_specified"]

### 3. RULE TYPE
- "can", "may", "allowed" → "permission"
- "cannot", "must not", "prohibited" → "prohibition"
- "must", "shall", "required" → "duty"

### 4. ACTIONS (Map to ODRL vocabulary)
- read, view, access → **odrl:read**
- modify, edit, change → **odrl:modify**
- download, copy, save → **odrl:reproduce**
- share, distribute → **odrl:distribute**
- delete, remove → **odrl:delete**
- print → **odrl:print**
- execute, run → **odrl:execute**
- play, stream → **odrl:play**
- use, utilize → **odrl:use**
- archive, store, backup → **odrl:archive**

### 5. TARGETS
- Extract exact names: "document.pdf", "dataset_2024"
- Keep URLs exact
- If not mentioned → ["not_specified"]

### 6. CONSTRAINTS (Extract ALL)

**Temporal:**
- "expires on 2025-12-31" → leftOperand="odrl:dateTime", operator="odrl:lteq", rightOperand="2025-12-31"
- "from 2025-01-01" → leftOperand="odrl:dateTime", operator="odrl:gteq", rightOperand="2025-01-01"

**Purpose:**
- "for research" → leftOperand="odrl:purpose", operator="odrl:eq", rightOperand="research"
- "for backup" → leftOperand="odrl:purpose", operator="odrl:eq", rightOperand="archival_backup"

**Count:**
- "up to 30 times" → leftOperand="odrl:count", operator="odrl:lteq", rightOperand="30"
- "unlimited" → leftOperand="odrl:count", operator="odrl:eq", rightOperand="unlimited"

**Location:**
- "in Germany" → leftOperand="odrl:spatial", operator="odrl:eq", rightOperand="Germany"

**Role:**
- "for researchers" → leftOperand="odrl:role", operator="odrl:eq", rightOperand="researcher"

### 7. TEMPORAL OBJECT
If temporal constraints exist:
- start_date: "YYYY-MM-DD"
- end_date: "YYYY-MM-DD"
- duration: "PXD"

### 8. DUTIES
- "must attribute" → {{"action": "odrl:attribute"}}
- "must delete" → {{"action": "odrl:delete"}}
- "must notify" → {{"action": "odrl:inform"}}

## OUTPUT FORMAT:

Always return:
- total_policies: 1
- policies: [single policy with all extracted information]
- raw_text: original input

## REMEMBER:
- Extract, don't evaluate
- One input = one policy
- Mark constraint groups mechanically when same type appears multiple times
- Let the Reasoner handle analysis

Extract from this text:
{text}

{format_instructions}
"""

# ===== PARSER CLASS =====
class TextParser:
    """
    Pure ODRL Policy Parser
    Extracts and structures - NO reasoning
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
    
    def parse(self, text: str) -> Dict[str, Any]:
        """
        Pure extraction - no judgment
        
        Args:
            text: Natural language policy description
            
        Returns:
            Dict with single parsed policy
        """
        
        logger.info(f"[Parser] Starting pure extraction...")
        logger.info(f"[Parser] Input: {text[:100]}...")
        
        try:
            parser = PydanticOutputParser(pydantic_object=ParsedPolicies)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", PURE_EXTRACTION_PROMPT),
                ("human", "{text}\n\n{format_instructions}")
            ])
            
            chain = prompt | self.llm | parser
            
            result = chain.invoke({
                "text": text,
                "format_instructions": parser.get_format_instructions()
            })
            
            # Add timestamps
            timestamp = datetime.utcnow().isoformat() + "Z"
            for policy in result.policies:
                policy.metadata.timestamp = timestamp
            
            logger.info(f"[Parser] Extraction complete")
            logger.info(f"[Parser] Total policies: {result.total_policies}")
            
            if result.total_policies > 0:
                policy = result.policies[0]
                logger.info(f"[Parser] Rule type: {policy.rule_type}")
                logger.info(f"[Parser] Actions: {', '.join(policy.actions)}")
                logger.info(f"[Parser] Constraints: {len(policy.constraints)}")
                if policy.metadata.has_conflicting_constraints:
                    logger.info(f"[Parser] Conflict markers present")
            
            return result.dict()
            
        except Exception as e:
            logger.error(f"[Parser] Error: {e}")
            raise