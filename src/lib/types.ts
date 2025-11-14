export type AILabel = 'normal' | 'stressed' | 'need_help';

export type Post = {
  id: string; // Changed from postId to id for consistency with useCollection
  postId: string;
  userId: string;
  content: string;
  createdAt: string; // ISO 8601 string
  aiLabel: AILabel;
  aiConfidence: number;
  hidden?: boolean;
  reply?: string;
};

export type AdminActionType = 'reply' | 'hide' | 'unhide' | 're-label';

export type AdminAction = {
  actionId: string;
  adminId: string;
  targetId: string; // postId
  type: AdminActionType;
  timestamp: string; // ISO 8601 string
  details: Record<string, any>;
};

export type ChatMessage = {
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO 8601 string
};

export type AIChat = {
  id: string; // Changed from sessionId
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  escalated: boolean;
};
