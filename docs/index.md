## System Architecture and Design

### Multi-Agent Workflow

![Multi-agent pipeline with dual human checkpoints](https://github.com/Daham-Mustaf/odrl-multi-agent-llm/blob/main/wiki-images/workflow-diagram_1.png)

*Figure 1: Multi-agent pipeline with dual human checkpoints. Reasoner (Checkpoint I) enables pre-generation review; Validator (Checkpoint II) enables post-generation refinement. Red dashed: edit input; orange dashed: regenerate; green: continue. Supports per-agent LLM configuration.*

### Main Interface Demo

![ODRL Policy Generator Main Interface](https://github.com/Daham-Mustaf/odrl-multi-agent-llm/blob/main/wiki-images/demo-main-interface-2.png)
*Figure: The main GUI for the ODRL Multi-Agent demo. Users can input policy descriptions, upload files, adjust advanced settings, and track the pipeline status with real-time updates.*

### Parser Demo

![ODRL Policy Parser Main Interface](https://github.com/Daham-Mustaf/odrl-multi-agent-llm/blob/main/wiki-images/parser.png)
*Figure: The Parser Agent GUI for the ODRL Multi-Agent demo. Users can input human-readable policy descriptions, upload files, adjust advanced settings, and view the parsed permissions, prohibitions, and constraints in real time. Each action is clickable to see reasoning, and the resulting ODRL JSON can be downloaded or copied for further use.*

### Reasoner Demo

![ODRL Policy Reasoner Interface](https://github.com/Daham-Mustaf/odrl-multi-agent-llm/blob/main/wiki-images/reasoner.png)
*Figure: The Reasoner Agent GUI for the ODRL Multi-Agent demo. After the Parser Agent converts human-readable policies into ODRL JSON, the Reasoner Agent visualizes the parsed permissions, prohibitions, and constraints. Users can review the parsed policy:*

- **If accepted:** the policy moves to the Generation step for further processing.  
- **If rejected or needs edits:** users can return to the main text input of the Parser Agent to modify the policy.  

*This ensures policies are validated and conflicts are detected before being finalized.*

### Generator & SHACL Validator Demo

![ODRL Policy Generator Interface](https://github.com/Daham-Mustaf/odrl-multi-agent-llm/blob/main/wiki-images/shacl-operator-violation.png)
*Figure: The Generator Agent GUI for the ODRL Multi-Agent demo. After the Reasoner Agent approves a policy, the Generator Agent produces the final ODRL JSON and prepares it for validation.*

- **SHACL Validator:**  
  The generated policy is automatically checked against SHACL constraints to ensure semantic correctness.  
  - **Valid SHACL:** the policy is finalized and ready for deployment or export.  
  - **Invalid SHACL:** highlighted errors appear in red, and the policy is redirected back to the Generator Agent for corrections.  

*This ensures that all generated policies are syntactically and semantically correct according to ODRL standards before final use.*

