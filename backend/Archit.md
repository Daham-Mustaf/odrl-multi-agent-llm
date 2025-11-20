# **FINAL WORKFLOW: Complete End-to-End Process** 🚀

---

## **OVERALL ARCHITECTURE**

```
┌──────────────────────────────────────────────────────────────┐
│                    USER INPUT (Natural Language)              │
│              "Users can read but not modify documents"        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ↓
┌────────────────────────────────────────────────────────────────┐
│  STAGE 1: PARSER AGENT                                         │
│  ────────────────────────────────────────────────────────────  │
│  Job: Extract structured entities from text                    │
│                                                                 │
│  Input:  "Users can read but not modify documents"            │
│  Output: {                                                     │
│    "policies": [                                               │
│      {                                                         │
│        "policy_id": "p1",                                      │
│        "rule_type": "permission",                              │
│        "actions": ["odrl:read"],                               │
│        "assignee": ["users"],                                  │
│        "targets": ["documents"]                                │
│      },                                                        │
│      {                                                         │
│        "policy_id": "p2",                                      │
│        "rule_type": "prohibition",                             │
│        "actions": ["odrl:modify"],                             │
│        "assignee": ["users"],                                  │
│        "targets": ["documents"]                                │
│      }                                                         │
│    ],                                                          │
│    "original_text": "Users can read but not modify..."        │
│  }                                                             │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ├──────────────────┐
                     │                  │
                     ↓                  ↓
┌────────────────────────────────────────────────────────────────┐
│  STAGE 2: REASONER AGENT (Pure Analysis)                       │
│  ────────────────────────────────────────────────────────────  │
│  Job: Analyze parsed data for issues, don't modify it          │
│                                                                 │
│  Input:  {                                                     │
│    "parsed_data": {...},  // Parser output                     │
│    "original_text": "..."                                      │
│  }                                                             │
│                                                                 │
│  Output: {                                                     │
│    "decision": "approve",     // approve | reject | needs_input│
│    "confidence": 0.9,                                          │
│    "issues": [                                                 │
│      {                                                         │
│        "severity": "warning",                                  │
│        "field": "targets",                                     │
│        "message": "Target 'documents' is vague",               │
│        "suggestion": "Specify document URI or collection"      │
│      }                                                         │
│    ],                                                          │
│    "recommendations": [                                        │
│      "Add temporal constraints",                               │
│      "Specify document identifiers"                            │
│    ],                                                          │
│    "reasoning": "Policy is complete and consistent...",        │
│    "risk_level": "low"                                         │
│  }                                                             │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ↓
        ┌────────────────────────┐
        │   HUMAN DECISION       │
        │   (Manual Mode Only)   │
        ├────────────────────────┤
        │ • Review issues        │
        │ • Check recommendations│
        │ • Approve or Edit      │
        └────────┬───────────────┘
                 │
                 ↓
    ┌─────────────────────────────┐
    │ User Decision:              │
    │                             │
    │ APPROVE → Continue          │
    │ EDIT    → Back to Parser    │
    │ REJECT  → Stop              │
    └─────────┬───────────────────┘
              │
              ↓ (if approved)
┌────────────────────────────────────────────────────────────────┐
│  STAGE 3: GENERATOR AGENT                                      │
│  ────────────────────────────────────────────────────────────  │
│  Job: Transform parsed data → Valid ODRL JSON-LD               │
│                                                                 │
│  Input:  {                                                     │
│    "parsed_data": {...},        // Original parser output      │
│    "original_text": "...",      // User's input text           │
│    "reasoning": {...}            // Optional reasoner analysis │
│  }                                                             │
│                                                                 │
│  Process:                                                      │
│  1. Load ODRL templates                                        │
│  2. Map parsed entities to ODRL vocabulary                     │
│  3. Generate URIs for parties/assets                           │
│  4. Build JSON-LD structure                                    │
│  5. Add metadata                                               │
│                                                                 │
│  Output: {                                                     │
│    "@context": "http://www.w3.org/ns/odrl.jsonld",            │
│    "@type": "Set",                                             │
│    "uid": "http://example.com/policy:1234",                    │
│    "permission": [{                                            │
│      "target": "http://example.com/documents",                 │
│      "action": "odrl:read",                                    │
│      "assignee": "http://example.com/party:users"              │
│    }],                                                         │
│    "prohibition": [{                                           │
│      "target": "http://example.com/documents",                 │
│      "action": "odrl:modify",                                  │
│      "assignee": "http://example.com/party:users"              │
│    }]                                                          │
│  }                                                             │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────┐
│  STAGE 4: VALIDATOR AGENT                                      │
│  ────────────────────────────────────────────────────────────  │
│  Job: Verify ODRL compliance using SHACL                       │
│                                                                 │
│  Input:  {                                                     │
│    "odrl_policy": {...},        // Generated ODRL              │
│    "original_text": "..."       // For context                 │
│  }                                                             │
│                                                                 │
│  Process:                                                      │
│  1. Load ODRL SHACL shapes                                     │
│  2. Validate JSON-LD structure                                 │
│  3. Check ODRL vocabulary usage                                │
│  4. Verify constraints format                                  │
│  5. Generate conformance report                                │
│                                                                 │
│  Output: {                                                     │
│    "is_valid": true,                                           │
│    "conforms": true,                                           │
│    "issues": [],                // If validation fails         │
│    "warnings": [                                               │
│      "Consider adding temporal constraints"                    │
│    ],                                                          │
│    "validation_report": {                                      │
│      "sh:conforms": true,                                      │
│      "sh:result": []                                           │
│    },                                                          │
│    "suggestions": [                                            │
│      "Add profile declaration"                                 │
│    ]                                                           │
│  }                                                             │
└────────────────────┬───────────────────────────────────────────┘
                     │
                     ↓
┌────────────────────────────────────────────────────────────────┐
│                    FINAL OUTPUT                                 │
│  ────────────────────────────────────────────────────────────  │
│   Valid ODRL JSON-LD policy                                  │
│   SHACL validation report                                    │
│   Processing metrics                                         │
│   Audit trail (original text → parsed → reasoned → ODRL)    │
└────────────────────────────────────────────────────────────────┘
```

---

## **DETAILED WORKFLOW BY MODE**

### **MODE 1: AUTOMATIC (Full Pipeline)** ⚡

```
User clicks "Start Processing"
        ↓
┌───────────────────────────────────────────────────────────┐
│ PARSE (2s)                                                │
│ ─────────────────────────────────────────────────────────│
│ Input:  "Users can read documents until 2025"            │
│ Output: Structured entities (2 policies extracted)       │
│ Status:  Complete                                       │
└───────────────────────────────────────────────────────────┘
        ↓ (auto-continue)
┌───────────────────────────────────────────────────────────┐
│ REASON (3s)                                               │
│ ─────────────────────────────────────────────────────────│
│ Analysis: Policy complete, no conflicts                  │
│ Decision: APPROVE (confidence: 0.95)                     │
│ Issues:   1 warning (no explicit document URI)           │
│ Status:    Approved                                     │
└───────────────────────────────────────────────────────────┘
        ↓ (auto-continue if approved)
┌───────────────────────────────────────────────────────────┐
│ GENERATE (2s)                                             │
│ ─────────────────────────────────────────────────────────│
│ Template: odrl:Set with permission + temporal constraint │
│ Output:   Valid ODRL JSON-LD (256 lines)                 │
│ Status:    Generated                                    │
└───────────────────────────────────────────────────────────┘
        ↓ (auto-continue)
┌───────────────────────────────────────────────────────────┐
│ VALIDATE (1s)                                             │
│ ─────────────────────────────────────────────────────────│
│ SHACL:     Conforms to ODRL 2.2                        │
│ Issues:   0 violations, 1 recommendation                 │
│ Status:    Valid                                        │
└───────────────────────────────────────────────────────────┘
        ↓
    DONE! (Total: 8 seconds)
```

---

### **MODE 2: MANUAL (Human-in-the-Loop)** 🧑‍💻

```
User clicks "Start Processing"
        ↓
┌───────────────────────────────────────────────────────────┐
│ PARSE (2s)                                                │
│ Status:  Complete                                       │
└───────────────────────────────────────────────────────────┘
        ↓
┌───────────────────────────────────────────────────────────┐
│ REASON (3s)                                               │
│ ─────────────────────────────────────────────────────────│
│ Decision: NEEDS_INPUT                                     │
│ Issues:   2 critical (vague action "everything")         │
│ Status:     Requires Review                            │
└───────────────────────────────────────────────────────────┘
        ↓
    🛑 STOP - Show user the issues
        ↓
┌───────────────────────────────────────────────────────────┐
│           USER REVIEWS REASONER OUTPUT                    │
│ ─────────────────────────────────────────────────────────│
│                                                           │
│  Critical Issue:                                        │
│    Action "everything" is too vague                      │
│    Suggestion: Use odrl:read, odrl:write, odrl:modify    │
│                                                           │
│   Warning:                                              │
│    No expiration date specified                          │
│    Suggestion: Add temporal constraint                   │
│                                                           │
│ [Edit Input]  [Continue Anyway]  [Cancel]                │
└───────────────────────────────────────────────────────────┘
        ↓
    User chooses:
    
    OPTION A: Edit Input
        → Go back to Parser
        → User modifies text: "Users can read and write documents"
        → Restart workflow
        
    OPTION B: Continue Anyway
        → User accepts risk
        → Generator uses original parsed data
        → May produce imperfect ODRL
        
    OPTION C: Cancel
        → Stop workflow
        → Save state for later
```

---

## **DATA FLOW DIAGRAM**

```
┌─────────────┐
│   Parser    │
│   Output    │
│             │
│ • policies  │◄────┐
│ • raw_text  │     │
└──────┬──────┘     │
       │            │
       │ (preserved)│
       ↓            │
┌─────────────┐     │
│  Reasoner   │     │
│   Input     │     │
│             │     │
│ • parsed    │─────┘
│ • text      │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Reasoner   │
│   Output    │
│             │
│ • decision  │
│ • issues    │
│ • reasoning │
└──────┬──────┘
       │
       │ (decision only)
       ↓
┌─────────────┐
│  Generator  │
│   Input     │
│             │
│ • parsed    │◄──── (from Parser, not Reasoner)
│ • text      │
│ • reasoning │◄──── (optional, for context)
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Generator  │
│   Output    │
│             │
│ • odrl      │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Validator  │
│   Input     │
│             │
│ • odrl      │
│ • text      │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Validator  │
│   Output    │
│             │
│ • valid     │
│ • report    │
└─────────────┘
```

---

## **API CALL SEQUENCE**

### **Frontend Calls:**

```javascript
// ====================================
// STAGE 1: PARSE
// ====================================
const parseResponse = await fetch('/api/parse', {
  method: 'POST',
  body: JSON.stringify({
    text: "Users can read but not modify documents",
    model: "ollama:llama3.3",
    temperature: 0.3
  })
})

const parsedData = await parseResponse.json()
/*
{
  "policies": [...],
  "raw_text": "Users can read but not modify documents",
  "total_policies": 2,
  "processing_time_ms": 1850
}
*/

// ====================================
// STAGE 2: REASON
// ====================================
const reasonResponse = await fetch('/api/reason', {
  method: 'POST',
  body: JSON.stringify({
    parsed_data: parsedData,           //  Pass parser output
    original_text: "Users can read...", //  Pass original text
    model: "ollama:llama3.3",
    temperature: 0.3
  })
})

const reasoningResult = await reasonResponse.json()
/*
{
  "decision": "approve",
  "confidence": 0.9,
  "issues": [...],
  "recommendations": [...],
  "reasoning": "Policy is well-formed...",
  "risk_level": "low",
  "processing_time_ms": 2100
}
*/

// ====================================
// HUMAN DECISION (Manual Mode)
// ====================================
if (manualMode && reasoningResult.decision !== "approve") {
  // Show user the issues
  displayReasoningPanel(reasoningResult)
  
  // Wait for user action
  const userDecision = await waitForUserDecision()
  
  if (userDecision === "edit") {
    // Go back to input
    return
  }
  
  if (userDecision === "cancel") {
    // Stop workflow
    return
  }
  
  // If "continue", proceed below
}

// ====================================
// STAGE 3: GENERATE
// ====================================
const generateResponse = await fetch('/api/generate', {
  method: 'POST',
  body: JSON.stringify({
    parsed_data: parsedData,           //  Original parser output
    original_text: "Users can read...", //  Original text
    reasoning: reasoningResult,         //  Optional context
    model: "ollama:llama3.3",
    temperature: 0.3
  })
})

const generatedODRL = await generateResponse.json()
/*
{
  "odrl_policy": {
    "@context": "http://www.w3.org/ns/odrl.jsonld",
    "@type": "Set",
    "permission": [...],
    "prohibition": [...]
  },
  "processing_time_ms": 1950
}
*/

// ====================================
// STAGE 4: VALIDATE
// ====================================
const validateResponse = await fetch('/api/validate', {
  method: 'POST',
  body: JSON.stringify({
    odrl_policy: generatedODRL.odrl_policy,
    original_text: "Users can read...",  // For context
    model: "ollama:llama3.3",
    temperature: 0.3
  })
})

const validationResult = await validateResponse.json()
/*
{
  "is_valid": true,
  "conforms": true,
  "issues": [],
  "warnings": [...],
  "validation_report": {...},
  "processing_time_ms": 850
}
*/

// ====================================
// DONE!
// ====================================
console.log(" Complete workflow finished!")
console.log(`Total time: ${
  parsedData.processing_time_ms +
  reasoningResult.processing_time_ms +
  generatedODRL.processing_time_ms +
  validationResult.processing_time_ms
}ms`)
```

---

## **BACKEND ENDPOINT CHANGES**

### **Updated Reasoner Endpoint:**

```python
@app.post("/api/reason")
async def reason(request: Request, data: Dict):
    """
    Analyzes parsed policy data (pure reasoning, no modification)
    
    Input:
        - parsed_data: Parser output
        - original_text: User's input text
        - model: LLM to use
        - temperature: Temperature setting
    
    Output:
        - decision: approve | reject | needs_input
        - issues: List of problems found
        - recommendations: Suggestions for improvement
        - reasoning: Human-readable explanation
        - risk_level: low | medium | high
    """
    
    if await request.is_disconnected():
        return JSONResponse(status_code=499, content={"detail": "Cancelled"})
    
    try:
        reasoner = Reasoner(model=data.get('model'), temperature=data.get('temperature'))
        
        result = await run_with_disconnect_check(
            reasoner.reason,
            request,
            data['parsed_data'],      #  Parser output
            data['original_text']      #  Original text
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Reason error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

### **Updated Generator Endpoint:**

```python
@app.post("/api/generate")
async def generate(request: Request, data: Dict):
    """
    Generates ODRL from parsed data
    
    Input:
        - parsed_data: Parser output (required)
        - original_text: User's input text (required)
        - reasoning: Reasoner analysis (optional)
        - model: LLM to use
        - temperature: Temperature setting
    
    Output:
        - odrl_policy: Valid ODRL JSON-LD
        - processing_time_ms: Time taken
    """
    
    if await request.is_disconnected():
        return JSONResponse(status_code=499, content={"detail": "Cancelled"})
    
    try:
        generator = Generator(model=data.get('model'), temperature=data.get('temperature'))
        
        odrl = await run_with_disconnect_check(
            generator.generate,
            request,
            data['parsed_data'],       #  Parser output
            data['original_text'],     #  Original text
            data.get('reasoning')      #  Optional reasoning
        )
        
        return {
            'odrl_policy': odrl,
            'processing_time_ms': elapsed_ms
        }
        
    except Exception as e:
        logger.error(f"Generate error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## **KEY PRINCIPLES**

### **1. Data Preservation** 📦
```
Parser output is NEVER modified by Reasoner
Original text flows through entire pipeline
Each agent can access full context
```

### **2. Pure Reasoning** 🧠
```
Reasoner only judges: "Can we generate valid ODRL?"
Reasoner does NOT enhance or infer data
Reasoner returns: decision + issues + recommendations
```

### **3. Template-First Generation** 📝
```
Generator uses templates for structure
LLM only for ambiguity resolution
Fast and reliable
```

### **4. Human-in-the-Loop** 👤
```
Manual mode: Stop after Reasoner
Show issues to user
User decides: Edit | Continue | Cancel
```

### **5. Audit Trail** 📋
```
Every stage preserves original_text
Can trace: Input → Parse → Reason → ODRL
Full transparency
```

---

## **SUMMARY**

```
┌──────────┐
│  INPUT   │  Natural language
└────┬─────┘
     │
     ↓
┌──────────┐
│  PARSER  │  Extract entities (preserve original)
└────┬─────┘
     │
     ├──────────┐
     │          │
     ↓          ↓
┌──────────┐   │
│ REASONER │   │  Analyze (don't modify)
└────┬─────┘   │
     │         │
     ↓         │
  [HUMAN]      │  Review (manual mode)
     │         │
     ↓         │
┌──────────┐  │
│GENERATOR │◄─┘  Transform (uses original parser output)
└────┬─────┘
     │
     ↓
┌──────────┐
│VALIDATOR │  Verify SHACL compliance
└────┬─────┘
     │
     ↓
┌──────────┐
│  OUTPUT  │  Valid ODRL JSON-LD
└──────────┘
```

**Total Pipeline Time (Automatic):** ~8-10 seconds  
**Total Pipeline Time (Manual):** User-dependent (can pause at Reasoner)

---

Is this the workflow you envisioned? Should we now implement the **simplified Reasoner** code? 🚀