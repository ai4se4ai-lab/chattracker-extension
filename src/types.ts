/**
 * Represents a single chat message in the conversation
 */
export interface ChatMessage {
  /** Role of the message sender (user or assistant) */
  role: 'user' | 'assistant';
  /** The actual content of the message */
  content: string;
  /** ISO 8601 timestamp when the message was created */
  timestamp: string;
  /** Optional metadata specific to this message */
  metadata?: MessageMetadata;
}

/**
 * Metadata for individual messages
 */
export interface MessageMetadata {
  /** Token count for this specific message, if available */
  tokenCount?: number;
  /** Any additional properties */
  [key: string]: any;
}

/**
 * Metadata for the entire chat session
 */
export interface ChatMetadata {
  /** Unique identifier/hash for this chat */
  chatId: string;
  /** Model used for the conversation (e.g., "gpt-4", "claude-3-sonnet") */
  model?: string;
  /** Total token count for the conversation, if available */
  totalTokens?: number;
  /** Timestamp when the chat was exported */
  exportedAt: string;
  /** Total number of messages in the chat */
  messageCount: number;
  /** Any additional metadata */
  [key: string]: any;
}

/**
 * Complete structure of an exported chat
 */
export interface ExportedChat {
  /** Metadata about the chat session */
  metadata: ChatMetadata;
  /** Array of all messages in the conversation */
  messages: ChatMessage[];
}

/**
 * Result of a chat extraction operation
 */
export interface ExtractionResult {
  /** Whether the extraction was successful */
  success: boolean;
  /** The extracted chat data, if successful */
  data?: ExportedChat;
  /** Error message if extraction failed */
  error?: string;
}

