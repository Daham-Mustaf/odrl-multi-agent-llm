"""
Convert ODRL JSON-LD to Turtle (TTL) format
"""
from rdflib import Graph
import json
from typing import Dict, Any

def jsonld_to_turtle(odrl_jsonld: Dict[str, Any]) -> str:
    """
    Convert ODRL JSON-LD to Turtle format
    
    Args:
        odrl_jsonld: ODRL policy as JSON-LD dict
        
    Returns:
        Turtle (TTL) string
    """
    try:
        # Create RDF graph
        g = Graph()
        
        # Parse JSON-LD into graph
        jsonld_str = json.dumps(odrl_jsonld)
        g.parse(data=jsonld_str, format='json-ld')
        
        # Serialize to Turtle
        ttl_string = g.serialize(format='turtle')
        
        return ttl_string
        
    except Exception as e:
        raise Exception(f"TTL conversion failed: {str(e)}")


def validate_turtle(ttl_string: str) -> bool:
    """
    Validate that TTL string is well-formed
    
    Args:
        ttl_string: Turtle format string
        
    Returns:
        True if valid, raises exception otherwise
    """
    try:
        g = Graph()
        g.parse(data=ttl_string, format='turtle')
        return True
    except Exception as e:
        raise Exception(f"Invalid Turtle: {str(e)}")