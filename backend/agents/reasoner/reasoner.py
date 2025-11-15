# agents/reasoner/reasoner.py
"""
ODRL Reasoner Agent (RA) v3.0
PURE ANALYSIS - No data modification, just judgment
Acts as pre-generation quality gate for human-in-the-loop checkpoint
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
class ReasonerDecision(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    NEEDS_INPUT = "needs_input"

class IssueSeverity(str, Enum):
    HIGH = "high"    # Blocks generation
    LOW = "low"      # Can generate with warnings

class IssueCategory(str, Enum):
    MISSING_FIELD = "missing_field"
    VAGUE_TERM = "vague_term"
    AMBIGUOUS = "ambiguous"
    CONFLICT = "conflict"
    CONSTRAINT_CONFLICT = "constraint_conflict"
    INCOMPLETE_CONSTRAINT = "incomplete_constraint"
    EXPIRED_POLICY = "expired_policy"
    UNENFORCEABLE = "unenforceable"
    UNENFORCEABLE_TECHNICAL = "unenforceable_technical"
    UNENFORCEABLE_MONITORING = "unenforceable_monitoring"
    UNENFORCEABLE_LEGAL = "unenforceable_legal"

# ===== MODELS =====
class Issue(BaseModel):
    """Detected issue in parsed policy"""
    category: IssueCategory
    severity: IssueSeverity
    field: str
    policy_id: Optional[str] = None
    message: str
    suggestion: Optional[str] = None

class ReasoningResult(BaseModel):
    """Pure analysis output - NO data modification"""
    decision: ReasonerDecision
    confidence: float = Field(ge=0.0, le=1.0)
    issues: List[Issue] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    reasoning: str
    risk_level: str
    policies_analyzed: int

# ===== PURE REASONING PROMPT =====
PURE_REASONER_PROMPT = """You are an ODRL Policy Quality Gate. Analyze if parsed data can generate valid ODRL.

## YOUR JOB: PURE ANALYSIS
Decide: approve, reject, or needs_input
Do NOT: modify data, add fields, fix issues, complete information

## CURRENT DATE: {current_date}

## DECISION RULES:

### HIGH ISSUES → reject or needs_input:

**Action Issues:**
- Empty actions list
- Vague actions: "everything", "something", "do", "things", "stuff"
- Actions without odrl: prefix (non-standard)

**Actor Issues:**
- Missing assigner in Offer/Agreement policies
- Missing assignee in Agreement policies
- Generic assignee: "everyone", "anyone", "users" (too broad)

**Conflict Issues:**
- Direct action conflicts: same action both permitted AND prohibited
- Purpose conflicts: permission for purpose="research" AND prohibition for purpose="research"
- Location conflicts: allowed in location="Germany" AND prohibited in location="Germany"
- Role conflicts: allowed for role="researcher" AND prohibited for role="researcher"
- Temporal conflicts: overlapping time periods with contradictory rules

**Constraint Conflicts:**
- Contradictory purposes: "for research" vs "non-commercial" in same policy
- Conflicting locations: "only in EU" vs "only in Germany" (redundant?)
- Incompatible roles: "for students" vs "for faculty only"

**Temporal Issues:**
- Expired policies (date before {current_date})
- Ambiguous time: "soon", "later", "a while", "sometime"

**Enforceability Issues:**
- **Impossible to monitor:** "cannot think about", "cannot remember", "cannot discuss privately"
- **Technologically unenforceable:** "cannot screenshot", "cannot copy-paste" (without technical controls)
- **Overly broad/vague:** "must use responsibly", "should be careful" (undefined criteria)
- **Contradicts reality:** "can execute but cannot run", "can download but not save"
- **Requires omniscient monitoring:** "cannot share with anyone ever", "all copies destroyed"
- **Legal/jurisdiction issues:** "users in any country follow German law", "liable for others' actions"

**Unenforceable Verbs:**
- Mental: "think", "remember", "intend", "believe", "consider"
- Private: "discuss privately", "tell friends", "talk about"
- Absolute: "never ever", "anywhere in universe", "forever"

### LOW ISSUES → approve with warnings:
- Missing temporal constraints (no expiry date)
- Broad permissions without duties
- No constraints specified (overly permissive)
- Policy type is generic "Set" when should be Offer/Agreement
- No duties attached to permissions
- Simple policy structure
- Missing optional metadata

## CONFLICT DETECTION EXAMPLES:

**Action Conflict (HIGH):**
Policy 1: permission to read document.pdf
Policy 2: prohibition to read document.pdf
→ CONFLICT: Cannot both allow and deny same action on same target

**Purpose Conflict (HIGH):**
Constraints: purpose=research AND purpose≠research
→ CONFLICT: Contradictory purpose requirements

**Location Conflict (HIGH):**
Permission: spatial=Germany
Prohibition: spatial=Germany, same action
→ CONFLICT: Same location, contradictory rules

**Role Conflict (HIGH):**
Permission: role=researcher
Prohibition: role=researcher, same action
→ CONFLICT: Same role, contradictory rules

## ENFORCEABILITY EXAMPLES:

**Enforceable (Good):**
- "Users can read document.pdf until 2025-12-31" → Time-limited, clear
- "Access only via connector X" → Technical control exists
- "Must attribute source in publications" → Verifiable action
- "Cannot distribute outside organization" → Organizationally enforceable
- "Must delete data within 30 days" → Clear timeframe

**Unenforceable (Bad - HIGH issue):**
- "Users cannot tell anyone about data" → Cannot monitor speech
- "Users must not think negatively" → Cannot control thoughts
- "Cannot screenshot or photo screen" → No technical controls
- "All copies everywhere destroyed" → Cannot verify globally
- "Cannot use data in bad ways" → "Bad" undefined
- "Users responsible for all future uses" → Impossible scope

## RECOMMENDATIONS FOR UNENFORCEABLE:
- Replace "cannot tell anyone" with "cannot publicly redistribute"
- Replace "cannot screenshot" with "access only via secure viewer with DRM"
- Replace "use responsibly" with specific: purpose=research, non-commercial
- Add technical controls: "access only through authenticated API"
- Replace "all copies destroyed" with "delete local copies within 30 days"

## RISK LEVELS:
- **low**: Specific actors, restrictive actions, has constraints, not expired, no conflicts, enforceable
- **medium**: Some vague terms, broad permissions, minor ambiguities
- **high**: Missing fields, conflicts, overly permissive, expired, unenforceable

## CONFIDENCE SCORING:
- 0.95-1.0: Perfect, ready for generation
- 0.8-0.94: Good, minor issues only
- 0.7-0.79: Acceptable, low issues
- 0.5-0.69: Multiple high issues
- 0.3-0.49: Critical issues
- 0.1-0.29: Fatal issues

## DECISION LOGIC:
1. ANY HIGH issue → reject or needs_input (confidence 0.3-0.7)
2. Only LOW issues → approve (confidence 0.7-0.95)
3. No issues → approve (confidence 0.95-1.0)

## PARSED DATA:
{parsed_data}

## ORIGINAL TEXT:
{original_text}

{format_instructions}

Return valid JSON with: decision, confidence, issues, recommendations, reasoning, risk_level, policies_analyzed
"""

# ===== REASONER CLASS =====
class Reasoner:
    """
    Pure ODRL Policy Analysis Agent
    Only judges quality - does NOT modify data
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
    
    def reason(self, parsed_data: Dict[str, Any], original_text: str) -> Dict[str, Any]:
        """
        Pure policy analysis - No data modification
        
        Args:
            parsed_data: Parser output (dict)
            original_text: User's original input text
            
        Returns:
            ReasoningResult with decision, issues, recommendations
        """
        
        current_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        logger.info(f"[Reasoner] Starting pure analysis...")
        logger.info(f"[Reasoner] Current date: {current_date}")
        logger.info(f"[Reasoner] Analyzing {parsed_data.get('total_policies', 0)} policies")
        logger.info(f"[Reasoner] Original text: {original_text[:50]}...")
        
        try:
            parser = PydanticOutputParser(pydantic_object=ReasoningResult)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", PURE_REASONER_PROMPT),
                ("human", "{parsed_data}\n\n{original_text}\n\n{format_instructions}")
            ])
            
            chain = prompt | self.llm | parser
            
            result = chain.invoke({
                "current_date": current_date,
                "parsed_data": str(parsed_data),
                "original_text": original_text,
                "format_instructions": parser.get_format_instructions()
            })
            
            logger.info(f"[Reasoner] ✓ Analysis complete")
            logger.info(f"[Reasoner] Decision: {result.decision.upper()}")
            logger.info(f"[Reasoner] Confidence: {result.confidence:.0%}")
            logger.info(f"[Reasoner] Risk: {result.risk_level.upper()}")
            logger.info(f"[Reasoner] Issues: {len(result.issues)}")
            
            # Log high severity issues
            high_issues = [i for i in result.issues if i.severity == IssueSeverity.HIGH]
            if high_issues:
                logger.warning(f"[Reasoner] ⚠️  {len(high_issues)} HIGH ISSUES:")
                for issue in high_issues:
                    logger.warning(f"[Reasoner]    - {issue.field}: {issue.message}")
            
            # Log recommendations
            if result.recommendations:
                logger.info(f"[Reasoner] Recommendations: {len(result.recommendations)}")
                for i, rec in enumerate(result.recommendations[:3], 1):
                    logger.info(f"[Reasoner]    {i}. {rec}")
            
            return result.dict()
            
        except Exception as e:
            logger.error(f"[Reasoner] ✗ Error: {e}")
            raise