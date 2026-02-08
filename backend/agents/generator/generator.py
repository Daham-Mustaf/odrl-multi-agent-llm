# agents/generator/generator.py
"""
ODRL Generator Agent (GA) v4.0
Universal ODRL Turtle generator with domain-specific prefix support
Generates ODRL policies from parsed data with SHACL compliance
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from utils.llm_factory import LLMFactory
import uuid
import logging

logger = logging.getLogger(__name__)

# ===== GENERATION PROMPTS =====
FRESH_GENERATION_PROMPT = """You are a universal ODRL policy generator. Create valid ODRL policies in Turtle format for ANY domain.

## CRITICAL RULES:

### 1. Standard Prefixes (ALWAYS include):
```turtle
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
```

### 2. Domain-Specific Prefixes (add when needed):
**For Cultural Heritage / Data Space policies:**
```turtle
@prefix drk: <http://w3id.org/drk/ontology/> .
```

**For other domains, use appropriate prefixes:**
```turtle
@prefix ex: <http://example.com/> .
```

**How to choose:**
- If parsed_data mentions "drk:", "Daten Raumkultur", "DRK", or cultural heritage context → use `@prefix drk:`
- If specific domain URIs are present in parsed_data → include those prefixes
- Otherwise use `@prefix ex:` as fallback

### 3. Policy Structure:
```turtle
<policy_uri> a odrl:Policy, <policy_type> ;
    odrl:uid <policy_uri> ;
    dct:title "Policy Title"@en ;
    dct:description "Human-readable description of what this policy allows/prohibits"@en ;
    dct:creator <creator_uri> ;
    dct:created "2025-01-16T00:00:00Z"^^xsd:dateTime ;
    odrl:permission [ ... ] ;
    odrl:prohibition [ ... ] ;
    odrl:duty [ ... ] .
```

**Policy Types:**
- odrl:Set (generic policy collection)
- odrl:Offer (provider offers to recipients)
- odrl:Agreement (binding agreement between parties)

### 4. Permission/Prohibition Structure:
```turtle
odrl:permission [
    a odrl:Permission ;
    odrl:action odrl:read ;
    odrl:target <asset_uri> ;
    odrl:assignee <party_uri> ;
    odrl:assigner <provider_uri> ;
    odrl:constraint [ ... ] ;
    odrl:duty [ ... ] ;
] .
```

### 5. Constraint Structure:
```turtle
odrl:constraint [
    a odrl:Constraint ;
    odrl:leftOperand odrl:dateTime ;
    odrl:operator odrl:lteq ;
    odrl:rightOperand "2025-12-31"^^xsd:date ;
    rdfs:comment "Constraint explanation"@en ;
] .
```

### 6. ODRL Operators (ONLY use these):
**Comparison:**
- odrl:eq (equals)
- odrl:lt (less than)
- odrl:gt (greater than)
- odrl:lteq (less than or equal)
- odrl:gteq (greater than or equal)
- odrl:neq (not equal)

**Set operations:**
- odrl:isA (instance of)
- odrl:hasPart (contains)
- odrl:isPartOf (contained in)
- odrl:isAllOf (all of set)
- odrl:isAnyOf (any of set)
- odrl:isNoneOf (none of set)

### 7. ODRL leftOperands:
- odrl:dateTime (with ^^xsd:date or ^^xsd:dateTime)
- odrl:count (with ^^xsd:integer)
- odrl:spatial (with URI)
- odrl:purpose (with URI or string)
- odrl:recipient (with URI)
- odrl:elapsedTime (with xsd:duration)
- odrl:fileSize (with ^^xsd:decimal and unit)
- odrl:event (with URI)
- odrl:industry (with URI)
- odrl:language (with language code)

### 8. Valid ODRL Actions:
**Access:** odrl:read, odrl:use, odrl:index, odrl:search
**Creation:** odrl:reproduce, odrl:derive, odrl:modify, odrl:write
**Distribution:** odrl:distribute, odrl:present, odrl:display, odrl:play
**Management:** odrl:delete, odrl:archive, odrl:install, odrl:uninstall
**Execution:** odrl:execute, odrl:stream
**Communication:** odrl:attribute, odrl:inform, odrl:compensate

### 9. URI Construction Rules:
**For DRK/Cultural Heritage domain:**
```turtle
drk:policy:<unique_id> (policy URI)
drk:dataset:<name> (dataset URI)
drk:organization:<name> (organization URI)
drk:partner:<name> (partner URI)
drk:connector:<name> (connector URI)
```

**For generic domains:**
```turtle
ex:policy:<unique_id>
ex:asset:<name>
ex:organization:<name>
ex:party:<name>
```

**Important:** Always use the URIs provided in parsed_data if available. If not, construct appropriate URIs based on the domain.

### 10. Human-Readable Metadata (ALWAYS include):
```turtle
dct:title "Short policy title"@en ;
dct:description "Clear explanation of what this policy does - who can do what with which resource under what conditions"@en ;
```

**Title guidelines:**
- Short (5-10 words)
- Descriptive
- Example: "Research Access to Medieval Manuscripts"

**Description guidelines:**
- Complete sentence(s)
- Explain: WHO + ACTION + WHAT + CONDITIONS
- Example: "UC4 Partner may use the Medieval Manuscripts Collection dataset for research purposes up to 30 times per month, and has unlimited access for archival backup purposes."

### 11. Complete Example (DRK domain):
```turtle
@prefix odrl: <http://www.w3.org/ns/odrl/2/> .
@prefix drk: <http://w3id.org/drk/ontology/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .

drk:policy:abc123 a odrl:Policy, odrl:Offer ;
    odrl:uid drk:policy:abc123 ;
    dct:title "Research Access to Medieval Manuscripts"@en ;
    dct:description "UC4 Partner may use the Medieval Manuscripts Collection for research purposes"@en ;
    dct:creator drk:organization:daten_raumkultur ;
    dct:created "2025-01-16T00:00:00Z"^^xsd:dateTime ;
    odrl:permission [
        a odrl:Permission ;
        odrl:action odrl:use ;
        odrl:target drk:dataset:medieval_mss_2024 ;
        odrl:assigner drk:organization:daten_raumkultur ;
        odrl:assignee drk:partner:uc4 ;
        odrl:constraint [
            a odrl:Constraint ;
            odrl:leftOperand odrl:purpose ;
            odrl:operator odrl:eq ;
            odrl:rightOperand "research" ;
            rdfs:comment "Limited to research purposes only"@en ;
        ] ;
        odrl:constraint [
            a odrl:Constraint ;
            odrl:leftOperand odrl:count ;
            odrl:operator odrl:lteq ;
            odrl:rightOperand "30"^^xsd:integer ;
            rdfs:comment "Maximum 30 uses per month"@en ;
        ] ;
    ] .
```

## OUTPUT REQUIREMENTS:

1. **Return ONLY valid Turtle syntax**
2. **NO markdown code blocks** (no ```)
3. **NO explanatory text**
4. **Start directly with @prefix declarations**
5. **Include human-readable title and description**
6. **Use appropriate domain prefixes** (drk: or ex:)
7. **Add rdfs:comment to complex constraints** for clarity

Use the provided DCT_CREATED_VALUE for the dct:created value.

Generate the policy now.
"""

REGENERATION_PROMPT = """You are an ODRL expert fixing SHACL validation errors in Turtle format.

## YOUR GOAL: Fix technical SHACL violations while preserving policy intent

## CRITICAL RULES FOR FIXING:

1. **PRESERVE policy meaning** - Do not change what the policy allows/prohibits
2. **FIX ONLY technical issues** - Syntax, URIs, operators, structure
3. **KEEP all semantic content** - Actions, constraints, parties, targets
4. **MAINTAIN human-readable metadata** - Keep dct:title and dct:description
5. **Use provided DCT_CREATED_VALUE** for dct:created

## COMMON SHACL FIXES:

### Missing odrl:uid:
```turtle
<policy_uri> a odrl:Policy, odrl:Set ;
    odrl:uid <policy_uri> ;  ← ADD THIS (must match policy URI)
```

### Wrong Operator Format:
**Incorrect:**
```turtle
odrl:operator "lte" .  ← Missing odrl: prefix
odrl:operator lteq .   ← Missing odrl: prefix
```
**Correct:**
```turtle
odrl:operator odrl:lteq .
odrl:operator odrl:eq .
odrl:operator odrl:gteq .
```

### Missing odrl: Prefix in leftOperand:
**Incorrect:**
```turtle
odrl:leftOperand "dateTime" .
odrl:leftOperand count .
```
**Correct:**
```turtle
odrl:leftOperand odrl:dateTime .
odrl:leftOperand odrl:count .
```

### Missing Constraint Type Declaration:
```turtle
odrl:constraint [
    a odrl:Constraint ;  ← ADD THIS
    odrl:leftOperand odrl:dateTime ;
    odrl:operator odrl:lteq ;
    odrl:rightOperand "2025-12-31"^^xsd:date ;
] .
```

### Wrong Datatype:
**Incorrect:**
```turtle
odrl:rightOperand "2025-12-31" .  ← Missing ^^xsd:date
odrl:rightOperand "30" .          ← Missing ^^xsd:integer
```
**Correct:**
```turtle
odrl:rightOperand "2025-12-31"^^xsd:date .
odrl:rightOperand "30"^^xsd:integer .
```

### Missing Permission/Prohibition Type:
```turtle
odrl:permission [
    a odrl:Permission ;  ← ADD THIS
    odrl:action odrl:read ;
    ...
] .
```

## VALIDATION ERROR INTERPRETATION:

When you see SHACL errors like:
- "Missing odrl:uid" → Add `odrl:uid <same_as_policy_uri>` to policy
- "Invalid operator" → Check operators list, add odrl: prefix
- "Missing constraint type" → Add `a odrl:Constraint` to constraint
- "Wrong datatype" → Add appropriate ^^xsd:type
- "Missing property" → Add required ODRL property

## PRESERVE FROM ORIGINAL:

All permissions, prohibitions, duties
All actions (odrl:read, odrl:use, etc.)
All constraint values and semantic meaning
All parties (assignee, assigner)
All targets (assets)
Policy title and description
Domain-specific prefixes (drk:, ex:, etc.)
Complete policy intent from user's request

## OUTPUT REQUIREMENTS:

1. Return ONLY the corrected Turtle
2. No markdown code blocks
3. No explanations
4. No comments outside the Turtle syntax
5. Start with @prefix declarations

Fix the policy now.
"""

class Generator:
    """
    Universal ODRL Generator Agent
    Generates domain-agnostic ODRL policies with proper metadata
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
    
    def generate(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        reasoning: Optional[Dict[str, Any]] = None,
        validation_errors: Optional[Dict[str, Any]] = None,
        previous_odrl: Optional[str] = None,
        attempt_number: int = 1
    ) -> Dict[str, Any]:
        """
        Generate or regenerate ODRL policy in Turtle format
        
        Args:
            parsed_data: Parser output (required)
            original_text: User's input (required)
            reasoning: Reasoner analysis (optional)
            validation_errors: SHACL issues to fix (optional, for regeneration)
            previous_odrl: Previously generated Turtle (optional, for regeneration)
            attempt_number: Generation attempt number (1, 2, 3...)
            
        Returns:
            Dict with 'odrl_turtle' key containing Turtle string
        """
        
        logger.info(f"[Generator] Starting generation attempt #{attempt_number}")
        logger.info(f"[Generator] Original text: {original_text[:50]}...")
        logger.info(f"[Generator] Policies to generate: {parsed_data.get('total_policies', 0)}")
        
        if reasoning:
            logger.info(f"[Generator] Has reasoning: decision={reasoning.get('decision')}")
        
        # Decide: fresh generation or regeneration
        if validation_errors and previous_odrl:
            logger.info(f"[Generator]  REGENERATION MODE")
            logger.info(f"[Generator] Fixing {len(validation_errors.get('issues', []))} SHACL violations")
            odrl_turtle = self._regenerate_with_fixes(
                parsed_data,
                original_text,
                validation_errors,
                previous_odrl,
                attempt_number
            )
        else:
            logger.info(f"[Generator]  FRESH GENERATION")
            odrl_turtle = self._generate_fresh(parsed_data, original_text, reasoning)
        
        logger.info(f"[Generator] Generation complete")
        logger.info(f"[Generator] Turtle length: {len(odrl_turtle)} chars")
        
        return {
            'odrl_turtle': odrl_turtle,
            'format': 'turtle',
            'attempt_number': attempt_number
        }
    
    def _generate_fresh(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        reasoning: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate fresh ODRL policy in Turtle format"""
        
        try:
            # Generate unique policy ID
            policy_id_suffix = uuid.uuid4().hex[:8]
            
            # Detect domain from parsed data
            domain_prefix = self._detect_domain_prefix(parsed_data, original_text)
            
            if domain_prefix == "drk":
                policy_uri = f"http://w3id.org/drk/ontology/policy:{policy_id_suffix}"
            else:
                policy_uri = f"http://example.com/policy:{policy_id_suffix}"
            
            logger.info(f"[Generator] Policy URI: {policy_uri}")
            logger.info(f"[Generator] Domain prefix: {domain_prefix}")
            
            current_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            dct_created_value = self._extract_created_value(parsed_data) or current_time
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", FRESH_GENERATION_PROMPT),
                ("human", """Generate a complete ODRL policy in Turtle format.

POLICY URI: {policy_uri}

DCT_CREATED_VALUE (use for dct:created):
{dct_created_value}

ORIGINAL USER REQUEST:
{original_text}

PARSED DATA:
{parsed_data}

IMPORTANT:
1. Use appropriate domain prefix (drk: for cultural heritage/data spaces, ex: otherwise)
2. Include dct:title and dct:description for human readability
3. Add rdfs:comment to complex constraints
4. Return ONLY valid Turtle (no markdown, no explanations)
5. Start with @prefix declarations""")
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            odrl_turtle = chain.invoke({
                "policy_uri": policy_uri,
                "dct_created_value": dct_created_value,
                "original_text": original_text,
                "parsed_data": str(parsed_data)
            })
            
            # Clean up potential markdown wrapping
            odrl_turtle = self._clean_turtle(odrl_turtle)
            
            logger.info(f"[Generator] Fresh generation complete")
            
            return odrl_turtle
            
        except Exception as e:
            logger.error(f"[Generator] ✗ Error in fresh generation: {e}")
            raise
    
    def _regenerate_with_fixes(
        self,
        parsed_data: Dict[str, Any],
        original_text: str,
        validation_errors: Dict[str, Any],
        previous_odrl: str,
        attempt_number: int
    ) -> str:
        """Regenerate ODRL Turtle by fixing SHACL validation errors"""
        
        try:
            # Extract issues with full details
            issues = validation_errors.get('issues', [])
            
            # Build detailed issue description
            issues_text = "\n".join([
                f"""Issue {i+1}: {issue.get('type', 'Unknown')}
  - Field: {issue.get('field', 'unknown')}
  - Problem: {issue.get('message', 'No message')}
  - Current Value: {issue.get('actual_value', 'N/A')}
  - Focus Node: {issue.get('focus_node', 'N/A')}
  - Severity: {issue.get('severity', 'Error')}"""
                for i, issue in enumerate(issues)
            ])
            
            logger.info(f"[Generator] SHACL issues to fix:")
            for line in issues_text.split('\n'):
                logger.info(f"[Generator]   {line}")
            
            current_time = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            dct_created_value = self._extract_created_value(parsed_data) or current_time
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", REGENERATION_PROMPT),
                ("human", """Fix the SHACL validation errors while preserving the original policy intent.

ORIGINAL USER REQUEST:
{original_text}

DCT_CREATED_VALUE (use for dct:created):
{dct_created_value}

PARSED POLICY STRUCTURE:
{parsed_data}

CURRENT TURTLE (with SHACL violations):
{previous_odrl}

SHACL VALIDATION ERRORS TO FIX:
{validation_errors}

INSTRUCTIONS:
1. Read the original user request to understand the intended policy
2. Look at the current Turtle to see what was generated
3. Fix ONLY the specific SHACL violations listed above
4. Ensure the fixed policy still matches the user's original intent
5. Preserve all metadata (dct:title, dct:description, rdfs:comment)
6. Return ONLY the corrected Turtle (no markdown, no explanations)""")
            ])
            
            chain = prompt | self.llm | StrOutputParser()
            
            odrl_turtle = chain.invoke({
                "original_text": original_text,
                "dct_created_value": dct_created_value,
                "parsed_data": str(parsed_data),
                "previous_odrl": previous_odrl,
                "validation_errors": issues_text
            })
            
            # Clean up potential markdown wrapping
            odrl_turtle = self._clean_turtle(odrl_turtle)
            
            logger.info(f"[Generator] Regeneration complete (attempt #{attempt_number})")
            
            return odrl_turtle
            
        except Exception as e:
            logger.error(f"[Generator] ✗ Error in regeneration: {e}")
            raise
    
    def _detect_domain_prefix(self, parsed_data: Dict[str, Any], original_text: str) -> str:
        """Detect appropriate domain prefix from data"""
        
        # Check for DRK indicators
        drk_indicators = [
            'drk:',
            'daten raumkultur',
            'datenraumkultur',
            'w3id.org/drk',
            'cultural heritage',
            'data space'
        ]
        
        combined_text = f"{str(parsed_data)} {original_text}".lower()
        
        for indicator in drk_indicators:
            if indicator.lower() in combined_text:
                return "drk"
        
        return "ex"
    
    def _clean_turtle(self, turtle_str: str) -> str:
        """Remove markdown code blocks and extra whitespace"""
        # Remove markdown code blocks
        turtle_str = turtle_str.replace('```turtle', '').replace('```', '')
        
        # Remove leading/trailing whitespace
        turtle_str = turtle_str.strip()
        
        return turtle_str

    def _extract_created_value(self, parsed_data: Dict[str, Any]) -> Optional[str]:
        """Extract timestamp for dct:created from parsed data if provided."""
        if not isinstance(parsed_data, dict):
            return None

        key_names = {"dct:created", "dct_created", "dctCreated", "created", "timestamp"}

        def _normalize(value: Any) -> Optional[str]:
            if isinstance(value, str):
                return value.strip() or None
            if isinstance(value, dict):
                for candidate_key in ("value", "literal", "dateTime", "datetime", "created", "timestamp"):
                    candidate = value.get(candidate_key)
                    if isinstance(candidate, str) and candidate.strip():
                        return candidate.strip()
            if isinstance(value, list):
                for item in value:
                    if isinstance(item, str) and item.strip():
                        return item.strip()
            return None

        def _search(obj: Any) -> Optional[str]:
            if isinstance(obj, dict):
                if "metadata" in obj and isinstance(obj["metadata"], dict):
                    metadata_timestamp = obj["metadata"].get("timestamp")
                    normalized = _normalize(metadata_timestamp)
                    if normalized:
                        return normalized
                for key, val in obj.items():
                    if key in key_names:
                        normalized = _normalize(val)
                        if normalized:
                            return normalized
                    found = _search(val)
                    if found:
                        return found
            elif isinstance(obj, list):
                for item in obj:
                    found = _search(item)
                    if found:
                        return found
            return None

        return _search(parsed_data)
