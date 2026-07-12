import { collectMoodieSubtreeIds, findMoodieFallbackLeaf, findMoodieLatestDescendantLeaf, groupMoodieAssistantSiblings, groupMoodieRoleSiblings } from "@/lib/moodie/branch-tree";

const nodes = [
  { id: "user-1", parent_message_id: null, role: "user", created_at: "2026-01-01T00:00:00Z" },
  { id: "assistant-1", parent_message_id: "user-1", role: "assistant", created_at: "2026-01-01T00:00:01Z" },
  { id: "assistant-2", parent_message_id: "user-1", role: "assistant", created_at: "2026-01-01T00:00:02Z" },
  { id: "user-2", parent_message_id: "assistant-2", role: "user", created_at: "2026-01-01T00:00:03Z" },
  { id: "assistant-3", parent_message_id: "user-2", role: "assistant", created_at: "2026-01-01T00:00:04Z" },
];

describe("Moodie branch tree", () => {
  it("collects the complete descendant subtree", () => {
    expect([...collectMoodieSubtreeIds(nodes, "assistant-2")].sort()).toEqual(["assistant-2", "assistant-3", "user-2"]);
  });

  it("falls back to the newest surviving assistant sibling", () => {
    const subtree = collectMoodieSubtreeIds(nodes, "assistant-2");
    expect(findMoodieFallbackLeaf(nodes, "assistant-2", subtree)).toBe("assistant-1");
  });

  it("groups assistant and user siblings in stable order", () => {
    const assistantGroups = groupMoodieAssistantSiblings(nodes);
    const userGroups = groupMoodieRoleSiblings(nodes, "user");
    expect(assistantGroups.get("user-1")?.map((node) => node.id)).toEqual(["assistant-1", "assistant-2"]);
    expect(userGroups.get("assistant-2")?.map((node) => node.id)).toEqual(["user-2"]);
  });

  it("resolves a selected branch root to its latest descendant leaf", () => {
    expect(findMoodieLatestDescendantLeaf(nodes, "assistant-2")).toBe("assistant-3");
  });
});
