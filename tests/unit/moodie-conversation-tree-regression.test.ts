import { describe, expect, it } from "@jest/globals";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("Moodie conversation tree regression", () => {
  it("keeps the active leaf in the optimistic conversation lock projection", () => {
    const source = readFileSync(
      path.join(process.cwd(), "app", "actions", "moodie-mutations.ts"),
      "utf8",
    );
    const lockFunction = source.slice(
      source.indexOf("async function lockExistingConversation"),
      source.indexOf("async function unlockConversation"),
    );

    expect(lockFunction).toContain("summary_updated_at");
    expect(lockFunction).toContain("active_leaf_message_id");
    expect(source).toContain("parent_message_id: conversation.active_leaf_message_id");
  });

  it("repairs only later root user turns and preserves existing branches", () => {
    const migration = readFileSync(
      path.join(process.cwd(), "supabase", "migrations", "20260711170000_repair_moodie_conversation_trees.sql"),
      "utf8",
    );

    expect(migration).toContain("user_message.role = 'user'");
    expect(migration).toContain("user_message.parent_message_id IS NULL");
    expect(migration).toContain("candidate.role = 'assistant'");
    expect(migration).toContain("candidate.conversation_id = user_message.conversation_id");
    expect(migration).not.toMatch(/SET\s+active_leaf_message_id/i);
  });
});
