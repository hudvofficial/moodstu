import type {
  MoodieCapability,
  MoodieConversationDetail,
  MoodieMessagePart,
  MoodiePageData,
  MoodieConversationScope,
  MoodieConversationSummary,
  MoodieComposerSubmission,
  MoodieTurnActivity,
} from "@/types/moodie";

export interface MoodieConversationCounts {
  all: number;
  active: number;
  locked: number;
}

export interface MoodieWorkspaceSharedProps {
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
  streamRequestId: string | null;
  streamStatus: string | null;
  turnActivities: MoodieTurnActivity[];
  streamedText: string;
  streamedParts: Array<{ id: string; part: MoodieMessagePart }>;
  capabilities: MoodieCapability[];
  suggestions: string[];
  providerReady: boolean;
  modelOptions: MoodiePageData["models"]["options"];
  selectedModel: string;
  onModelChange: (model: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onScopeChange: (value: MoodieConversationScope) => void;
  onSearchChange: (value: string) => void;
  onStartRename: (conversation: MoodieConversationSummary) => void;
  onEditTitleChange: (value: string) => void;
  onRenameSubmit: (conversationId: string) => void;
  onRenameCancel: () => void;
  onDeleteConversation: (conversation: MoodieConversationSummary) => void;
  onSendMessage: (submission: MoodieComposerSubmission) => Promise<void>;
  onStopGeneration: () => void;
  onRegenerateMessage: (messageId: string, content: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onContinueMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onQuickPrompt: (prompt: string) => void;
  onNewConversation: () => void;
}
