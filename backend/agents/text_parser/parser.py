# agents/text_parser/parser.py
"""
ODRL Policy Parser Agent (PPA) v5.0
Multi-Rule Extraction: Separates permissions, prohibitions, and duties
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate
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

# ===== CORE MODELS =====
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
    """Policy metadata"""
    sentence_index: int = 0
    parser_version: str = "5.0.0"
    timestamp: str = ""
    has_conflicting_constraints: bool = False

class PolicyRule(BaseModel):
    """Single ODRL Rule (Permission/Prohibition/Duty)"""
    rule_type: RuleType
    actions: List[str]
    constraints: List[Constraint] = Field(default_factory=list)
    duties: List[Duty] = Field(default_factory=list)

class ParsedPolicy(BaseModel):
    """Single ODRL Policy with multiple rules"""
    policy_id: str
    policy_type: PolicyType
    assigner: str
    assignee: List[str]
    targets: List[str]
    
    # Multi-rule structure
    rules: List[PolicyRule] = Field(default_factory=list)
    
    # Policy-level metadata
    temporal: Optional[TemporalExpression] = None
    source_text: str
    metadata: Metadata

class ParsedPolicies(BaseModel):
    """Parser output"""
    policies: List[ParsedPolicy]
    raw_text: str
    total_policies: int

# ===== EXTRACTION PROMPT =====
PURE_EXTRACTION_PROMPT = """You are a pure ODRL policy extractor. Your ONLY job is to extract and structure information from policy text.

## CRITICAL RULES:
1. **ONE INPUT = ONE POLICY with MULTIPLE RULES** - Extract all permissions, prohibitions, and duties as separate rules
2. **NO REASONING** - Do not judge, analyze, or evaluate the policy
3. **NO MODIFICATION** - Extract exactly what is stated
4. **SEPARATE RULES** - "can X but cannot Y" → TWO rules (permission for X + prohibition for Y)

## RULE EXTRACTION:

### 1. IDENTIFY RULE TYPES
Scan the text for THREE types of rules:

**PERMISSIONS (what IS allowed):**
- Keywords: "can", "may", "allowed to", "permitted to", "authorized to"
- Example: "Users **can read** and **print**" → permission with actions [read, print]

**PROHIBITIONS (what is NOT allowed):**
- Keywords: "cannot", "may not", "must not", "prohibited from", "forbidden to"
- Example: "Users **cannot modify** or **distribute**" → prohibition with actions [modify, distribute]

**DUTIES (what MUST be done):**
- Keywords: "must", "shall", "required to", "obligated to"
- Example: "Users **must attribute** the source" → duty with action [attribute]

### 2. EXTRACT EACH RULE SEPARATELY

**For the input:**
"Users can read and print the document but cannot modify or distribute it."

**Extract TWO rules:**

Rule 1 (Permission):
{{{{
  "rule_type": "permission",
  "actions": ["odrl:read", "odrl:print"],
  "constraints": []
}}}}

Rule 2 (Prohibition):
{{{{
  "rule_type": "prohibition",
  "actions": ["odrl:modify", "odrl:distribute"],
  "constraints": []
}}}}

### 3. CONSTRAINT ASSIGNMENT

Constraints apply to **specific rules** based on context:

**Global constraints** (apply to all rules):
- Temporal: "The policy expires on 2025-12-31" → Add to ALL rules
- Spatial: "Only in Germany" → Add to ALL rules

**Rule-specific constraints** (apply to one rule):
- "Users can download **for research purposes**" → Add only to download permission
- "Users cannot distribute **outside the EU**" → Add only to distribute prohibition

### 4. ACTION MAPPING
- read, view, access → **odrl:read**
- modify, edit, change → **odrl:modify**
- download, copy → **odrl:reproduce**
- share, distribute → **odrl:distribute**
- delete, remove → **odrl:delete**
- print → **odrl:print**
- execute, run → **odrl:execute**
- play, stream → **odrl:play**
- use → **odrl:use**
- archive, backup → **odrl:archive**

### 5. POLICY-LEVEL METADATA (Single per policy)
- policy_id: "policy_1"
- policy_type: "odrl:Set" / "odrl:Offer" / "odrl:Agreement"
- assigner: Organization/person granting rights
- assignee: Recipients of the policy
- targets: Assets the policy applies to

### 6. TEMPORAL OBJECT (Policy-level)
Extract from phrases like:
- "expires on 2025-12-31" → end_date
- "starting from 2025-01-01" → start_date
- "valid for 30 days" → duration

## OUTPUT STRUCTURE:

{{{{
  "policies": [
    {{{{
      "policy_id": "policy_1",
      "policy_type": "odrl:Set",
      "assigner": "not_specified",
      "assignee": ["user"],
      "targets": ["document"],
      "rules": [
        {{{{
          "rule_type": "permission",
          "actions": ["odrl:read", "odrl:print"],
          "constraints": [
            {{{{
              "leftOperand": "odrl:dateTime",
              "operator": "odrl:lteq",
              "rightOperand": "2025-12-31"
            }}}}
          ],
          "duties": []
        }}}},
        {{{{
          "rule_type": "prohibition",
          "actions": ["odrl:modify", "odrl:distribute"],
          "constraints": [
            {{{{
              "leftOperand": "odrl:dateTime",
              "operator": "odrl:lteq",
              "rightOperand": "2025-12-31"
            }}}}
          ],
          "duties": []
        }}}}
      ],
      "temporal": {{{{
        "end_date": "2025-12-31"
      }}}},
      "source_text": "...",
      "metadata": {{{{
        "sentence_index": 0,
        "parser_version": "5.0.0",
        "timestamp": "2025-11-17T16:00:00Z",
        "has_conflicting_constraints": false
      }}}}
    }}}}
  ],
  "total_policies": 1,
  "raw_text": "..."
}}}}

## REMEMBER:
- Extract permissions, prohibitions, and duties as SEPARATE rules
- Do NOT use "odrl:neq" operators for prohibitions
- Apply constraints to the correct rule based on context
- Let the Reasoner handle conflict detection between rules

Extract from this text:
{text}

{format_instructions}
"""

# ===== PARSER CLASS =====
class TextParser:
    """
    Pure ODRL Policy Parser v5.0
    Extracts permissions, prohibitions, and duties as separate rules
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
            Dict with parsed policy containing multiple rules
        """
        
        logger.info(f"[Parser] Starting multi-rule extraction...")
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
                policy.metadata.parser_version = "5.0.0"
            
            logger.info(f"[Parser] Extraction complete")
            logger.info(f"[Parser] Total policies: {result.total_policies}")
            
            #  FIXED LOGGING
            if result.total_policies > 0:
                policy = result.policies[0]
                
                if hasattr(policy, 'rules') and policy.rules:
                    logger.info(f"[Parser] Extracted {len(policy.rules)} rules:")
                    for idx, rule in enumerate(policy.rules, 1):
                        logger.info(f"[Parser]   Rule {idx}: {rule.rule_type} - Actions: {', '.join(rule.actions)}")
                        if rule.constraints:
                            logger.info(f"[Parser]     Constraints: {len(rule.constraints)}")
                
                logger.info(f"[Parser] Targets: {', '.join(policy.targets)}")
                
                if policy.metadata.has_conflicting_constraints:
                    logger.info(f"[Parser] Conflict markers present")
            
            return result.dict()
            
        except Exception as e:
            logger.error(f"[Parser] Error: {e}")
            raise
