import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MoodieConversationList } from "@/components/moodie/moodie-conversation-list";

const conversation = {
  id: "conversation-1",
  title: "Chào bạn",
  last_message_preview: null,
  message_count: 1,
  created_at: "2026-07-11T08:00:00.000Z",
  updated_at: "2026-07-11T08:00:00.000Z",
  locked_until: null,
  locked_by: null,
  version: 1,
  active_leaf_message_id: null,
};

describe("Moodie conversation list actions", () => {
  it("renders a controlled visible mobile action and hover-revealed desktop action", () => {
    const markup = renderToStaticMarkup(createElement(MoodieConversationList, {
      conversations: [conversation],
      activeId: conversation.id,
      editingConversationId: null,
      editingTitle: "",
      onSelect: () => {},
      onStartRename: () => {},
      onEditTitleChange: () => {},
      onRenameSubmit: () => {},
      onRenameCancel: () => {},
      onDelete: () => {},
    }));

    expect(markup).toContain('aria-label="Tùy chọn cuộc trò chuyện"');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("z-10 flex h-7 w-7");
    expect(markup).toContain("opacity-100");
    expect(markup).toContain("md:opacity-0");
    expect(markup).toContain("md:group-hover:opacity-100");
    expect(markup).toContain("stroke-[2.5]");
  });
});
