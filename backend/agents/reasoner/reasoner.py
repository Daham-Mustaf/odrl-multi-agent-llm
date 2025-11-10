"""
Agent 2: ODRL Reasoner (SIMPLIFIED - Pure Analysis)
Analyzes parsed policies for completeness, consistency, conflicts.
Returns: Binary decision (approve/reject/needs_input) + Issues + Recommendations
Does NOT modify data - just judges if it's good enough to generate ODRL.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from langchain.prompts import ChatPromptTemplate
from langchain.output_parsers import PydanticOutputParser
from utils.llm_factory import LLMFactory


# ===== ENUMS =====
class ReasonerDecision(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    NEEDS_INPUT = "needs_input"


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
    UNENFORCEABLE = "unenforceable"


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


# ===== SIMPLIFIED PROMPT (No JSON examples to avoid escaping issues) =====
def get_reasoner_prompt(current_date: str) -> str:
    return f"""You are an ODRL policy analyzer. Decide if parsed data can generate valid ODRL.

CURRENT DATE: {current_date}

YOUR DECISIONS:
- approve: Data is good enough to generate ODRL (minor issues acceptable)
- reject: Critical issues prevent generation
- needs_input: User must clarify ambiguities

WHAT TO CHECK:

1. CRITICAL ISSUES (→ reject or needs_input):
   - Empty actions list
   - Vague actions: "everything", "something", "do", "things"
   - Missing assigner in Offer/Agreement policies
   - Missing assignee in Agreement policies
   - Expired policies (date before {current_date})
   - Direct conflicts: same action both permitted and prohibited

2. HIGH ISSUES (→ needs_input):
   - Vague targets: "not_specified", "everything", "documents"
   - Actions without odrl: prefix
   - Ambiguous constraints: "soon", "later", "usually"
   - Generic assignee: "everyone", "anyone"

3. MEDIUM ISSUES (→ approve with warnings):
   - Missing temporal constraints
   - No duties on permissions
   - Broad permissions without restrictions

4. LOW ISSUES (→ approve, just note):
   - No constraints specified
   - Simple policy structure
   - Missing optional metadata

RISK LEVELS:
- low: All specified, restrictive actions, has constraints, not expired
- medium: Some vague terms, broad permissions, minor issues
- high: Critical missing fields, conflicts, overly permissive, expired

DECISION LOGIC:
- Any CRITICAL issue → reject (confidence 0.1-0.3)
- Multiple HIGH issues → needs_input (confidence 0.4-0.6)
- Has conflicts → needs_input (confidence 0.5-0.7)
- Only MEDIUM/LOW issues → approve (confidence 0.7-0.95)
- Perfect policy → approve (confidence 0.95-1.0)

OUTPUT: Return valid JSON with these fields:
- decision: string (approve/reject/needs_input)
- confidence: number (0.0 to 1.0)
- issues: array of objects with category, severity, field, policy_id, message, suggestion
- recommendations: array of strings
- reasoning: string (1-3 sentences explaining decision)
- risk_level: string (low/medium/high)
- policies_analyzed: number

Analyze this parsed data and original text:

{{parsed_data}}

{{original_text}}

{{format_instructions}}
"""


# ===== REASONER CLASS =====
class Reasoner:
    """Agent 2: Pure policy analysis - no data modification"""
    
    def __init__(self, model=None, temperature=None, custom_config=None):
        self.model = model
        self.temperature = temperature
        self.custom_config = custom_config
        
        self.llm = LLMFactory.create_llm(
            model=model,
            temperature=temperature,
            custom_config=custom_config
        )
    
    def reason(self, parsed_data: Dict[str, Any], original_text: str) -> Dict[str, Any]:
        """
        Analyze parsed policies - Pure judgment, no modification
        
        Args:
            parsed_data: Parser output
            original_text: User's original input text
            
        Returns:
            ReasoningResult with decision, issues, recommendations
        """
        
        current_date = datetime.utcnow().strftime("%Y-%m-%d")
        
        print(f"[Reasoner] 🧠 Starting pure analysis...")
        print(f"[Reasoner] 📅 Current date: {current_date}")
        print(f"[Reasoner] 📊 Analyzing {parsed_data.get('total_policies', 1)} policies...")
        print(f"[Reasoner] 📝 Original text: {original_text[:50]}...")
        
        try:
            parser = PydanticOutputParser(pydantic_object=ReasoningResult)
            prompt_text = get_reasoner_prompt(current_date)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", prompt_text),
                ("human", "{parsed_data}\n\n{original_text}\n\n{format_instructions}")
            ])
            
            chain = prompt | self.llm | parser
            
            result = chain.invoke({
                "parsed_data": str(parsed_data),
                "original_text": original_text,
                "format_instructions": parser.get_format_instructions()
            })
            
            print(f"[Reasoner] ✅ Analysis complete")
            print(f"[Reasoner] 🎯 Decision: {result.decision.upper()}")
            print(f"[Reasoner] 📊 Confidence: {result.confidence:.0%}")
            print(f"[Reasoner] ⚠️  Issues: {len(result.issues)}")
            print(f"[Reasoner] 💡 Recommendations: {len(result.recommendations)}")
            print(f"[Reasoner] 🛡️  Risk: {result.risk_level.upper()}")
            
            critical_issues = [i for i in result.issues if i.severity == IssueSeverity.CRITICAL]
            if critical_issues:
                print(f"[Reasoner] 🚨 CRITICAL ISSUES:")
                for issue in critical_issues:
                    print(f"[Reasoner]    - {issue.field}: {issue.message}")
            
            return result.dict()
            
        except Exception as e:
            print(f"[Reasoner] ❌ Error: {e}")
            raise