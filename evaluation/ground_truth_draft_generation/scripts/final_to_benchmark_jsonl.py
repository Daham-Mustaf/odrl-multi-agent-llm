import json
import os
import re
from typing import Dict, List, Tuple

from rdflib import BNode, Graph, Literal, Namespace, URIRef


ODRL = Namespace("http://www.w3.org/ns/odrl/2/")
RDF = Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")


FINAL_FILE_PATTERN = re.compile(r"^(use_case_\d+)_Final_(Agreement|Offer|Rule)_.+\.ttl$")


def _qname_or_text(graph: Graph, node) -> str:
    if isinstance(node, Literal):
        # Preserve literal datatype/language, e.g. "DE"^^xsd:string
        return node.n3(namespace_manager=graph.namespace_manager)
    if isinstance(node, URIRef):
        try:
            return graph.namespace_manager.normalizeUri(node)
        except Exception:
            return str(node)
    return str(node)


def _extract_action_values(graph: Graph, rule_node) -> List[str]:
    actions: List[str] = []
    for action in graph.objects(rule_node, ODRL.action):
        if isinstance(action, BNode):
            # Support action node patterns like:
            #   odrl:action [ odrl:rdf:value odrl:stream ; ... ]
            # and fallback to any URIRef found inside the action bnode.
            rdf_value = graph.value(action, URIRef("http://www.w3.org/ns/odrl/2/rdf:value"))
            if rdf_value is not None:
                actions.append(_qname_or_text(graph, rdf_value))
                continue

            nested_uri = None
            for _, _, obj in graph.triples((action, None, None)):
                if isinstance(obj, URIRef):
                    nested_uri = obj
                    break
            if nested_uri is not None:
                actions.append(_qname_or_text(graph, nested_uri))
            else:
                actions.append(str(action))
        else:
            actions.append(_qname_or_text(graph, action))
    return actions


def _extract_constraint_triplets(graph: Graph, rule_node) -> List[Tuple[str, str, str]]:
    triplets: List[Tuple[str, str, str]] = []
    for constraint in graph.objects(rule_node, ODRL.constraint):
        left = graph.value(constraint, ODRL.leftOperand)
        operator = graph.value(constraint, ODRL.operator)
        right = graph.value(constraint, ODRL.rightOperand)
        if left is None and operator is None and right is None:
            continue
        triplets.append(
            (
                _qname_or_text(graph, left) if left is not None else "",
                _qname_or_text(graph, operator) if operator is not None else "",
                _qname_or_text(graph, right) if right is not None else "",
            )
        )
    return triplets


def _extract_permission_duty_fields(
    graph: Graph, permission_node
) -> Tuple[List[str], List[Tuple[str, str, str]]]:
    duty_actions: List[str] = []
    duty_constraints: List[Tuple[str, str, str]] = []

    for duty in graph.objects(permission_node, ODRL.duty):
        duty_actions.extend(_extract_action_values(graph, duty))
        duty_constraints.extend(_extract_constraint_triplets(graph, duty))

    return duty_actions, duty_constraints


def _find_policy_subject_and_type(graph: Graph, policy_kind: str):
    if policy_kind == "Agreement":
        cls = ODRL.Agreement
        policy_type = "odrl:Agreement"
    elif policy_kind == "Offer":
        cls = ODRL.Offer
        policy_type = "odrl:Offer"
    else:
        cls = ODRL.Set
        policy_type = "odrl:Set"

    for subj in graph.subjects(RDF.type, cls):
        return subj, policy_type
    return None, policy_type


def extract_record_from_final_ttl(
    ttl_path: str,
    policy_kind: str,
    input_text: str,
):
    graph = Graph()
    graph.parse(ttl_path, format="ttl")

    policy_subj, policy_type = _find_policy_subject_and_type(graph, policy_kind)
    if policy_subj is None:
        return {
            "Input": input_text,
            "policy_type": policy_type,
            "Permission.actions": [],
            "Permission.Constraints.Triplets": [],
            "Permission.duty.actions": [],
            "Permission.duty.Constraints.Triplets": [],
            "Prohibition.actions": [],
            "Prohibition.Constraints.Triplets": [],
        }

    permission_actions: List[str] = []
    permission_constraints: List[Tuple[str, str, str]] = []
    permission_duty_actions: List[str] = []
    permission_duty_constraints: List[Tuple[str, str, str]] = []
    for perm in graph.objects(policy_subj, ODRL.permission):
        permission_actions.extend(_extract_action_values(graph, perm))
        permission_constraints.extend(_extract_constraint_triplets(graph, perm))
        duty_actions, duty_constraints = _extract_permission_duty_fields(graph, perm)
        permission_duty_actions.extend(duty_actions)
        permission_duty_constraints.extend(duty_constraints)

    prohibition_actions: List[str] = []
    prohibition_constraints: List[Tuple[str, str, str]] = []
    for prohib in graph.objects(policy_subj, ODRL.prohibition):
        prohibition_actions.extend(_extract_action_values(graph, prohib))
        prohibition_constraints.extend(_extract_constraint_triplets(graph, prohib))

    return {
        "Input": input_text,
        "policy_type": policy_type,
        "Permission.actions": permission_actions,
        "Permission.Constraints.Triplets": permission_constraints,
        "Permission.duty.actions": permission_duty_actions,
        "Permission.duty.Constraints.Triplets": permission_duty_constraints,
        "Prohibition.actions": prohibition_actions,
        "Prohibition.Constraints.Triplets": prohibition_constraints,
    }


def build_benchmark_jsonl(
    session_output_dir: str,
    use_cases_by_type: Dict[str, Dict[str, str]],
    output_filename: str = "text2ttl_GT.jsonl",
) -> str:
    rows = []
    for name in sorted(os.listdir(session_output_dir)):
        match = FINAL_FILE_PATTERN.match(name)
        if not match:
            continue

        use_case_id, policy_kind = match.group(1), match.group(2)
        input_text = use_cases_by_type.get(policy_kind, {}).get(use_case_id, "")
        ttl_path = os.path.join(session_output_dir, name)
        rows.append(extract_record_from_final_ttl(ttl_path, policy_kind, input_text))

    output_path = os.path.join(session_output_dir, output_filename)
    with open(output_path, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

    return output_path
