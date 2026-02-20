# agents/reasoner/reasoner.py
"""
ODRL Reasoner Agent (RA) v4.0
UNIVERSAL CONTRADICTION DETECTOR
Use-case independent systematic analysis
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
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
    # Vagueness issues
    MISSING_FIELD = "missing_field"
    VAGUE_TERM = "vague_term"
    AMBIGUOUS = "ambiguous"
    
    # Intra-policy contradictions
    CONFLICT = "conflict"
    CONSTRAINT_CONFLICT = "constraint_conflict"
    INCOMPLETE_CONSTRAINT = "incomplete_constraint"
    
    # Cross-policy contradictions
    CROSS_POLICY_CONFLICT = "cross_policy_conflict"
    TEMPORAL_CONFLICT = "temporal_conflict"
    SPATIAL_CONFLICT = "spatial_conflict"
    ACTOR_CONFLICT = "actor_conflict"
    ACTION_CONFLICT = "action_conflict"
    USAGE_LIMIT_CONFLICT = "usage_limit_conflict"
    
    # Special contradictions
    EXPIRED_POLICY = "expired_policy"
    CIRCULAR_DEPENDENCY = "circular_dependency"
    ROLE_HIERARCHY_CONFLICT = "role_hierarchy_conflict"
    TECHNICAL_IMPOSSIBILITY = "technical_impossibility"
    LEGAL_COMPLIANCE_CONFLICT = "legal_compliance_conflict"
    RESOURCE_CONSTRAINT_CONFLICT = "resource_constraint_conflict"
    
    # Enforceability
    UNENFORCEABLE = "unenforceable"
    UNENFORCEABLE_TECHNICAL = "unenforceable_technical"
    UNENFORCEABLE_MONITORING = "unenforceable_monitoring"
    UNENFORCEABLE_LEGAL = "unenforceable_legal"
    
    # Scope issues
    OVERLY_BROAD = "overly_broad_policy"
    INCOMPLETE_CONDITION = "incomplete_condition_handling"

# ===== MODELS =====
class Issue(BaseModel):
    """Detected issue in parsed policy"""
    category: IssueCategory
    severity: IssueSeverity
    field: str
    policy_id: Optional[str] = None
    message: str
    suggestion: Optional[str] = None
    conflict_type: Optional[str] = Field(
        default=None,
        description="Type of conflict detected. MUST be one of the 12 specific conflict types: 'unmeasurable_terms', 'temporal_overlap', 'temporal_expired_policy', 'temporal_impossible_sequence', 'spatial_hierarchy_conflict', 'spatial_overlap_conflict', 'action_hierarchy_conflict', 'action_subsumption_conflict', 'role_hierarchy_conflict', 'party_specification_inconsistency', 'circular_approval_dependency', 'workflow_cycle_conflict'. If a conflict is detected, this field MUST be set to the appropriate type."
    )

class ReasoningResult(BaseModel):
    """Pure analysis output - NO data modification"""
    decision: ReasonerDecision
    confidence: float = Field(ge=0.0, le=1.0)
    issues: List[Issue] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    reasoning: str
    risk_level: str
    policies_analyzed: int

# ===== UNIVERSAL REASONING PROMPT =====
UNIVERSAL_REASONER_PROMPT = """You are a universal ODRL Policy Contradiction Detector.
Your job: Analyze policy sets for ANY logical contradiction, regardless of domain.

## CORE ANALYSIS FRAMEWORK

### CURRENT DATE: {current_date}

### SYSTEMATIC CONTRADICTION DETECTION

You must check for contradictions across these dimensions:

#### 1. INTRA-POLICY CONSTRAINT CONFLICTS

**CRITICAL: Check for mutually exclusive constraints within a SINGLE policy:**

If a policy has multiple constraints with different constraint_group values on the same leftOperand, this indicates a contradiction.

**Rule:** If constraint_group is present and multiple constraints have the same leftOperand but different groups, this is a HIGH severity contradiction.

**Example patterns:**
- Multiple purpose constraints with different constraint_group values
- Multiple count constraints with different constraint_group values  
- Multiple temporal constraints with different constraint_group values

If metadata.has_conflicting_constraints is true, examine the constraints array for conflicts.

#### 2. ACTOR CONTRADICTIONS
**Check if policies conflict on WHO can do something:**

- Same actor given BOTH permission AND prohibition for same action/asset
- Actor restrictions that overlap: "only UC4" vs "all partners" (if UC4 is a partner)
- Role hierarchy conflicts: "managers allowed" + "administrators prohibited" + "all managers are administrators"
- Universal quantifiers: "everyone" vs "nobody", "all users" vs "no users"

**Examples:**
- "UC4 can access dataset" + "UC4 cannot access dataset"
- "Only researchers" + "All registered users" (if researchers are users)
- "Managers allowed" + "All administrators prohibited" + "Managers are administrators"

#### 3. ACTION CONTRADICTIONS
**Check if policies conflict on WHAT can be done:**

- Same action both permitted AND prohibited on same asset
- Action hierarchy conflicts: "can use" vs "cannot read" (if use includes read)
- Contradictory action types: "can modify" + "cannot modify"

**Examples:**
- "Can read document.pdf" + "Cannot read document.pdf"
- "Can use dataset" + "Cannot access dataset" (use requires access)
- "Researchers can modify metadata" + "Metadata must not be modified"

#### 4. ASSET/TARGET CONTRADICTIONS
**Check if policies conflict on WHICH resources:**

- Same asset subject to contradictory rules
- Asset hierarchy conflicts: "all datasets" vs "dataset X prohibited"

**Examples:**
- Permission on dataset:123 + Prohibition on dataset:123

#### 5. TEMPORAL CONTRADICTIONS
**Check if policies conflict on WHEN:**

- Overlapping time windows with contradictory rules
- Expired policies (before current date: {current_date})
- Contradictory time constraints: "until 2025" + "indefinitely"
- Impossible sequences: "available after 2025" + "can use in 2024"

**Examples:**
- "Access 9am-5pm" + "Prohibited 2pm-6pm" (overlap: 2-5pm)
- "Until Jan 1, 2025" + "Indefinitely"
- "Available only after 2025" + "Can use in 2024 for education"
- "Permitted before Jan 1, 2020" (current: {current_date}) → EXPIRED

#### 6. SPATIAL/LOCATION CONTRADICTIONS
**Check if policies conflict on WHERE:**

- Geographic hierarchy conflicts: "allowed in Germany" + "prohibited in EU" (Germany ⊂ EU)
- Overlapping locations with contradictory rules
- Location containment: broader region prohibits what narrower region allows

**Examples:**
- "Access in Germany only" + "Prohibited in all EU countries" (Germany is in EU)
- "Allowed in Berlin" + "Prohibited in Germany" (Berlin ⊂ Germany)

#### 7. QUANTITATIVE/USAGE LIMIT CONTRADICTIONS
**Check if policies conflict on HOW MUCH:**

- Contradictory count limits: "30 times" + "unlimited"
- Contradictory size limits: "max 1024 MiB" + "min 2048 MiB"
- Contradictory bandwidth: "max 20 Mbit/s" + "min 50 Mbit/s"
- Contradictory concurrency: "max 5 connections" + "min 10 connections"
- Percentage conflicts: "aggregate 100%" + "aggregate max 50%"

**Examples:**
- "Use up to 30 times" + "Unlimited access" (for same actor/asset/action)
- "Read max 1024 MiB" + "Must read at least 2048 MiB"
- "Aggregate 100% of File1" + "Aggregate max 50% of File1"

#### 8. PURPOSE/CONSTRAINT CONTRADICTIONS
**Check if policies conflict on WHY/UNDER WHAT CONDITIONS:**

- Contradictory purposes: "for research" + "not for research"
- Overlapping purposes: "educational only" + "any purpose"
- Contradictory constraints: "must inform provider" + "must not inform provider"
- Data handling conflicts: "delete before July 10" + "retain until Dec 31"

**Examples:**
- "For research purpose" + "Prohibited for research"
- "Must inform provider after use" + "Prohibited from informing provider"
- "Delete before 2023-07-10" + "Retain until 2023-12-31"

#### 9. TECHNICAL FEASIBILITY CONTRADICTIONS
**Check for technically impossible requirements:**

- Mutually exclusive states: "encrypted" + "plaintext" (same file)
- Resource impossibilities: "process 8K in 5 seconds on consumer hardware"
- Quality conflicts: "must conform to SHACL shape X" + "must not conform to SHACL shape X"

**Examples:**
- "Encrypted with AES-256" + "Stored as plaintext" (single file)
- "Conform to SHACL shape" + "Must not conform to same shape"
- "8K conversion + AI analysis + lossless compression in 5s on standard CPU"

#### 10. CIRCULAR DEPENDENCIES
**Check for approval/process loops:**

- Step A requires Step B, Step B requires Step C, Step C requires Step A

**Example:**
- "Access needs Committee approval" → "Committee needs Rights verification" → "Rights needs preliminary access"

#### 11. UNMEASURABLE/VAGUE CONDITIONS (HIGH SEVERITY)

**CRITICAL: Policies with unmeasurable conditions MUST be rejected**

Check for undefined or subjective terms that make enforcement impossible:

**Unmeasurable temporal terms (HIGH):**
- "urgent", "soon", "later", "a while", "sometime", "eventually", "promptly", "quickly"
- These have no objective definition and cannot be enforced consistently

**Unmeasurable quality terms (HIGH):**
- "responsibly", "appropriately", "properly", "carefully", "reasonable", "good", "bad"
- These are subjective and cannot be measured or verified

**Unmeasurable conditions (HIGH):**
- "if important", "when necessary", "as needed", "when appropriate", "if significant"
- These lack objective criteria for determination

**Unmeasurable actors (HIGH):**
- "everyone", "anyone", "nobody", "somebody" (without specific scope)
- Too broad to enforce practically

**Examples of REJECT cases:**
- "If request is urgent, expedite" → What defines "urgent"? No measurable criteria
- "Use data responsibly" → What is "responsible"? Subjective and unenforceable
- "Access when necessary" → Who determines "necessary"? No objective measure
- "Everyone can access everything" → No specific scope or constraints

**Why these are HIGH severity:**
- Implementation teams cannot create consistent enforcement rules
- Different people will interpret terms differently
- Creates legal ambiguity and disputes
- Violates ODRL principle of machine-readable, enforceable policies

**What to suggest:**
- Replace "urgent" with specific criteria: "submitted within 48 hours of deadline" or "priority level ≥ 5"
- Replace "responsibly" with specific constraints: "for non-commercial purposes only" or "with proper attribution"
- Replace "when necessary" with objective triggers: "when storage exceeds 80% capacity"
- Replace broad actors with specific roles: "registered researchers" instead of "anyone"

#### 12. OVERLY BROAD/VAGUE POLICIES
**Check for unimplementable generalities:**

- Universal quantifiers without specificity: "everyone can access everything"
- Total prohibitions: "nobody can do anything"
- Policies that lack specific actors, assets, or constraints

**Examples:**
- "Everyone can access everything" (no actors, assets, or constraints defined)
- "Nobody can do anything" (universal prohibition)

#### 13. INCOMPLETE CONDITION HANDLING
**Check for missing branches:**

- Policy handles approval but not denial
- Defines success path but not failure path

**Example:**
- "Approved requests forwarded to Rights Dept" (no handling for denials)

#### 14. UNENFORCEABLE RULES
**Check for monitoring impossibility:**

- Mental states: "cannot think about", "must not intend"
- Private actions: "cannot tell anyone", "cannot discuss privately"
- Absolute scope: "all copies everywhere destroyed"

**Examples:**
- "Users cannot tell anyone about data" (cannot monitor speech)
- "Cannot screenshot" (without DRM/technical controls)

---

## ANALYSIS METHODOLOGY

### Step 1: Check for Intra-Policy Conflicts
For each policy, check if:
- metadata.has_conflicting_constraints is true
- Multiple constraints have same leftOperand but different constraint_group values
- If YES → HIGH severity contradiction

### Step 2: Check for Unmeasurable/Vague Terms (CRITICAL)
Scan the entire policy text and constraints for:
- Undefined temporal terms: "urgent", "soon", "promptly"
- Undefined quality terms: "responsibly", "appropriately"
- Undefined conditions: "if important", "when necessary"
- If ANY found → HIGH severity, REJECT

### Step 3: Parse Policy Set
Extract all policies and their components:
- Actors (assigner, assignee)
- Actions (permission, prohibition, duty)
- Assets (target)
- Constraints (temporal, spatial, purpose, count, etc.)

### Step 4: Cross-Reference Policies
For each pair of policies, check if they share:
- Same actor? → Check for actor contradictions
- Same asset? → Check for asset contradictions
- Same action? → Check for action contradictions
- Overlapping time? → Check for temporal contradictions
- Overlapping space? → Check for spatial contradictions

### Step 5: Constraint Analysis
Within each policy and across policies:
- Are quantitative limits consistent?
- Are purposes compatible?
- Are conditions complete and measurable?
- Are technical requirements feasible?

### Step 6: Temporal Validation
- Are any policies expired (before {current_date})?
- Do time windows overlap with contradictory rules?

### Step 7: Enforceability Check
- Can the policy be monitored?
- Are technical controls possible?
- Are conditions measurable?

---

## DECISION RULES

### REJECT (confidence 0.3-0.7) if ANY:
1. **Unmeasurable/vague terms present** ("urgent", "soon", "responsibly", "when necessary", etc.)
2. Intra-policy constraint conflict (has_conflicting_constraints=true with conflicting constraint_group values)
3. Direct contradiction found (permission + prohibition on same thing)
4. Quantitative conflicts (30 uses + unlimited)
5. Temporal conflicts (expired, overlapping contradictions)
6. Spatial conflicts (geographic hierarchy violation)
7. Technical impossibility
8. Circular dependency
9. Overly broad without specificity
10. Unenforceable without technical controls

### NEEDS_INPUT (confidence 0.5-0.7) if:
- Vague terms exist but could be clarified with user input
- Ambiguous terms need definition
- Missing information prevents full analysis

### APPROVE (confidence 0.7-1.0) if:
- No high-severity issues
- All terms are measurable and objective
- All constraints have clear criteria
- Only low-severity issues (missing optional fields)
- Policies are enforceable

---

## SEVERITY CLASSIFICATION

### HIGH SEVERITY (blocks generation):
- **Unmeasurable/vague terms** (urgent, soon, responsibly, etc.)
- Any logical contradiction
- Intra-policy constraint conflicts
- Expired policies
- Unenforceable rules
- Technical impossibilities
- Circular dependencies
- Overly broad without specificity

### LOW SEVERITY (approve with warnings):
- Missing optional fields (temporal, duties)
- Lack of constraints (overly permissive but not contradictory)
- Generic policy types

---

## OUTPUT FORMAT

For each issue found, specify:
- **category**: Which type of contradiction or issue
- **severity**: HIGH or LOW
- **field**: Which field/constraint is involved
- **policy_id**: Which policy/policies
- **message**: Clear description of the issue
- **suggestion**: How to resolve it (with specific measurable criteria)
- **conflict_type**: Type of conflict detected. **MUST be one of the following 12 specific types if a conflict is detected, otherwise use None:**

### CONFLICT TYPE DEFINITIONS (12 types):

1. **unmeasurable_terms** - Policy contains vague, unmeasurable, or subjective terms that cannot be objectively enforced (e.g., "urgent", "soon", "responsibly", "everyone", "nobody", "when necessary")

2. **temporal_overlap** - Conflicting temporal constraints that overlap or contradict each other (e.g., "access 9am-5pm" + "prohibited 2pm-6pm", "until 2025" + "indefinitely", contradictory count/usage limits)

3. **temporal_expired_policy** - Policy has expired (validity period is before current date)

4. **temporal_impossible_sequence** - Temporally impossible sequence of events (e.g., "available after 2025" + "can use in 2024", "delete before X" + "use after X" where X is the same date)

5. **spatial_hierarchy_conflict** - Geographic hierarchy conflicts (e.g., "allowed in Germany" + "prohibited in EU" where Germany is in EU)

6. **spatial_overlap_conflict** - Overlapping spatial locations with contradictory rules

7. **action_hierarchy_conflict** - Action hierarchy conflicts (e.g., "can use" + "cannot read" where use includes read, "can modify" + "cannot modify")

8. **action_subsumption_conflict** - Action subsumption conflicts where one action includes another but policies conflict

9. **role_hierarchy_conflict** - Role hierarchy conflicts (e.g., "managers allowed" + "administrators prohibited" + "all managers are administrators")

10. **party_specification_inconsistency** - Party/actor specification inconsistencies (e.g., "only UC4" + "all registered users" where UC4 is a user)

11. **circular_approval_dependency** - Circular approval or dependency loops (e.g., "Access needs Committee approval" → "Committee needs Rights verification" → "Rights needs preliminary access")

12. **workflow_cycle_conflict** - Workflow cycle conflicts where steps form a circular dependency

**CRITICAL**: If you detect ANY conflict, you MUST set conflict_type to the most specific matching type from the above list. Do NOT use generic terms like "actor_conflict" or "temporal_conflict" - use the specific types listed above.

---

## PARSED DATA:
{parsed_data}

## ORIGINAL TEXT:
{original_text}

{format_instructions}

**CRITICAL INSTRUCTIONS:**
1. FIRST scan for unmeasurable/vague terms - if ANY found → immediate HIGH severity, REJECT
2. THEN check for intra-policy conflicts (constraint_group with has_conflicting_constraints=true)
3. Analyze the ENTIRE policy set as one system
4. Check EVERY dimension of contradiction (actor, action, asset, time, space, quantity, purpose, technical)
5. Do NOT assume domain-specific logic - detect contradictions universally
6. Flag ANY logical inconsistency or unmeasurable term as HIGH severity
7. Return structured JSON with all detected issues

Return valid JSON with: decision, confidence, issues, recommendations, reasoning, risk_level, policies_analyzed
"""

# ===== REASONER CLASS =====
class Reasoner:
    """
    Universal ODRL Policy Contradiction Detector
    Use-case independent systematic analysis
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
        Universal contradiction detection - No data modification
        
        Args:
            parsed_data: Parser output (dict)
            original_text: User's original input text
            
        Returns:
            ReasoningResult with decision, issues, recommendations
        """
        
        current_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        logger.info(f"[Reasoner] Starting universal contradiction detection...")
        logger.info(f"[Reasoner] Current date: {current_date}")
        logger.info(f"[Reasoner] Analyzing {parsed_data.get('total_policies', 0)} policies")
        logger.info(f"[Reasoner] Original text: {original_text[:100]}...")
        
        try:
            parser = PydanticOutputParser(pydantic_object=ReasoningResult)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", UNIVERSAL_REASONER_PROMPT),
                ("human", "Analyze this policy set for contradictions:\n\n{parsed_data}\n\nOriginal: {original_text}\n\n{format_instructions}")
            ])
            
            chain = prompt | self.llm | parser
            
            result = chain.invoke({
                "current_date": current_date,
                "parsed_data": str(parsed_data),
                "original_text": original_text,
                "format_instructions": parser.get_format_instructions()
            })
            
            logger.info(f"[Reasoner]  Analysis complete")
            logger.info(f"[Reasoner] Decision: {result.decision.upper()}")
            logger.info(f"[Reasoner] Confidence: {result.confidence:.0%}")
            logger.info(f"[Reasoner] Risk: {result.risk_level.upper()}")
            logger.info(f"[Reasoner] Issues: {len(result.issues)}")
            
            # Log high severity issues
            high_issues = [i for i in result.issues if i.severity == IssueSeverity.HIGH]
            if high_issues:
                logger.warning(f"[Reasoner]   {len(high_issues)} HIGH ISSUES:")
                for issue in high_issues:
                    logger.warning(f"[Reasoner]    - [{issue.category}] {issue.field}: {issue.message}")
            
            # Log recommendations
            if result.recommendations:
                logger.info(f"[Reasoner] Recommendations: {len(result.recommendations)}")
                for i, rec in enumerate(result.recommendations[:3], 1):
                    logger.info(f"[Reasoner]    {i}. {rec}")
            
            return result.dict()
            
        except Exception as e:
            logger.error(f"[Reasoner] ✗ Error: {e}")
            raise
