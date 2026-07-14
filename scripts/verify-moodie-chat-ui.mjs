import { readFile } from "node:fs/promises";

const files = {
  bubble: "components/moodie/moodie-message-bubble.tsx",
  thinking: "components/moodie/moodie-thinking-state.tsx",
  picker: "components/moodie/moodie-model-picker.tsx",
  composer: "components/moodie/moodie-composer.tsx",
  empty: "components/moodie/moodie-empty-state.tsx",
  stream: "lib/moodie/stream-client.ts",
  engine: "lib/moodie/engine.ts",
  contract: "docs/moodie-chat-ui-contract.md",
};

const contents = Object.fromEntries(
  await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await readFile(path, "utf8")])),
);

const checks = [
  [contents.bubble.includes("!pending && isAssistant ? <MoodieExecutionSummary"), "Execution summary must be hidden while pending"],
  [!contents.bubble.includes("pending={pending}"), "Pending state must not be forwarded to execution summary"],
  [!contents.bubble.includes("<Bot"), "Assistant answers must remain content-first without repeated avatars"],
  [contents.thinking.includes("elapsedSeconds"), "Thinking state must expose elapsed time"],
  [contents.thinking.includes("min-h-8"), "Thinking row must keep compact geometry"],
  [contents.picker.includes("role=\"listbox\""), "Model picker must expose listbox semantics"],
  [contents.picker.includes("Tìm model..."), "Large model catalogs must be searchable"],
  [!contents.picker.includes("<select"), "Model picker must not fall back to a native select"],
  [contents.composer.includes("<MoodieModelPicker"), "Composer must own model selection"],
  [!contents.empty.includes("<Bot"), "Empty state must avoid a decorative bot card"],
  [contents.empty.includes("sm:grid-cols-2"), "Prompt starters must collapse from a desktop grid to a mobile list"],
  [contents.stream.includes("model: params.model"), "Selected model must be sent to the streaming route"],
  [contents.engine.includes("getActiveMoodieProvider(params.model)"), "Selected model must reach the provider runtime"],
  [contents.contract.includes("One state, one surface"), "Moodie chat UI contract must remain present"],
];

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length > 0) {
  console.error("Moodie chat UI verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Moodie chat UI verification passed (${checks.length} invariants).`);
