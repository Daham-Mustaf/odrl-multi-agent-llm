I'm trying to create a Golden Dataset of ODRL Policies that can be uploaded to Hugginface (.jsonl file), with columns containing: | Input | policy_type | assigner | assignee | targets | Permission.actions | Permission.Constraints.Triplets (leftOperand, operator, rightOperand) | Permission.duties | Prohibition.actions | Prohibition.Constraints.Triplets (leftOperand, operator, rightOperand) | Prohibition.duties | start_date | end_date | duration | | ----- | ----------- | -------- | -------- | ------- | ------------------ | ---------------------------------- | ------------------------------- | ----------------------------------- | ----------------- | ------------------- | ----------------------------------- | -------------------------------- | ------------------------------------ | ------------------ | ---------- | -------- | -------- | \n  The data types of the items contained in each column are shown below : - policy_type: str ("odrl:Set" / "odrl:Offer" / "odrl:Agreement") - assigner: [(str)] - assignee: [(str)] - targets: [(str)] -Permission.actions:[(str)] | Permission.Constraints.Triplets: [(str, str, str)] | Permission.duties:[(str)] | Prohibition.actions:[(str)] | Prohibition.Constraints.Triplets: [(str, str, str)] - duties: [(str)] - end_date: str - start_date: str - duration: str \n

Each triplet in Constraints.Triplets represent: (leftOperand, operator, rightOperand)
Please refer to the rules below, from the proposed Input (which is a natural language), extract the content of the other columns generated. Please just provide me the dataset file directly.

```
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

**Global constraints** (apply to Rule 1 (Permission) and Rule 2 (Prohibition)):
- Temporal: "The policy expires on 2025-12-31" → Add to ALL rules
- Spatial: "Only in Germany" → Add to ALL rules

**Rule-specific constraints** (apply to one corresponding rule):
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

### 7. ODRL Operators (ONLY use these):
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

### 8. ODRL leftOperands:
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

### 9. Valid ODRL Actions:
**Access:** odrl:read, odrl:use, odrl:index, odrl:search
**Creation:** odrl:reproduce, odrl:derive, odrl:modify, odrl:write
**Distribution:** odrl:distribute, odrl:present, odrl:display, odrl:play
**Management:** odrl:delete, odrl:archive, odrl:install, odrl:uninstall
**Execution:** odrl:execute, odrl:stream
**Communication:** odrl:attribute, odrl:inform, odrl:compensate
```