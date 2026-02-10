export type TaskStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'waiting_permission'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted';

export interface TaskConfig {
  prompt: string;
  taskId?: string;
  workingDirectory?: string;
  allowedTools?: string[];
  systemPromptAppend?: string;
  outputSchema?: object;
  sessionId?: string;
  /** Model ID for display name in progress events */
  modelId?: string;
  /** File attachments to include with the task */
  attachments?: TaskAttachment[];
}

export interface Task {
  id: string;
  prompt: string;
  summary?: string;
  status: TaskStatus;
  sessionId?: string;
  messages: TaskMessage[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: TaskResult;
}

/**
 * File attachment types supported in tasks
 */
export type AttachmentType =
  | 'screenshot'
  | 'json'
  | 'image'
  | 'text'
  | 'code'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'audio'
  | 'video'
  | 'ebook'
  | 'email';

/**
 * File attachment in a task message
 * Supports multiple file formats with base64 encoding
 */
export interface TaskAttachment {
  /** Type of attachment content */
  type: AttachmentType;
  /** Base64 encoded file data or extracted text content */
  data: string;
  /** Optional display label (legacy, use fileName) */
  label?: string;
  /** Original file name */
  fileName?: string;
  /** MIME type of the file */
  mimeType?: string;
  /** File size in bytes */
  size?: number;
  /** ISO timestamp when attachment was created */
  timestamp?: string;
  /** For text-based files: the extracted text content */
  textContent?: string;
  /** Number of pages (for PDF, presentations) */
  pageCount?: number;
  /** Language detected (for text documents) */
  language?: string;
}

/**
 * Result from file attachment operations
 */
export interface FileAttachmentResult {
  success: boolean;
  attachments?: TaskAttachment[];
  error?: string;
  warnings?: string[];
  totalSize?: number;
}

/**
 * Configuration for file attachments
 */
export interface AttachmentConfig {
  /** Maximum size per file in bytes (default: 10MB) */
  maxFileSize: number;
  /** Maximum total size per task in bytes (default: 50MB) */
  maxTotalSize: number;
  /** Supported file extensions by category */
  supportedTypes: Record<string, string[]>;
  /** Whether to use OCR for PDFs with images */
  enableOCR: boolean;
  /** Maximum file size for OCR in bytes (default: 5MB) */
  maxOCRFileSize: number;
}

export interface TaskMessage {
  id: string;
  type: 'assistant' | 'user' | 'tool' | 'system';
  content: string;
  toolName?: string;
  toolInput?: unknown;
  timestamp: string;
  attachments?: TaskAttachment[];
}

export interface TaskResult {
  status: 'success' | 'error' | 'interrupted';
  sessionId?: string;
  durationMs?: number;
  error?: string;
}

export type StartupStage =
  | 'starting'
  | 'browser'
  | 'environment'
  | 'loading'
  | 'connecting'
  | 'waiting';

/**
 * Array of all valid startup stage values.
 * Order reflects the typical startup progression.
 * Typed as readonly string[] for easy use with .includes() on string values.
 */
export const STARTUP_STAGES: readonly string[] = [
  'starting',
  'browser',
  'environment',
  'loading',
  'connecting',
  'waiting',
] as const satisfies readonly StartupStage[];

export interface TaskProgress {
  taskId: string;
  stage: 'init' | 'thinking' | 'tool-use' | 'waiting' | 'complete' | 'setup' | StartupStage;
  toolName?: string;
  toolInput?: unknown;
  percentage?: number;
  message?: string;
  modelName?: string;
  isFirstTask?: boolean;
}

export interface TaskUpdateEvent {
  taskId: string;
  type: 'message' | 'progress' | 'complete' | 'error';
  message?: TaskMessage;
  progress?: TaskProgress;
  result?: TaskResult;
  error?: string;
}
