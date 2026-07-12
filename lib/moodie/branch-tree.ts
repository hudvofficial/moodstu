export interface MoodieBranchNode {
  id: string;
  parent_message_id?: string | null;
  role: string | null;
  created_at?: string | null;
}

export function collectMoodieSubtreeIds(nodes: MoodieBranchNode[], rootId: string) {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent_message_id) continue;
    children.set(node.parent_message_id, [...(children.get(node.parent_message_id) || []), node.id]);
  }
  const subtree = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.pop();
    if (!id || subtree.has(id)) continue;
    subtree.add(id);
    queue.push(...(children.get(id) || []));
  }
  return subtree;
}

export function findMoodieFallbackLeaf(nodes: MoodieBranchNode[], rootId: string, subtree: Set<string>) {
  const target = nodes.find((node) => node.id === rootId);
  if (!target) return null;
  const sibling = nodes
    .filter((node) => node.role === "assistant" && node.parent_message_id === target.parent_message_id && !subtree.has(node.id))
    .sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")))[0];
  return sibling?.id || target.parent_message_id || null;
}

export function findMoodieLatestDescendantLeaf(nodes: MoodieBranchNode[], rootId: string) {
  const children = new Map<string, MoodieBranchNode[]>();
  for (const node of nodes) {
    if (!node.parent_message_id) continue;
    children.set(node.parent_message_id, [...(children.get(node.parent_message_id) || []), node]);
  }
  let currentId = rootId;
  const visited = new Set<string>();
  while (!visited.has(currentId)) {
    visited.add(currentId);
    const next = (children.get(currentId) || [])
      .sort((left, right) => String(right.created_at || "").localeCompare(String(left.created_at || "")))[0];
    if (!next) break;
    currentId = next.id;
  }
  return currentId;
}

export function groupMoodieRoleSiblings<T extends MoodieBranchNode>(nodes: T[], role: "assistant" | "user") {
  const groups = new Map<string, T[]>();
  for (const node of nodes) {
    if (node.role !== role) continue;
    const key = node.parent_message_id || "root";
    groups.set(key, [...(groups.get(key) || []), node]);
  }
  groups.forEach((items, key) => groups.set(key, items.sort((left, right) => String(left.created_at || "").localeCompare(String(right.created_at || "")))));
  return groups;
}

export function groupMoodieAssistantSiblings<T extends MoodieBranchNode>(nodes: T[]) {
  return groupMoodieRoleSiblings(nodes, "assistant");
}
