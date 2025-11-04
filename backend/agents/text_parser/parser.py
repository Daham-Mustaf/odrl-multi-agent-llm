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


# ✅ NEW: Wrapper for multiple policies
class ParsedPolicies(BaseModel):
    """Parser output - can contain multiple policies"""
    policies: List[ParsedPolicy]
    raw_text: str
    total_policies: int


PARSER_PROMPT = """You are an ODRL policy parser. Extract structured ODRL-compliant information from user text.

## IMPORTANT: MULTI-POLICY SUPPORT
- If the input contains MULTIPLE rules (e.g., "can do X but cannot do Y"), extract them as SEPARATE policies
- Each permission, prohibition, or duty should be its own policy object
- Use the same source_text for related policies but give each a unique policy_id

## OUTPUT SCHEMA:
Return a JSON object with:
- **policies**: Array of policy objects
- **raw_text**: Original input
- **total_policies**: Count of extracted policies

Each policy object must have:
1. **policy_id**: Unique ID (e.g., "p1", "p2")
2. **policy_type**: One of: "odrl:Set", "odrl:Offer", "odrl:Agreement"
3. **assigner**: Entity granting the permission/obligation
4. **assignee**: List of entities receiving the permission/obligation
5. **rule_type**: "permission", "prohibition", or "duty"
6. **actions**: List of ODRL action URIs
7. **targets**: List of resources affected
8. **constraints**: List of constraint objects
9. **duties**: List of duty objects
10. **source_text**: Original input text
11. **metadata**: Parsing metadata

## ODRL ACTION MAPPINGS:
- "read" → "odrl:read"
- "print" → "odrl:print"
- "modify" → "odrl:modify"
- "distribute" → "odrl:distribute"
- "collect" → "odrl:reproduce"
- "store" → "odrl:archive"
- "use" → "odrl:use"
- "share" → "odrl:distribute"
- "delete" → "odrl:delete"
- "access" → "odrl:read"
- "stream" → "odrl:play"
- "download" → "odrl:reproduce"

## ODRL CONSTRAINT STRUCTURE:
Each constraint must have EXACTLY these three fields:
- **leftOperand**: The property being constrained (see valid options below)
- **operator**: MUST be one of the official ODRL operators (see list below)
- **rightOperand**: The value

### VALID ODRL OPERATORS (from spec):
You MUST use ONLY these operators:
- **odrl:eq** - equals
- **odrl:gt** - greater than
- **odrl:gteq** - greater than or equal
- **odrl:lt** - less than
- **odrl:lteq** - less than or equal
- **odrl:neq** - not equal
- **odrl:isA** - is a member of class
- **odrl:hasPart** - has part
- **odrl:isPartOf** - is part of
- **odrl:isAllOf** - is all of (requires all values)
- **odrl:isAnyOf** - is any of (matches any value)

### VALID LEFT OPERANDS (Common ODRL Terms):
- **odrl:dateTime** - specific date/time (format: YYYY-MM-DD or ISO 8601)
- **odrl:delayPeriod** - duration (format: ISO 8601 duration like P30D for 30 days)
- **odrl:elapsedTime** - time elapsed since some event
- **odrl:purpose** - purpose of use (e.g., "research", "commercial")
- **odrl:spatial** - geographic location
- **odrl:count** - number of uses
- **odrl:event** - specific event trigger
- **odrl:industry** - industry sector
- **odrl:language** - language code
- **odrl:recipient** - recipient party
- **odrl:product** - product type
- **odrl:absolutePosition** - position in sequence
- **odrl:relativePosition** - relative position
- **odrl:absoluteSize** - absolute size constraint
- **odrl:relativeSize** - relative size constraint

## CONSTRAINT EXAMPLES:
### Temporal Constraints:
- "expires on December 31, 2025" → 
  {{"leftOperand": "odrl:dateTime", "operator": "odrl:lteq", "rightOperand": "2025-12-31"}}

- "valid for 30 days" → 
  {{"leftOperand": "odrl:delayPeriod", "operator": "odrl:eq", "rightOperand": "P30D"}}

- "after 90 days" → 
  {{"leftOperand": "odrl:elapsedTime", "operator": "odrl:gteq", "rightOperand": "P90D"}}

### Purpose Constraints:
- "for research purposes" → 
  {{"leftOperand": "odrl:purpose", "operator": "odrl:eq", "rightOperand": "research"}}

- "for commercial or educational use" → 
  {{"leftOperand": "odrl:purpose", "operator": "odrl:isAnyOf", "rightOperand": "commercial,educational"}}

### Location Constraints:
- "in Germany" → 
  {{"leftOperand": "odrl:spatial", "operator": "odrl:eq", "rightOperand": "Germany"}}

- "within EU countries" → 
  {{"leftOperand": "odrl:spatial", "operator": "odrl:isPartOf", "rightOperand": "EU"}}

### Count Constraints:
- "up to 5 times" → 
  {{"leftOperand": "odrl:count", "operator": "odrl:lteq", "rightOperand": "5"}}

## EXAMPLE (MULTI-POLICY WITH CONSTRAINTS):
Input: "Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025."

Output:
{{
  "policies": [
    {{
      "policy_id": "p1",
      "policy_type": "odrl:Set",
      "assigner": "system",
      "assignee": ["user"],
      "rule_type": "permission",
      "actions": ["odrl:read", "odrl:print"],
      "targets": ["document"],
      "constraints": [
        {{
          "leftOperand": "odrl:dateTime",
          "operator": "odrl:lteq",
          "rightOperand": "2025-12-31"
        }}
      ],
      "duties": [],
      "source_text": "Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025.",
      "metadata": {{
        "sentence_index": 0,
        "parser_version": "1.0.0",
        "timestamp": ""
      }}
    }},
    {{
      "policy_id": "p2",
      "policy_type": "odrl:Set",
      "assigner": "system",
      "assignee": ["user"],
      "rule_type": "prohibition",
      "actions": ["odrl:modify", "odrl:distribute"],
      "targets": ["document"],
      "constraints": [
        {{
          "leftOperand": "odrl:dateTime",
          "operator": "odrl:lteq",
          "rightOperand": "2025-12-31"
        }}
      ],
      "duties": [],
      "source_text": "Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025.",
      "metadata": {{
        "sentence_index": 0,
        "parser_version": "1.0.0",
        "timestamp": ""
      }}
    }}
  ],
  "raw_text": "Users can read and print the document but cannot modify or distribute it. The policy expires on December 31, 2025.",
  "total_policies": 2
}}

## CRITICAL RULES:
1. NEVER invent operators - use ONLY the 11 official ODRL operators listed above
2. NEVER invent leftOperands - use ONLY standard ODRL terms or keep user's original term
3. Keep user's original wording in rightOperand (don't translate "user" to something else)
4. If unsure about a constraint, use the closest matching leftOperand and operator
5. For temporal constraints about expiration, use odrl:dateTime with odrl:lteq

CRITICAL GUARANTEE:
Do not alter or reinterpret user intent. If something cannot be confidently mapped to an ODRL term, preserve the original text in the output (e.g., under actions or constraints as raw strings).

## YOUR TASK:
Parse the following text and return valid JSON matching the schema above.

Input: {text}

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
