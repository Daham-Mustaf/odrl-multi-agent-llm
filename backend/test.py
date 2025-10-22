#!/usr/bin/env python3
from typing import List, Tuple, Set
import dspy
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# Initialize DSPy with your LLM
# ==========================================

lm = ChatOpenAI(
    model="llama3.1:8b",
    base_url=os.getenv("LLM_BASE_URL", "http://localhost:11434/v1"),
    api_key="dummy",
    temperature=0.0
)

dspy.settings.configure(lm=lm)

print("✅ DSPy configured with Llama 3.1\n")

# ==========================================
# STEP 1: Extract ODRL-Specific Entities
# ==========================================

class ODRLEntities(dspy.Signature):
    """Extract ALL policy-relevant entities from text.
    
    Extract:
    1. ACTORS: users, students, researchers, organizations, participants
    2. ASSETS: datasets, documents, files, images, videos, collections
    3. ACTIONS: view, download, print, share, modify, access, use
    4. TEMPORAL: dates (January 1, 2025), durations (30 days, 180 days), time points
    5. SPATIAL: locations (Germany, Europe), regions, countries
    6. QUANTITATIVE: numbers (50, 30), counts, limits (maximum, minimum)
    7. PURPOSES: educational, commercial, research, marketing
    8. TECHNICAL: connectors, servers, endpoints, platforms
    9. CONDITIONS: approved, authorized, registered, secured
    
    Be THOROUGH. Extract EVERY entity mentioned, including numbers and time periods.
    """
    
    source_text: str = dspy.InputField()
    entities: list[str] = dspy.OutputField(
        desc="COMPLETE list of all policy entities including actors, assets, actions, temporal, spatial, quantitative, purposes, technical, and conditions"
    )

def extract_odrl_entities(policy_text: str) -> List[str]:
    """Extract all ODRL-relevant entities from policy text"""
    
    extract = dspy.Predict(ODRLEntities)
    result = extract(source_text=policy_text)
    
    return result.entities

# ==========================================
# STEP 2: Extract ODRL-Specific Relations
# ==========================================

class ODRLRelation(BaseModel):
    """ODRL policy relation (subject-predicate-object triple)"""
    
    subject: str = dspy.InputField(
        desc="Subject entity (must be from entities list)",
        examples=["users", "students", "dataset"]
    )
    predicate: str = dspy.InputField(
        desc="Relation type (permission, prohibition, duty, constraint)",
        examples=["can access", "cannot print", "must pay", "valid for", "located in"]
    )
    object: str = dspy.InputField(
        desc="Object entity (must be from entities list)",
        examples=["document", "30 days", "Germany"]
    )

class ODRLRelations(dspy.Signature):
    """Extract subject-predicate-object relations for ODRL policies.
    
    Relation types to extract:
    1. PERMISSIONS: "can view", "allowed to access", "may use"
    2. PROHIBITIONS: "cannot print", "prohibited from", "not allowed"
    3. DUTIES: "must pay", "required to attribute", "shall delete"
    4. TEMPORAL CONSTRAINTS: "valid for", "expires on", "starts from"
    5. SPATIAL CONSTRAINTS: "located in", "restricted to", "available in"
    6. QUANTITATIVE CONSTRAINTS: "maximum of", "limited to", "up to"
    7. PURPOSE CONSTRAINTS: "for purpose of", "used for", "intended for"
    8. TECHNICAL CONSTRAINTS: "through connector", "via platform", "on servers"
    9. CONDITIONAL: "only if", "after", "before", "requires"
    
    Subject and object MUST be from the entities list.
    Be THOROUGH - extract ALL relations mentioned in the policy.
    """
    
    source_text: str = dspy.InputField()
    entities: list[str] = dspy.InputField()
    relations: list[ODRLRelation] = dspy.OutputField(
        desc="COMPLETE list of all policy relations. Be thorough and extract every relation."
    )

def extract_odrl_relations(policy_text: str, entities: List[str]) -> List[Tuple[str, str, str]]:
    """Extract all ODRL-relevant relations from policy text"""
    
    extract = dspy.Predict(ODRLRelations)
    result = extract(source_text=policy_text, entities=entities)
    
    return [(r.subject, r.predicate, r.object) for r in result.relations]

# ==========================================
# STEP 3: Complete ODRL Knowledge Graph
# ==========================================

class ODRLGraph(BaseModel):
    """ODRL Policy Knowledge Graph"""
    
    entities: Set[str]
    edges: Set[str]  # All predicates
    relations: Set[Tuple[str, str, str]]  # (subject, predicate, object)
    
    @property
    def actors(self) -> Set[str]:
        """Extract actors from entities"""
        actor_keywords = {"user", "student", "researcher", "participant", "member", "organization", "institute", "corp"}
        return {e for e in self.entities if any(kw in e.lower() for kw in actor_keywords)}
    
    @property
    def assets(self) -> Set[str]:
        """Extract assets from entities"""
        asset_keywords = {"dataset", "document", "file", "image", "video", "data", "collection", "archive", "artifact"}
        return {e for e in self.entities if any(kw in e.lower() for kw in asset_keywords)}
    
    @property
    def temporal(self) -> Set[str]:
        """Extract temporal constraints from entities"""
        temporal_keywords = {"day", "month", "year", "date", "time", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"}
        return {e for e in self.entities if any(kw in e.lower() for kw in temporal_keywords) or any(char.isdigit() for char in e)}
    
    @property
    def spatial(self) -> Set[str]:
        """Extract spatial constraints from entities"""
        spatial_keywords = {"germany", "europe", "usa", "asia", "africa", "country", "region", "location"}
        return {e for e in self.entities if any(kw in e.lower() for kw in spatial_keywords)}

def extract_odrl_graph(policy_text: str) -> ODRLGraph:
    """
    Complete pipeline: Extract ODRL knowledge graph from policy text
    
    Args:
        policy_text: Natural language policy text
        
    Returns:
        ODRLGraph with entities, relations, and categorized components
    """
    
    print(f"📝 Input: \"{policy_text[:80]}...\"" if len(policy_text) > 80 else f"📝 Input: \"{policy_text}\"")
    
    # Step 1: Extract entities
    print("   Step 1: Extracting entities...")
    entities = extract_odrl_entities(policy_text)
    print(f"   ✅ Extracted {len(entities)} entities")
    
    # Step 2: Extract relations
    print("   Step 2: Extracting relations...")
    relations = extract_odrl_relations(policy_text, entities)
    print(f"   ✅ Extracted {len(relations)} relations")
    
    # Step 3: Build graph
    edges = {r[1] for r in relations}  # All predicates
    
    graph = ODRLGraph(
        entities=set(entities),
        edges=edges,
        relations=set(relations)
    )
    
    return graph

# ==========================================
# TEST CASES
# ==========================================

if __name__ == "__main__":
    print("="*100)
    print("CUSTOM ODRL POLICY → KNOWLEDGE GRAPH AGENT")
    print("="*100)
    
    test_cases = [
        {
            "id": "simple_temporal",
            "text": "Students can download the paper for 30 days"
        },
        {
            "id": "quantitative_limit",
            "text": "UC4 partners can view a maximum of 50 images per day"
        },
        {
            "id": "multi_constraint",
            "text": "Access to the 'UC4 Partner' dataset is permitted before January 1, 2030. Access is restricted to users located within Germany."
        },
        {
            "id": "purpose_limited",
            "text": "The dataset 'OralTraditionsArchive' may be used only for educational purposes. Commercial use is strictly prohibited."
        }
    ]
    
    results = []
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{'='*100}")
        print(f"TEST {i}: {test['id']}")
        print('='*100)
        
        try:
            graph = extract_odrl_graph(test['text'])
            
            print(f"\n📊 ODRL Knowledge Graph:")
            print(f"\n   Entities ({len(graph.entities)}):")
            for entity in sorted(graph.entities):
                print(f"      - {entity}")
            
            print(f"\n   Relations ({len(graph.relations)}):")
            for subj, pred, obj in sorted(graph.relations):
                print(f"      - ({subj}) --[{pred}]--> ({obj})")
            
            print(f"\n   Categorized:")
            print(f"      Actors: {graph.actors}")
            print(f"      Assets: {graph.assets}")
            print(f"      Temporal: {graph.temporal}")
            print(f"      Spatial: {graph.spatial}")
            
            results.append({
                "policy_id": test['id'],
                "raw_input": test['text'],
                "graph": {
                    "entities": list(graph.entities),
                    "edges": list(graph.edges),
                    "relations": [list(r) for r in graph.relations]
                }
            })
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    # Save results
    import json
    output_file = "odrl_graphs_custom.json"
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n{'='*100}")
    print(f"✅ Extracted {len(results)}/{len(test_cases)} graphs")
    print(f"💾 Saved to: {output_file}")
    print('='*100)