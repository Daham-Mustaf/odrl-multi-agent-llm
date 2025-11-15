# agents/text_parser/parser.py
"""
ODRL Policy Parser Agent (PPA) v3.0
PURE PARSING - No reasoning, just extraction
Converts heterogeneous policy text into structured ODRL intermediate representation
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
    parser_version: str = "3.0.0"
    timestamp: str = ""

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
PURE_PARSER_PROMPT = """You are an ODRL Policy Extractor. Extract structured information from policy text.

## YOUR ONLY JOB: EXTRACTION
Extract what the user explicitly states. Do NOT:
- Judge if it's good or bad
- Decide if it's complete
- Add missing information
- Evaluate quality

Just extract and structure.

## EXTRACTION RULES:

### 1. POLICY TYPE
- Generic statement ("Users can...") → "odrl:Set"
- Named provider + recipients ("Netflix offers...") → "odrl:Offer"
- Both parties named ("Museum grants User123...") → "odrl:Agreement"

### 2. ACTORS

**Assigner (Provider):**
- Look for: "granted by", "provided by", "from", "offered by", organization names
- Extract exact name if present
- If not mentioned → "not_specified"

**Assignee (Recipient):**
- Look for: "to", "for", subjects of "can/may/must"
- Normalize: "users" → ["user"], "researchers" → ["researcher"]
- Multiple: "users and admins" → ["user", "admin"]
- If not mentioned → ["not_specified"]

### 3. RULE TYPE
Identify based on modal verbs:
- "can", "may", "allowed", "permitted" → "permission"
- "cannot", "must not", "prohibited", "forbidden" → "prohibition"
- "must", "shall", "required", "obligated" → "duty"

### 4. ACTIONS - Map to ODRL vocabulary:

**READ Actions:**
- read, view, access, see, consult → **odrl:read**

**MODIFY Actions:**
- write, edit, update, change, modify, alter → **odrl:modify**

**COPY Actions:**
- download, copy, duplicate, reproduce, save → **odrl:reproduce**

**SHARE Actions:**
- share, send, transfer, distribute, redistribute → **odrl:distribute**

**DELETE Actions:**
- delete, remove, erase, destroy → **odrl:delete**

**PRINT Actions:**
- print, output → **odrl:print**

**EXECUTE Actions:**
- execute, run, launch → **odrl:execute**

**PLAY Actions:**
- play, stream, listen, watch → **odrl:play**

**USE Actions:**
- use, utilize, employ → **odrl:use**

**ARCHIVE Actions:**
- archive, store, keep → **odrl:archive**

**DERIVE Actions:**
- derive, adapt, transform, modify → **odrl:derive**

**ATTRIBUTE Actions:**
- attribute, credit, cite → **odrl:attribute**

**INFORM Actions:**
- inform, notify, report → **odrl:inform**

**COMPENSATE Actions:**
- compensate, pay, fee → **odrl:compensate**

**Vague terms (keep as-is):**
- "do", "things", "stuff", "something", "everything" → keep original text

### 5. TARGETS
Extract asset/resource names:
- Specific: "document.pdf", "dataset_2024", "MuseumArtifact" → exact name
- Generic: "the document", "data", "files" → keep as-is
- URLs: keep exact
- If not mentioned → ["not_specified"]

### 6. CONSTRAINTS - Extract conditions:

**Temporal:**
- "expires on DATE" → leftOperand: "odrl:dateTime", operator: "odrl:lteq", rightOperand: "DATE"
- "from DATE" → leftOperand: "odrl:dateTime", operator: "odrl:gteq", rightOperand: "DATE"
- "for X days" → leftOperand: "odrl:delayPeriod", operator: "odrl:eq", rightOperand: "PXD"
- "between DATE1 and DATE2" → TWO constraints (gteq and lteq)

**Purpose:**
- "for research" → leftOperand: "odrl:purpose", operator: "odrl:eq", rightOperand: "research"
- "for educational purposes" → rightOperand: "education"
- "non-commercial" → operator: "odrl:neq", rightOperand: "commercial"

**Location:**
- "in Germany" → leftOperand: "odrl:spatial", operator: "odrl:eq", rightOperand: "Germany"
- "within EU" → leftOperand: "odrl:spatial", operator: "odrl:isPartOf", rightOperand: "EU"

**Count:**
- "up to 5 times" → leftOperand: "odrl:count", operator: "odrl:lteq", rightOperand: "5"
- "maximum 100 MB" → leftOperand: "odrl:fileSize", operator: "odrl:lteq", rightOperand: "100", unit: "MB"

**Role:**
- "only for researchers" → leftOperand: "odrl:role", operator: "odrl:eq", rightOperand: "researcher"

**System:**
- "via connector X" → leftOperand: "odrl:system", operator: "odrl:eq", rightOperand: "X"

Valid operators: odrl:eq, odrl:neq, odrl:lt, odrl:lteq, odrl:gt, odrl:gteq, odrl:isA, odrl:hasPart, odrl:isPartOf, odrl:isAllOf, odrl:isAnyOf, odrl:isNoneOf

### 7. TEMPORAL OBJECT
If temporal constraints exist, also populate:
- start_date: "YYYY-MM-DD" (from "from DATE")
- end_date: "YYYY-MM-DD" (from "until/expires DATE")
- duration: "PXD" (from "for X days")

### 8. DUTIES
Extract obligations:
- "must attribute" → {{action: "odrl:attribute"}}
- "must delete after use" → {{action: "odrl:delete"}}
- "required to notify" → {{action: "odrl:inform"}}
- "shall compensate" → {{action: "odrl:compensate"}}

### 9. MULTI-POLICY SPLITTING
Split into separate policies when:
1. Different rule types: "can X but cannot Y" → 2 policies
2. Different actors: "Users can X. Admins can Y." → 2 policies
3. Distinct statements with different targets

Do NOT split:
- "can X and Y" → 1 policy with 2 actions
- "can X and must Y" → 1 policy with permission + duty

## OUTPUT FORMAT:

{{
  "policies": [
    {{
      "policy_id": "policy-1",
      "policy_type": "odrl:Set|Offer|Agreement",
      "assigner": "string or not_specified",
      "assignee": ["string"],
      "rule_type": "permission|prohibition|duty",
      "actions": ["odrl:action"],
      "targets": ["string"],
      "constraints": [
        {{
          "leftOperand": "odrl:term",
          "operator": "odrl:operator",
          "rightOperand": "value",
          "unit": "optional"
        }}
      ],
      "duties": [
        {{
          "action": "odrl:action",
          "constraints": []
        }}
      ],
      "temporal": {{
        "start_date": "YYYY-MM-DD or null",
        "end_date": "YYYY-MM-DD or null",
        "duration": "ISO 8601 or null"
      }},
      "source_text": "text snippet this policy came from",
      "metadata": {{
        "sentence_index": 0,
        "parser_version": "3.0.0",
        "timestamp": "ISO timestamp"
      }}
    }}
  ],
  "raw_text": "original input",
  "total_policies": number
}}

## CRITICAL RULES:
1. Extract exactly what's stated - don't invent
2. Map to ODRL vocabulary when possible
3. Keep vague terms as-is
4. Split contradictory rules into separate policies
5. Populate both constraints array AND temporal object for dates
6. If field not mentioned → use "not_specified" or empty list

Extract from this text:
{text}

{format_instructions}
"""

# ===== PURE PARSER CLASS =====
class TextParser:
    """
    Pure ODRL Policy Parser
    Only extracts and structures - NO reasoning
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
        Parse policy text into ODRL structure
        Pure extraction - no judgment
        
        Args:
            text: Natural language policy description
            
        Returns:
            Dict with parsed policies (pure data)
        """
        
        logger.info(f"[Parser] Starting extraction...")
        logger.info(f"[Parser] Input: {text[:100]}...")
        
        try:
            parser = PydanticOutputParser(pydantic_object=ParsedPolicies)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", PURE_PARSER_PROMPT),
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
            
            logger.info(f"[Parser] ✓ Extraction complete")
            logger.info(f"[Parser] Found {result.total_policies} policies")
            
            for i, policy in enumerate(result.policies, 1):
                logger.info(f"  [{i}] {policy.rule_type}: {', '.join(policy.actions)}")
            
            return result.dict()
            
        except Exception as e:
            logger.error(f"[Parser] Error: {e}")
            raise