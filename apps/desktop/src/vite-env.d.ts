/// <reference types="vite/client" />

import type { AccomplishAPI } from '../preload';

/**
 * Extended window interface for accomplish API with file attachments
 */
declare global {
  interface Window {
    accomplish: AccomplishAPI & {
      /** File attachment APIs */
      pickFiles(): Promise<{
        success: boolean;
        attachments?: Array<{
          type: string;
          data: string;
          fileName?: string;
          mimeType?: string;
          size?: number;
          timestamp?: string;
          label?: string;
          textContent?: string;
        }>;
        error?: string;
        warnings?: string[];
        totalSize?: number;
      }>;
      validateFile(filePath: string): Promise<{ valid: boolean; error?: string }>;
      getAttachmentConfig(): Promise<{
        maxFileSize: number;
        maxTotalSize: number;
        maxOCRFileSize: number;
        enableOCR: boolean;
        supportedTypes: Record<string, string[]>;
      }>;
      processFile(filePath: string): Promise<{
        success: boolean;
        attachments?: Array<{
          type: string;
          data: string;
          fileName?: string;
          mimeType?: string;
          size?: number;
          timestamp?: string;
          label?: string;
          textContent?: string;
        }>;
        error?: string;
        totalSize?: number;
      }>;
      processMultipleFiles(filePaths: string[]): Promise<{
        success: boolean;
        attachments?: Array<{
          type: string;
          data: string;
          fileName?: string;
          mimeType?: string;
          size?: number;
          timestamp?: string;
          label?: string;
          textContent?: string;
        }>;
        error?: string;
        warnings?: string[];
        totalSize?: number;
      }>;
    };
  }
}

export {};
