/**
 * Temporary Files Manager for WaIA File Attachments
 *
 * Manages temporary files created from task attachments, ensuring:
 * - Files are accessible to the OpenCode agent
 * - Automatic cleanup of expired sessions
 * - Secure file handling with proper permissions
 * - Cross-platform compatibility (Windows, macOS, Linux)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { TaskAttachment } from '../types/task.js';

/**
 * Information about a temporary file
 */
export interface TempFileInfo {
  /** Session ID this file belongs to */
  sessionId: string;
  /** Original filename from the attachment */
  originalFileName: string;
  /** Absolute path to the temporary file */
  tempFilePath: string;
  /** MIME type if available */
  mimeType?: string;
  /** File size in bytes */
  size: number;
  /** When the file was created */
  createdAt: Date;
  /** When the file was last accessed */
  lastAccessed: Date;
}

/**
 * Information about a temporary session
 */
export interface TempSessionInfo {
  /** Session identifier (usually taskId) */
  sessionId: string;
  /** When the session was created */
  createdAt: Date;
  /** Last activity timestamp */
  lastActivity: Date;
  /** Number of files in this session */
  fileCount: number;
  /** Total size of all files in bytes */
  totalSize: number;
}

/**
 * Configuration constants for the temp files manager
 */
const CONFIG = {
  /** Base directory name in system temp */
  BASE_TEMP_DIR: 'waia-attachments',
  /** Maximum age of a session before auto-cleanup (24 hours) */
  MAX_SESSION_AGE_MS: 24 * 60 * 60 * 1000,
  /** Maximum file size (100MB) */
  MAX_FILE_SIZE_MB: 100,
  /** Maximum total session size (500MB) */
  MAX_SESSION_SIZE_MB: 500,
  /** Cleanup interval (1 hour) */
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000,
} as const;

/**
 * Manages temporary files for task attachments.
 *
 * This singleton class handles creating, tracking, and cleaning up
 * temporary files that are attached to tasks. Files are stored in
 * the system temp directory under a "waia-attachments" subdirectory,
 * organized by session ID.
 *
 * @example
 * ```typescript
 * const manager = TempFilesManager.getInstance();
 * await manager.initialize();
 *
 * const tempFiles = await manager.createTempFilesFromAttachments(
 *   sessionId,
 *   attachments
 * );
 *
 * // Later...
 * await manager.cleanupSession(sessionId);
 * ```
 */
export class TempFilesManager {
  private static instance: TempFilesManager;
  private sessions: Map<string, TempSessionInfo> = new Map();
  private files: Map<string, TempFileInfo> = new Map();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private baseTempPath: string;
  private initialized = false;

  private constructor() {
    this.baseTempPath = path.join(os.tmpdir(), CONFIG.BASE_TEMP_DIR);
  }

  /**
   * Get the singleton instance of TempFilesManager
   */
  public static getInstance(): TempFilesManager {
    if (!TempFilesManager.instance) {
      TempFilesManager.instance = new TempFilesManager();
    }
    return TempFilesManager.instance;
  }

  /**
   * Initialize the temp files manager
   *
   * Creates the base directory and recovers any existing sessions
   * (e.g., after app restart).
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.ensureBaseDirectory();
      await this.recoverExistingSessions();
      this.startCleanupTimer();
      this.initialized = true;
      console.log('[TempFilesManager] Initialized at:', this.baseTempPath);
    } catch (error) {
      throw new Error(`Failed to initialize TempFilesManager: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create temporary files from task attachments
   *
   * @param sessionId - The session/task ID
   * @param attachments - Array of task attachments to create files from
   * @returns Array of TempFileInfo with paths to the created files
   */
  public async createTempFilesFromAttachments(
    sessionId: string,
    attachments: TaskAttachment[]
  ): Promise<TempFileInfo[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    this.validateSessionId(sessionId);

    if (!attachments || attachments.length === 0) {
      return [];
    }

    const sessionPath = await this.ensureSessionDirectory(sessionId);
    const tempFiles: TempFileInfo[] = [];
    let sessionSize = this.getSessionSize(sessionId);

    try {
      for (const attachment of attachments) {
        const tempFile = await this.createTempFileFromAttachment(
          sessionId,
          sessionPath,
          attachment,
          sessionSize
        );

        tempFiles.push(tempFile);
        sessionSize += tempFile.size;

        this.files.set(tempFile.tempFilePath, tempFile);
      }

      this.updateSessionInfo(sessionId, tempFiles.length, sessionSize);
      console.log(`[TempFilesManager] Created ${tempFiles.length} temp files for session ${sessionId}`);
      return tempFiles;

    } catch (error) {
      // Cleanup any created files on error
      await this.cleanupFiles(tempFiles.map(f => f.tempFilePath));
      throw error;
    }
  }

  /**
   * Get information about a specific temp file
   */
  public getTempFileInfo(filePath: string): TempFileInfo | undefined {
    const fileInfo = this.files.get(filePath);
    if (fileInfo) {
      fileInfo.lastAccessed = new Date();
      this.files.set(filePath, fileInfo);
    }
    return fileInfo;
  }

  /**
   * Get all files for a session
   */
  public getSessionFiles(sessionId: string): TempFileInfo[] {
    return Array.from(this.files.values()).filter(
      file => file.sessionId === sessionId
    );
  }

  /**
   * Get session information
   */
  public getSessionInfo(sessionId: string): TempSessionInfo | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get the base temp directory path
   */
  public getBaseTempPath(): string {
    return this.baseTempPath;
  }

  /**
   * Get the path for a specific session
   */
  public getSessionPath(sessionId: string): string {
    return path.join(this.baseTempPath, this.sanitizeSessionId(sessionId));
  }

  /**
   * Clean up a specific session
   *
   * Removes all files in the session and the session directory.
   */
  public async cleanupSession(sessionId: string): Promise<void> {
    this.validateSessionId(sessionId);

    const sessionFiles = this.getSessionFiles(sessionId);
    const filePaths = sessionFiles.map(f => f.tempFilePath);

    await this.cleanupFiles(filePaths);

    // Remove session directory
    const sessionPath = this.getSessionPath(sessionId);
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[TempFilesManager] Failed to remove session directory ${sessionPath}:`, error);
    }

    this.sessions.delete(sessionId);
    console.log(`[TempFilesManager] Cleaned up session ${sessionId}`);
  }

  /**
   * Clean up all expired sessions and files
   *
   * @returns Object with counts of cleaned up sessions and files
   */
  public async cleanupExpired(): Promise<{ sessionsCleanedUp: number; filesCleanedUp: number }> {
    const now = new Date();
    const expiredSessions: string[] = [];

    // Find expired sessions
    for (const [sessionId, sessionInfo] of this.sessions) {
      const ageMs = now.getTime() - sessionInfo.lastActivity.getTime();
      if (ageMs > CONFIG.MAX_SESSION_AGE_MS) {
        expiredSessions.push(sessionId);
      }
    }

    // Cleanup expired sessions
    let totalFilesCleanedUp = 0;
    for (const sessionId of expiredSessions) {
      const fileCount = this.getSessionFiles(sessionId).length;
      await this.cleanupSession(sessionId);
      totalFilesCleanedUp += fileCount;
    }

    if (expiredSessions.length > 0) {
      console.log(`[TempFilesManager] Cleaned up ${expiredSessions.length} expired sessions with ${totalFilesCleanedUp} files`);
    }

    return {
      sessionsCleanedUp: expiredSessions.length,
      filesCleanedUp: totalFilesCleanedUp
    };
  }

  /**
   * Shutdown the temp files manager
   *
   * Stops the cleanup timer and optionally cleans up all sessions.
   */
  public async shutdown(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Cleanup all sessions on shutdown
    const allSessions = Array.from(this.sessions.keys());
    for (const sessionId of allSessions) {
      try {
        await this.cleanupSession(sessionId);
      } catch (error) {
        console.warn(`[TempFilesManager] Failed to cleanup session ${sessionId} during shutdown:`, error);
      }
    }

    this.initialized = false;
  }

  // Private methods

  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.access(this.baseTempPath);
    } catch {
      await fs.mkdir(this.baseTempPath, { recursive: true });
      console.log('[TempFilesManager] Created base directory:', this.baseTempPath);
    }
  }

  private async ensureSessionDirectory(sessionId: string): Promise<string> {
    const sanitizedSessionId = this.sanitizeSessionId(sessionId);
    const sessionPath = path.join(this.baseTempPath, sanitizedSessionId);

    try {
      await fs.access(sessionPath);
    } catch {
      await fs.mkdir(sessionPath, { recursive: true });
      console.log('[TempFilesManager] Created session directory:', sessionPath);
    }

    return sessionPath;
  }

  private async recoverExistingSessions(): Promise<void> {
    try {
      const entries = await fs.readdir(this.baseTempPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            await this.recoverSession(entry.name);
          } catch (error) {
            console.warn(`[TempFilesManager] Failed to recover session ${entry.name}:`, error);
            // Try to cleanup corrupted session directory
            try {
              await fs.rm(path.join(this.baseTempPath, entry.name), { recursive: true, force: true });
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      }
    } catch (error) {
      // Base directory might not exist yet
      console.warn('[TempFilesManager] Failed to recover existing sessions:', error);
    }
  }

  private async recoverSession(sessionDirName: string): Promise<void> {
    const sessionPath = path.join(this.baseTempPath, sessionDirName);
    const files = await fs.readdir(sessionPath);

    let totalSize = 0;
    const now = new Date();
    const recoveredFiles: TempFileInfo[] = [];

    for (const fileName of files) {
      const filePath = path.join(sessionPath, fileName);
      try {
        const stats = await fs.stat(filePath);
        const fileInfo: TempFileInfo = {
          sessionId: sessionDirName,
          originalFileName: fileName,
          tempFilePath: filePath,
          size: stats.size,
          createdAt: stats.birthtime,
          lastAccessed: stats.atime
        };

        recoveredFiles.push(fileInfo);
        this.files.set(filePath, fileInfo);
        totalSize += stats.size;
      } catch (error) {
        console.warn(`[TempFilesManager] Failed to recover file ${filePath}:`, error);
      }
    }

    const sessionInfo: TempSessionInfo = {
      sessionId: sessionDirName,
      createdAt: now,
      lastActivity: now,
      fileCount: recoveredFiles.length,
      totalSize
    };

    this.sessions.set(sessionDirName, sessionInfo);
    console.log(`[TempFilesManager] Recovered session ${sessionDirName} with ${recoveredFiles.length} files`);
  }

  private async createTempFileFromAttachment(
    sessionId: string,
    sessionPath: string,
    attachment: TaskAttachment,
    currentSessionSize: number
  ): Promise<TempFileInfo> {
    // Validate attachment has data
    if (!attachment.data) {
      throw new Error('Invalid attachment: missing data');
    }

    // Decode base64 to get actual size
    const buffer = Buffer.from(attachment.data, 'base64');
    const fileSize = buffer.length;

    // Validate file size
    const maxFileSize = CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (fileSize > maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${CONFIG.MAX_FILE_SIZE_MB}MB`);
    }

    // Validate session size
    const maxSessionSize = CONFIG.MAX_SESSION_SIZE_MB * 1024 * 1024;
    if (currentSessionSize + fileSize > maxSessionSize) {
      throw new Error(`Session size would exceed maximum allowed size of ${CONFIG.MAX_SESSION_SIZE_MB}MB`);
    }

    // Generate safe filename
    const originalFileName = attachment.fileName || attachment.label || `attachment_${Date.now()}`;
    const safeFileName = this.sanitizeFileName(originalFileName);
    let tempFilePath = path.join(sessionPath, safeFileName);

    // Ensure file doesn't already exist - add counter if needed
    let counter = 1;
    while (await this.fileExists(tempFilePath)) {
      const ext = path.extname(safeFileName);
      const name = path.basename(safeFileName, ext);
      tempFilePath = path.join(sessionPath, `${name}_${counter}${ext}`);
      counter++;
    }

    // Write file
    try {
      await fs.writeFile(tempFilePath, buffer);
    } catch (error) {
      throw new Error(`Failed to write temp file: ${error instanceof Error ? error.message : String(error)}`);
    }

    const now = new Date();
    return {
      sessionId,
      originalFileName,
      tempFilePath,
      mimeType: attachment.mimeType,
      size: fileSize,
      createdAt: now,
      lastAccessed: now
    };
  }

  private async cleanupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        this.files.delete(filePath);
      } catch (error) {
        console.warn(`[TempFilesManager] Failed to cleanup file ${filePath}:`, error);
      }
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private updateSessionInfo(sessionId: string, additionalFiles: number, newTotalSize: number): void {
    const existing = this.sessions.get(sessionId);
    const now = new Date();

    if (existing) {
      existing.lastActivity = now;
      existing.fileCount += additionalFiles;
      existing.totalSize = newTotalSize;
    } else {
      this.sessions.set(sessionId, {
        sessionId,
        createdAt: now,
        lastActivity: now,
        fileCount: additionalFiles,
        totalSize: newTotalSize
      });
    }
  }

  private getSessionSize(sessionId: string): number {
    const sessionInfo = this.sessions.get(sessionId);
    return sessionInfo ? sessionInfo.totalSize : 0;
  }

  private validateSessionId(sessionId: string): void {
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Invalid session ID');
    }

    if (sessionId.length > 255) {
      throw new Error('Session ID too long');
    }

    // Check for directory traversal attempts
    if (sessionId.includes('..') || sessionId.includes('/') || sessionId.includes('\\')) {
      throw new Error('Invalid characters in session ID');
    }
  }

  private sanitizeSessionId(sessionId: string): string {
    return sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private sanitizeFileName(fileName: string): string {
    // Remove or replace unsafe characters
    const sanitized = fileName
      .replace(/[<>:"|?*\x00-\x1f]/g, '_')
      .replace(/^\.+/, '') // Remove leading dots
      .substring(0, 255); // Limit length

    return sanitized || 'unnamed_file';
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpired();
      } catch (error) {
        console.warn('[TempFilesManager] Error during scheduled cleanup:', error);
      }
    }, CONFIG.CLEANUP_INTERVAL_MS);

    // Don't keep the process alive just for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }
}

/**
 * Singleton instance for convenience
 */
export const tempFilesManager = TempFilesManager.getInstance();
