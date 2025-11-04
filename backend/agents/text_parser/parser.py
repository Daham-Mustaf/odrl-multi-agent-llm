"""
Agent 1: ODRL Parser
Extracts structured ODRL-aligned information from user text
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from utils.llm_factory import LLMFactory


# ===== ENUMS =====
class PolicyType(str, Enum):
    SET = "odrl:Set"
    OFFER = "odrl:Offer"
    AGREEMENT = "odrl:Agreement"


class RuleType(str, Enum):
    PERMISSION = "permission"
    PROHIBITION = "prohibition"
    DUTY = "duty"


# ===== MODELS =====
class Constraint(BaseModel):
    """ODRL Constraint"""
    leftOperand: str = Field(description="ODRL leftOperand URI")
    operator: str = Field(description="ODRL operator URI")
    rightOperand: str = Field(description="Value")


class Duty(BaseModel):
    """ODRL Duty (obligation attached to permission)"""
    action: str = Field(description="ODRL action URI")
    constraints: List[Constraint] = Field(default_factory=list)


class Metadata(BaseModel):
    """Metadata about parsing"""
    sentence_index: int = 0
    parser_version: str = "1.0.0"
    timestamp: str = ""


class ParsedPolicy(BaseModel):
    """Single ODRL Policy"""
    
    policy_id: str
    policy_type: PolicyType
    assigner: str
    assignee: List[str]
    rule_type: RuleType
    actions: List[str] = Field(description="ODRL action URIs")
    targets: List[str]
    constraints: List[Constraint] = Field(default_factory=list)
    duties: List[Duty] = Field(default_factory=list)
    source_text: str
    metadata: Metadata

class ParsedPolicies(BaseModel):
    """Parser output - can contain multiple policies"""
    policies: List[ParsedPolicy]
    raw_text: str
    total_policies: int


PARSER_PROMPT = """You are an ODRL policy parser. Extract information EXACTLY as stated by the user.

## YOUR ONLY JOB:
Extract what the user explicitly wrote. Do NOT:
- Interpret vague terms
- Expand ambiguous words
- Infer missing information
- Add assumptions

## EXTRACTION RULES:

### 1. POLICY TYPE:
- Generic statement ("Users can...") → "odrl:Set"
- Specific offer ("Netflix offers...") → "odrl:Offer"  
- Agreement between parties ("Netflix grants User123...") → "odrl:Agreement"

### 2. ACTORS:
- Extract exactly as written
- If not mentioned → use "not_specified"
- Examples: "users" → ["user"], "researchers" → ["researcher"]

### 3. RULE TYPE:
- "can", "may", "allowed" → "permission"
- "cannot", "must not", "prohibited" → "prohibition"
- "must", "required", "shall" → "duty"

### 4. ACTIONS:
- If user says specific action (read, print, download) → map to ODRL:
  * read → odrl:read
  * write → odrl:write
  * print → odrl:print
  * download → odrl:reproduce
  * share/distribute → odrl:distribute
  * delete → odrl:delete
  * modify/edit → odrl:modify
  * store/archive → odrl:archive
  * use → odrl:use
  * play/stream → odrl:play
  
- If user says vague term (do, everything, something, things) → keep original text as-is
- If no action mentioned → actions: []

### 5. TARGETS:
- Extract exactly as written
- If not mentioned → "not_specified"

### 6. CONSTRAINTS:
- Only extract if explicitly stated with condition
- Structure: leftOperand, operator, rightOperand

**Common patterns:**
- Time: "expires on DATE" → leftOperand: "odrl:dateTime", operator: "odrl:lteq", rightOperand: "DATE"
- Duration: "for X days" → leftOperand: "odrl:delayPeriod", operator: "odrl:eq", rightOperand: "PXD"
- Purpose: "for PURPOSE" → leftOperand: "odrl:purpose", operator: "odrl:eq", rightOperand: "PURPOSE"
- Location: "in PLACE" → leftOperand: "odrl:spatial", operator: "odrl:eq", rightOperand: "PLACE"
- Count: "up to X times" → leftOperand: "odrl:count", operator: "odrl:lteq", rightOperand: "X"

**Valid operators (use only these):**
odrl:eq, odrl:neq, odrl:lt, odrl:lteq, odrl:gt, odrl:gteq, odrl:isA, odrl:hasPart, odrl:isPartOf, odrl:isAllOf, odrl:isAnyOf

- If no constraint → constraints: []

### 7. DUTIES:
- Only extract if explicitly stated (e.g., "must attribute", "required to delete")
- If none → duties: []

### 8. MULTI-POLICY:
- "can X but cannot Y" → 2 policies (1 permission, 1 prohibition)
- "can X and must Y" → 1 policy with permission + duty
- Each distinct rule = separate policy

## OUTPUT FORMAT:
{{
  "policies": [
    {{
      "policy_id": "p1",
      "policy_type": "odrl:Set|odrl:Offer|odrl:Agreement",
      "assigner": "string or not_specified",
      "assignee": ["string"],
      "rule_type": "permission|prohibition|duty",
      "actions": ["odrl:action or original_text"],
      "targets": ["string or not_specified"],
      "constraints": [
        {{
          "leftOperand": "odrl:term",
          "operator": "odrl:operator",
          "rightOperand": "value"
        }}
      ],
      "duties": [],
      "source_text": "original input",
      "metadata": {{"sentence_index": 0, "parser_version": "1.0.0", "timestamp": ""}}
    }}
  ],
  "raw_text": "original input",
  "total_policies": 1
}}

## CORE PRINCIPLE:
Be a faithful extractor, not an interpreter. When in doubt, preserve the user's exact wording.

Parse this text:
{text}

{format_instructions}
"""

# ===== PARSER CLASS =====
class TextParser:
    """Agent 1: Parse user text into ODRL-aligned structure"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        self.model = model
        self.temperature = temperature
        self.custom_config = custom_config
        
        self.llm = LLMFactory.create_llm(
            model=model,
            temperature=temperature,
            custom_config=custom_config
        )
        
    def parse(self, text: str) -> dict:
        """Parse user text - ONE LLM CALL, returns multiple policies"""
        
        print(f"[Parser] Starting extraction...")
        print(f"[Parser] Input: {text[:100]}...")
        
        try:
            # Use ParsedPolicies (plural) as output model
            parser = PydanticOutputParser(pydantic_object=ParsedPolicies)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", PARSER_PROMPT),
                ("human", "{text}\n\n{format_instructions}")
            ])
            
            chain = prompt | self.llm | parser
            
            result = chain.invoke({
                "text": text,
                "format_instructions": parser.get_format_instructions()
            })
            
            # Add timestamps to each policy
            timestamp = datetime.utcnow().isoformat() + "Z"
            for policy in result.policies:
                policy.metadata.timestamp = timestamp
            
            print(f"[Parser] ✓ Extraction complete")
            print(f"[Parser] Found {result.total_policies} policies:")
            
            for i, policy in enumerate(result.policies, 1):
                print(f"  [{i}] {policy.rule_type}: {', '.join(policy.actions)}")
            
            return result.dict()
            
        except Exception as e:
            print(f"[Parser] ✗ Error: {e}")
            raise
