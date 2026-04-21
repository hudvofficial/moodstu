import type {
  MoodieCapability,
  MoodieConversationDetail,
  MoodieConversationScope,
  MoodieConversationSummary,
  MoodiePageStats,
} from "@/types/moodie";

export interface MoodieConversationCounts {
  all: number;
  active: number;
  locked: number;
}

export interface MoodieWorkspaceSharedProps {
  stats: MoodiePageStats;
  conversations: MoodieConversationSummary[];
  activeConversation: MoodieConversationDetail | null;
  activeConversationId: string | null;
  scope: MoodieConversationScope;
  search: string;
  counts: MoodieConversationCounts;
  loadingConversationId: string | null;
  editingConversationId: string | null;
  editingTitle: string;
  pendingPrompt: string | null;
  isSending: boolean;
  capabilities: MoodieCapability[];
  suggestions: string[];
  onSelectConversation: (conversationId: string) => void;
  onScopeChange: (value: MoodieConversationScope) => void;
  onSearchChange: (value: string) => void;
  onStartRename: (conversation: MoodieConversationSummary) => void;
  onEditTitleChange: (value: string) => void;
  onRenameSubmit: (conversationId: string) => void;
  onRenameCancel: () => void;
  onDeleteConversation: (conversation: MoodieConversationSummary) => void;
  onSendMessage: (content: string) => Promise<void>;
  onQuickPrompt: (prompt: string) => void;
  onNewConversation: () => void;
}
