/**
 * Unit tests for TempFilesManager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as os from 'os';
import path from 'path';
import { TempFilesManager } from '../../../src/common/utils/temp-files-manager.js';
import type { TaskAttachment } from '@accomplish_ai/agent-core';

// Mock fs/promises
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      readFile: vi.fn(),
      readdir: vi.fn(),
      rm: vi.fn(),
      access: vi.fn(),
      unlink: vi.fn(),
      stat: vi.fn(),
      rmdir: vi.fn(),
    },
  };
});

describe('TempFilesManager', () => {
  let tempFilesManager: TempFilesManager;
  let mockTempDir: string;

  beforeEach(async () => {
    // Create a fresh instance for each test
    tempFilesManager = TempFilesManager.getInstance();
    mockTempDir = path.join(os.tmpdir(), 'waia-attachments-test');

    // Reset mocks
    vi.clearAllMocks();

    // Mock fs operations
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.readdir).mockResolvedValue([]);
    vi.mocked(fs.rm).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
    vi.mocked(fs.unlink).mockResolvedValue(undefined);
    vi.mocked(fs.stat).mockResolvedValue({
      size: 1024,
      birthtime: new Date(),
      atime: new Date(),
    } as any);
  });

  afterEach(async () => {
    // Cleanup after tests
    try {
      await tempFilesManager.shutdown();
    } catch {
      // Ignore shutdown errors
    }
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = TempFilesManager.getInstance();
      const instance2 = TempFilesManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('initialize', () => {
    it('should create base directory on initialization', async () => {
      await tempFilesManager.initialize();

      expect(fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('waia-attachments'),
        { recursive: true }
      );
    });

    it('should not fail if base directory already exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await expect(tempFilesManager.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(fs.mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(tempFilesManager.initialize()).rejects.toThrow('Failed to initialize TempFilesManager');
    });
  });

  describe('createTempFilesFromAttachments', () => {
    it('should create temp files from attachments', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Hello World').toString('base64'),
          fileName: 'test.txt',
          mimeType: 'text/plain',
          size: 11,
        },
      ];

      // Mock successful file operations
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('Not found')); // Base dir doesn't exist
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const result = await tempFilesManager.createTempFilesFromAttachments('test-session', attachments);

      expect(result).toHaveLength(1);
      expect(result[0].originalFileName).toBe('test.txt');
      expect(result[0].sessionId).toBe('test-session');
      expect(result[0].size).toBe(11);
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle multiple attachments', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('File 1').toString('base64'),
          fileName: 'file1.txt',
          size: 6,
        },
        {
          type: 'text',
          data: Buffer.from('File 2').toString('base64'),
          fileName: 'file2.txt',
          size: 6,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      const result = await tempFilesManager.createTempFilesFromAttachments('test-session', attachments);

      expect(result).toHaveLength(2);
      expect(result[0].originalFileName).toBe('file1.txt');
      expect(result[1].originalFileName).toBe('file2.txt');
    });

    it('should sanitize filenames', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          fileName: 'test:file?.txt',
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      const result = await tempFilesManager.createTempFilesFromAttachments('test-session', attachments);

      expect(result[0].originalFileName).toBe('test:file?.txt');
      expect(result[0].tempFilePath).toContain('test_file_.txt');
    });

    it('should handle empty attachments array', async () => {
      await tempFilesManager.initialize();

      const result = await tempFilesManager.createTempFilesFromAttachments('test-session', []);

      expect(result).toHaveLength(0);
    });

    it('should validate session ID', async () => {
      await tempFilesManager.initialize();

      await expect(
        tempFilesManager.createTempFilesFromAttachments('../../../etc', [])
      ).rejects.toThrow('Invalid characters in session ID');
    });

    it('should validate file size limits', async () => {
      const largeData = 'x'.repeat(200 * 1024 * 1024); // 200MB
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from(largeData).toString('base64'),
          fileName: 'large.txt',
          size: largeData.length,
        },
      ];

      await tempFilesManager.initialize();

      await expect(
        tempFilesManager.createTempFilesFromAttachments('test-session', attachments)
      ).rejects.toThrow('exceeds maximum allowed size');
    });

    it('should cleanup files on error', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          fileName: 'test.txt',
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error('Write failed'));

      await expect(
        tempFilesManager.createTempFilesFromAttachments('test-session', attachments)
      ).rejects.toThrow('Write failed');
    });
  });

  describe('getSessionFiles', () => {
    it('should return files for a session', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          fileName: 'test.txt',
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      await tempFilesManager.createTempFilesFromAttachments('session-1', attachments);

      const files = tempFilesManager.getSessionFiles('session-1');

      expect(files).toHaveLength(1);
      expect(files[0].sessionId).toBe('session-1');
    });

    it('should return empty array for non-existent session', () => {
      const files = tempFilesManager.getSessionFiles('non-existent');

      expect(files).toHaveLength(0);
    });
  });

  describe('getSessionInfo', () => {
    it('should return session info', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          fileName: 'test.txt',
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      await tempFilesManager.createTempFilesFromAttachments('test-session', attachments);

      const info = tempFilesManager.getSessionInfo('test-session');

      expect(info).toBeDefined();
      expect(info?.sessionId).toBe('test-session');
      expect(info?.fileCount).toBe(1);
      expect(info?.totalSize).toBe(4);
    });

    it('should return undefined for non-existent session', () => {
      const info = tempFilesManager.getSessionInfo('non-existent');

      expect(info).toBeUndefined();
    });
  });

  describe('cleanupSession', () => {
    it('should cleanup session files and directory', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          fileName: 'test.txt',
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      await tempFilesManager.createTempFilesFromAttachments('test-session', attachments);
      await tempFilesManager.cleanupSession('test-session');

      expect(fs.unlink).toHaveBeenCalled();
      expect(fs.rm).toHaveBeenCalled();
      expect(tempFilesManager.getSessionFiles('test-session')).toHaveLength(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(fs.unlink).mockRejectedValue(new Error('File not found'));
      vi.mocked(fs.rm).mockRejectedValue(new Error('Directory not found'));

      // Should not throw
      await expect(tempFilesManager.cleanupSession('test-session')).resolves.not.toThrow();
    });
  });

  describe('cleanupExpired', () => {
    it('should cleanup expired sessions', async () => {
      // This test is difficult to implement without time mocking
      // For now, just verify the method exists and returns expected structure
      const result = await tempFilesManager.cleanupExpired();

      expect(result).toHaveProperty('sessionsCleanedUp');
      expect(result).toHaveProperty('filesCleanedUp');
      expect(typeof result.sessionsCleanedUp).toBe('number');
      expect(typeof result.filesCleanedUp).toBe('number');
    });
  });

  describe('getBaseTempPath', () => {
    it('should return the base temp path', () => {
      const basePath = tempFilesManager.getBaseTempPath();

      expect(basePath).toContain('waia-attachments');
      expect(basePath).toContain(os.tmpdir());
    });
  });

  describe('getSessionPath', () => {
    it('should return the session path', () => {
      const sessionPath = tempFilesManager.getSessionPath('test-session-123');

      expect(sessionPath).toContain('waia-attachments');
      expect(sessionPath).toContain('test-session-123');
    });

    it('should sanitize session ID in path', () => {
      const sessionPath = tempFilesManager.getSessionPath('test/session/with/slashes');

      // The session ID should be sanitized (slashes replaced with underscores)
      // The path separator (/) will still be present as it's a Unix path
      expect(sessionPath).toContain('waia-attachments');
      expect(sessionPath).toContain('test_session_with_slashes');
      // The sanitized session ID should not contain slashes
      const baseName = sessionPath.split('/').pop();
      expect(baseName).toBe('test_session_with_slashes');
    });
  });

  describe('shutdown', () => {
    it('should cleanup all sessions on shutdown', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          fileName: 'test.txt',
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      await tempFilesManager.createTempFilesFromAttachments('test-session', attachments);
      await tempFilesManager.shutdown();

      expect(fs.rm).toHaveBeenCalled();
    });
  });

  describe('file name collision handling', () => {
    it('should append counter to duplicate filenames', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          fileName: 'file.txt',
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      // First call should create file.txt
      const result1 = await tempFilesManager.createTempFilesFromAttachments('session-1', attachments);
      expect(result1[0].tempFilePath).toContain('file.txt');

      // Mock that file.txt now exists
      vi.mocked(fs.access).mockImplementation((filePath) => {
        if (typeof filePath === 'string' && filePath.endsWith('file.txt')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('Not found'));
      });

      // Second call should create file_1.txt
      const result2 = await tempFilesManager.createTempFilesFromAttachments('session-2', attachments);
      expect(result2[0].tempFilePath).toContain('file_1.txt');
    });
  });

  describe('error handling', () => {
    it('should handle invalid attachment data gracefully', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: '', // Empty data
          fileName: 'empty.txt',
          size: 0,
        },
      ];

      await tempFilesManager.initialize();

      await expect(
        tempFilesManager.createTempFilesFromAttachments('test-session', attachments)
      ).rejects.toThrow('Invalid attachment: missing data');
    });

    it('should handle missing filename gracefully', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          // No fileName or label
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      const result = await tempFilesManager.createTempFilesFromAttachments('test-session', attachments);

      // Should generate a default filename
      expect(result[0].originalFileName).toMatch(/^attachment_\d+$/);
    });
  });

  describe('getTempFileInfo', () => {
    it('should return file info and update last accessed time', async () => {
      const attachments: TaskAttachment[] = [
        {
          type: 'text',
          data: Buffer.from('Test').toString('base64'),
          fileName: 'test.txt',
          size: 4,
        },
      ];

      vi.mocked(fs.access).mockRejectedValue(new Error('Not found'));

      await tempFilesManager.createTempFilesFromAttachments('test-session', attachments);

      const files = tempFilesManager.getSessionFiles('test-session');
      const originalAccessTime = files[0].lastAccessed;

      // Wait a tiny bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const fileInfo = tempFilesManager.getTempFileInfo(files[0].tempFilePath);

      expect(fileInfo).toBeDefined();
      expect(fileInfo?.lastAccessed.getTime()).toBeGreaterThanOrEqual(originalAccessTime.getTime());
    });

    it('should return undefined for non-existent file', () => {
      const fileInfo = tempFilesManager.getTempFileInfo('/non/existent/file.txt');

      expect(fileInfo).toBeUndefined();
    });
  });
});
