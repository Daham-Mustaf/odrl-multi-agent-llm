"""
Agent 2: ODRL Reasoner
Pure validation layer: completeness, consistency, conflicts, enforceability
Binary decision: can_generate = true/false (no suggestions, no inference)
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from utils.llm_factory import LLMFactory


# ===== ENUMS =====
class IssueSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class IssueCategory(str, Enum):
    MISSING_FIELD = "missing_field"
    VAGUE_TERM = "vague_term"
    AMBIGUOUS = "ambiguous"
    CONFLICT = "conflict"
    INCOMPLETE_CONSTRAINT = "incomplete_constraint"
    EXPIRED_POLICY = "expired_policy"


# ===== MODELS =====
class Issue(BaseModel):
    """Detected issue in parsed policy"""
    category: IssueCategory
    severity: IssueSeverity
    field: str
    description: str
    suggestion: Optional[str] = None


class Inference(BaseModel):
    """Inferred missing information"""
    field: str
    inferred_value: str
    reasoning: str
    confidence: float = Field(ge=0.0, le=1.0)


class Conflict(BaseModel):
    """Policy conflict detection"""
    policy_ids: List[str]
    conflict_type: str
    description: str
    severity: IssueSeverity


class ReasonedPolicy(BaseModel):
    """Single policy after reasoning"""
    policy_id: str
    issues: List[Issue] = Field(default_factory=list)
    inferences: List[Inference] = Field(default_factory=list)
    is_valid: bool
    is_complete: bool
    needs_user_input: bool


class ReasoningResult(BaseModel):
    """Complete reasoning output"""
    policies: List[ReasonedPolicy]
    global_conflicts: List[Conflict] = Field(default_factory=list)
    overall_status: str  # "valid", "invalid", "needs_clarification"
    risk_assessment: str  # "low", "medium", "high"
    summary: str
    recommendations: List[str] = Field(default_factory=list)


# ===== PROMPT =====
def get_reasoner_prompt(current_date: str) -> str:
    return f"""You are an ODRL policy reasoning expert. Analyze parsed policies for completeness, validity, and conflicts.

CURRENT DATE: {current_date}
Use this date to validate temporal constraints (check for expired policies).

## YOUR JOB:
1. Validate - Check if policies are complete and well-formed
2. Detect Issues - Flag missing fields, vague terms, ambiguities, expired policies
3. Infer - Suggest reasonable defaults for missing information (but do not modify original)
4. Find Conflicts - Detect contradictions between policies
5. Assess Risk - Evaluate overall policy risk level

## ANALYSIS RULES:

### 1. CHECK FOR MISSING/VAGUE FIELDS:

**Critical Issues (must be fixed):**
- assigner: "not_specified" in Offer/Agreement policies
- assignee: "not_specified" in Agreement policies
- Empty actions list: actions: []
- Vague actions: "everything", "something", "do", "things"
- Vague targets: "not_specified", "everything"
- Expired policies: expiration date in the past (compare with current date above)

**Medium Issues (should clarify):**
- Generic assignee: "everyone", "anyone", "all"
- Ambiguous actions not mapped to ODRL (actions without odrl: prefix)
- Missing constraints where expected (e.g., temporal limits on permissions)

**Low Issues (informational):**
- No duties attached to permission
- No constraints specified

### 2. INFER MISSING INFORMATION (suggest, do not change):

For missing fields, suggest reasonable defaults:
- assigner: "not_specified" → Infer: "system" or "policy_owner"
- Vague action "everything" → Suggest: List specific ODRL actions user might mean
- Missing temporal constraint → Suggest: Add expiration date

### 3. DETECT CONFLICTS:

**Direct conflicts:**
- Same action both permitted and prohibited for same assignee/target
- Overlapping permissions with contradictory constraints

**Logical conflicts:**
- Permission duration longer than target resource availability
- Duty that contradicts the permission

### 4. ASSESS VALIDITY:

**Policy is VALID if:**
- All required fields present (assigner for Offer/Agreement, assignee for Agreement)
- Actions are specific (mapped to ODRL or clearly defined)
- No critical issues
- No conflicts
- Not expired

**Policy is INCOMPLETE if:**
- Has vague/ambiguous terms
- Missing optional but important fields
- Needs user clarification

**Policy NEEDS USER INPUT if:**
- Critical fields missing
- Actions are completely vague
- Has conflicts that cannot be auto-resolved
- Policy has expired

### 5. RISK ASSESSMENT:

**Low Risk:**
- All fields specified
- Actions are restrictive (read-only)
- Temporal/spatial constraints present
- No conflicts
- Not expired

**Medium Risk:**
- Some vague terms
- Broad permissions without constraints
- Minor conflicts

**High Risk:**
- Critical missing fields
- Overly permissive (e.g., "everyone can do everything")
- No constraints on sensitive actions
- Major conflicts
- Policy expired

## INPUT FORMAT:
{{{{
  "policies": [
    {{{{
      "policy_id": "p1",
      "policy_type": "odrl:Set",
      "assigner": "string or not_specified",
      "assignee": ["string"],
      "rule_type": "permission|prohibition|duty",
      "actions": ["odrl:action or vague_term"],
      "targets": ["string or not_specified"],
      "constraints": [...],
      "duties": [...],
      "source_text": "..."
    }}}}
  ],
  "raw_text": "...",
  "total_policies": 1
}}}}

## OUTPUT FORMAT:
{{{{
  "policies": [
    {{{{
      "policy_id": "p1",
      "issues": [
        {{{{
          "category": "vague_term",
          "severity": "high",
          "field": "actions",
          "description": "Action 'everything' is too vague and cannot be enforced",
          "suggestion": "Specify concrete actions like: odrl:read, odrl:write, odrl:modify"
        }}}},
        {{{{
          "category": "expired_policy",
          "severity": "critical",
          "field": "constraints",
          "description": "Policy has already expired (expiration date 2020-01-01 is before current date {current_date})",
          "suggestion": "Update expiration date to a future date or remove temporal constraint"
        }}}}
      ],
      "inferences": [
        {{{{
          "field": "assigner",
          "inferred_value": "system",
          "reasoning": "No assigner specified in generic policy, defaulting to system",
          "confidence": 0.7
        }}}}
      ],
      "is_valid": false,
      "is_complete": false,
      "needs_user_input": true
    }}}}
  ],
  "global_conflicts": [],
  "overall_status": "needs_clarification",
  "risk_assessment": "high",
  "summary": "Policy has critical issues that require user clarification before it can be enforced.",
  "recommendations": [
    "Replace vague action 'everything' with specific ODRL actions",
    "Update expired policy dates",
    "Add temporal constraints to limit permission duration",
    "Specify concrete target resources"
  ]
}}}}

## CORE PRINCIPLE:
Be thorough but practical. Flag real issues that would prevent policy enforcement. Suggest helpful inferences but never modify the original parsed data.

Analyze these policies:
{{parsed_data}}

{{format_instructions}}
"""


# ===== REASONER CLASS =====
class Reasoner:
    """Agent 2: Validate and analyze parsed policies"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        self.model = model
        self.temperature = temperature
        self.custom_config = custom_config
        
        self.llm = LLMFactory.create_llm(
            model=model,
            temperature=temperature,
            custom_config=custom_config
        )
    
    def reason(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze parsed policies - ONE LLM CALL"""
        
        # Get current date for temporal validation
        current_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        print(f"[Reasoner] Starting analysis...")
        print(f"[Reasoner] Current date: {current_date}")
        print(f"[Reasoner] Analyzing {parsed_data.get('total_policies', 1)} policies...")
        
        try:
            # Create parser
            parser = PydanticOutputParser(pydantic_object=ReasoningResult)
            
            # Get prompt with current date
            prompt_text = get_reasoner_prompt(current_date)
            
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", prompt_text),
                ("human", "{parsed_data}\n\n{format_instructions}")
            ])
            
            # Build chain
            chain = prompt | self.llm | parser
            
            # Invoke
            result = chain.invoke({
                "parsed_data": str(parsed_data),
                "format_instructions": parser.get_format_instructions()
            })
            
            print(f"[Reasoner] Analysis complete")
            print(f"[Reasoner] Overall status: {result.overall_status}")
            print(f"[Reasoner] Risk assessment: {result.risk_assessment}")
            
            total_issues = sum(len(p.issues) for p in result.policies)
            print(f"[Reasoner] Found {total_issues} issues across all policies")
            
            return result.dict()
            
        except Exception as e:
            print(f"[Reasoner] Error: {e}")
            raise