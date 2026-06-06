#!/usr/bin/env python3
"""Fix validation errors in knowledge-graph.json"""

import json
import sys
from pathlib import Path

# Valid node types
VALID_NODE_TYPES = {
    "file", "function", "class", "module", "concept", "config",
    "document", "service", "table", "endpoint", "pipeline", "schema",
    "resource", "domain", "flow", "step", "article", "entity",
    "topic", "claim", "source"
}

# Valid edge types
VALID_EDGE_TYPES = {
    "imports", "exports", "contains", "inherits", "implements", "calls",
    "subscribes", "publishes", "middleware", "reads_from", "writes_to",
    "transforms", "validates", "depends_on", "tested_by", "configures",
    "related", "similar_to", "deploys", "serves", "provisions", "triggers",
    "migrates", "documents", "routes", "defines_schema", "contains_flow",
    "flow_step", "cross_domain", "cites", "contradicts", "builds_on",
    "exemplifies", "categorized_under", "authored_by"
}

# Type mapping for invalid types
TYPE_MAPPING = {
    "export": "function",
    "constant": "config",
    "interface": "class",
    "type": "class",
}

def fix_node(node):
    """Fix a single node's schema issues"""
    fixed = {}

    # Fix ID (keep as-is)
    fixed["id"] = node.get("id", "")

    # Fix type
    node_type = node.get("type", "file")
    if node_type not in VALID_NODE_TYPES:
        node_type = TYPE_MAPPING.get(node_type, "file")
    fixed["type"] = node_type

    # Fix name (from label or name)
    fixed["name"] = node.get("name") or node.get("label", node.get("id", "unknown"))

    # Fix summary (from description or summary)
    fixed["summary"] = node.get("summary") or node.get("description", fixed["name"])

    # Fix tags
    tags = node.get("tags", [])
    if not isinstance(tags, list):
        tags = []
    fixed["tags"] = tags

    # Fix complexity
    complexity = node.get("complexity", "simple")
    if complexity not in ["simple", "moderate", "complex"]:
        complexity = "moderate"
    fixed["complexity"] = complexity

    # Preserve optional fields if they exist
    for field in ["filePath", "languageNotes", "metadata"]:
        if field in node:
            fixed[field] = node[field]

    return fixed

def fix_edge(edge, valid_node_ids):
    """Fix a single edge's schema issues"""
    fixed = {}

    # Check if source and target exist
    source = edge.get("source", "")
    target = edge.get("target", "")

    if source not in valid_node_ids or target not in valid_node_ids:
        return None  # Drop edge with invalid nodes

    fixed["source"] = source
    fixed["target"] = target

    # Fix type
    edge_type = edge.get("type", "depends_on")
    if edge_type not in VALID_EDGE_TYPES:
        edge_type = "depends_on"
    fixed["type"] = edge_type

    # Fix weight
    weight = edge.get("weight", 0.5)
    if not isinstance(weight, (int, float)) or weight < 0 or weight > 1:
        weight = 0.5
    fixed["weight"] = weight

    # Preserve optional fields
    if "label" in edge:
        fixed["label"] = edge["label"]

    return fixed

def fix_tour(tour, valid_node_ids):
    """Fix tour entries"""
    fixed_tour = []
    for i, entry in enumerate(tour):
        if isinstance(entry, dict):
            node_id = entry.get("nodeId")
            if node_id and node_id in valid_node_ids:
                fixed_tour.append({
                    "nodeId": node_id,
                    "step": entry.get("step", i)
                })
        elif isinstance(entry, (int, str)):
            # If it's just a node index or ID
            if isinstance(entry, int) and 0 <= entry < len(valid_node_ids):
                fixed_tour.append({
                    "nodeId": list(valid_node_ids)[entry],
                    "step": i
                })
    return fixed_tour

def main():
    graph_path = Path("c:/Users/Admin/Desktop/Ai/mood saas/mood-studio/.understand-anything/knowledge-graph.json")

    if not graph_path.exists():
        print(f"Error: {graph_path} not found")
        sys.exit(1)

    print(f"Reading {graph_path}...")
    with open(graph_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"Original: {len(data.get('nodes', []))} nodes, {len(data.get('edges', []))} edges")

    # Fix nodes
    fixed_nodes = []
    dropped_nodes = []
    for node in data.get("nodes", []):
        try:
            fixed = fix_node(node)
            if fixed["id"] and fixed["summary"]:
                fixed_nodes.append(fixed)
            else:
                dropped_nodes.append(node.get("id", "unknown"))
        except Exception as e:
            dropped_nodes.append(node.get("id", "unknown"))
            print(f"Warning: Could not fix node {node.get('id')}: {e}")

    valid_node_ids = {node["id"] for node in fixed_nodes}

    # Fix edges
    fixed_edges = []
    dropped_edges = []
    for edge in data.get("edges", []):
        try:
            fixed = fix_edge(edge, valid_node_ids)
            if fixed:
                fixed_edges.append(fixed)
            else:
                dropped_edges.append(f"{edge.get('source')} -> {edge.get('target')}")
        except Exception as e:
            dropped_edges.append(f"{edge.get('source')} -> {edge.get('target')}")
            print(f"Warning: Could not fix edge: {e}")

    # Fix tour
    fixed_tour = []
    if "tour" in data and isinstance(data["tour"], list):
        fixed_tour = fix_tour(data["tour"], valid_node_ids)

    # Build fixed graph
    fixed_graph = {
        "version": data.get("version", "1.0.0"),
        "project": data.get("project", {}),
        "nodes": fixed_nodes,
        "edges": fixed_edges,
    }

    if fixed_tour:
        fixed_graph["tour"] = fixed_tour

    if "layers" in data:
        fixed_graph["layers"] = data["layers"]

    # Write fixed graph
    output_path = graph_path
    print(f"\nWriting fixed graph to {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(fixed_graph, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Fixed: {len(fixed_nodes)} nodes, {len(fixed_edges)} edges")
    if dropped_nodes:
        print(f"✗ Dropped {len(dropped_nodes)} invalid nodes")
    if dropped_edges:
        print(f"✗ Dropped {len(dropped_edges)} invalid edges")
    if fixed_tour:
        print(f"✓ Fixed tour with {len(fixed_tour)} steps")

if __name__ == "__main__":
    main()
