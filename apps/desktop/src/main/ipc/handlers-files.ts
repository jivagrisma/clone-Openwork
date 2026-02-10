/**
 * IPC Handlers for File Attachments
 *
 * Handles file selection, validation, and processing for task attachments.
 * Supports multiple file formats including documents, images, spreadsheets,
 * presentations, and more.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { TaskAttachment } from '@accomplish_ai/agent-core';

// Local type definitions for the handlers
type AttachmentType =
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

interface FileAttachmentResult {
  success: boolean;
  attachments?: TaskAttachment[];
  error?: string;
  warnings?: string[];
  totalSize?: number;
}

interface AttachmentConfig {
  maxFileSize: number;
  maxTotalSize: number;
  maxOCRFileSize: number;
  enableOCR: boolean;
  supportedTypes: Record<string, string[]>;
}

/**
 * Default attachment configuration
 */
const DEFAULT_ATTACHMENT_CONFIG: AttachmentConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB per file
  maxTotalSize: 50 * 1024 * 1024, // 50MB total per task
  maxOCRFileSize: 5 * 1024 * 1024, // 5MB for OCR processing
  enableOCR: true,
  supportedTypes: {
    // Images
    image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.heic', '.heif'],

    // Text documents
    text: ['.txt', '.md', '.markdown', '.rst', '.html', '.htm', '.xml', '.csv', '.tsv', '.rtf'],

    // Code files
    code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.dart', '.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.css', '.scss', '.sass', '.less', '.sql', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd'],

    // Documents
    document: ['.pdf', '.doc', '.docx', '.odt', '.epub', '.eml', '.msg'],

    // Spreadsheets
    spreadsheet: ['.xls', '.xlsx', '.ods', '.fods'],

    // Presentations
    presentation: ['.ppt', '.pptx', '.odp', '.fodp'],

    // Audio
    audio: ['.mp3', '.wav', '.wave', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.opus', '.mpga', '.mpeg', '.mp4', '.webm', '.m4v', '.avi', '.mov', '.wmv', '.flv', '.mkv'],

    // Video
    video: ['.mp4', '.webm', '.mpeg', '.mpga', '.m4a', '.avi', '.mov', '.wmv', '.flv', '.mkv'],

    // Ebooks
    ebook: ['.epub', '.mobi', '.azw', '.azw3'],
  },
};

/**
 * File extension to MIME type mapping
 */
const MIME_TYPES: Record<string, string> = {
  // Images
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.heic': 'image/heic',
  '.heif': 'image/heif',

  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.markdown': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.xml': 'text/xml',
  '.csv': 'text/csv',
  '.tsv': 'text/tab-separated-values',
  '.rtf': 'application/rtf',
  '.rst': 'text/x-rst',

  // Code
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.jsx': 'text/javascript',
  '.tsx': 'text/typescript',
  '.py': 'text/x-python',
  '.java': 'text/x-java-source',
  '.c': 'text/x-c',
  '.cpp': 'text/x-c++',
  '.cs': 'text/x-csharp',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.php': 'text/x-php',
  '.rb': 'text/x-ruby',
  '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
  '.scala': 'text/x-scala',
  '.dart': 'text/x-dart',
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.toml': 'application/x-toml',
  '.ini': 'text/x-ini',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.sass': 'text/x-sass',
  '.less': 'text/x-less',
  '.sql': 'text/x-sql',
  '.sh': 'application/x-sh',
  '.bash': 'application/x-sh',
  '.zsh': 'application/x-sh',
  '.fish': 'application/x-fish',
  '.ps1': 'application/x-powershell',
  '.bat': 'application/x-bat',
  '.cmd': 'application/x-cmd',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.epub': 'application/epub+zip',
  '.eml': 'message/rfc822',
  '.msg': 'application/vnd.ms-outlook',

  // Spreadsheets
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.fods': 'application/vnd.oasis.opendocument.spreadsheet-flat-xml',

  // Presentations
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  '.fodp': 'application/vnd.oasis.opendocument.presentation-flat-xml',

  // Audio
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.wave': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.wma': 'audio/x-ms-wma',
  '.opus': 'audio/opus',
  '.mpga': 'audio/mpeg',
  '.mpeg': 'audio/mpeg',

  // Video
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m4v': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.mkv': 'video/x-matroska',

  // Ebooks
  '.mobi': 'application/x-mobipocket-ebook',
  '.azw': 'application/vnd.amazon.ebook',
  '.azw3': 'application/vnd.amazon.ebook',
};

/**
 * Get MIME type for a file extension
 */
function getMimeType(extension: string): string {
  return MIME_TYPES[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Get attachment type for a file extension
 */
function getAttachmentType(extension: string): AttachmentType {
  const ext = extension.toLowerCase();

  for (const [type, extensions] of Object.entries(DEFAULT_ATTACHMENT_CONFIG.supportedTypes)) {
    if (extensions.includes(ext)) {
      return type as AttachmentType;
    }
  }

  return 'document'; // Default fallback
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
}

/**
 * Validate a single file
 */
function validateFile(filePath: string): { valid: boolean; error?: string; size?: number } {
  const extension = path.extname(filePath).toLowerCase();

  // Check if file type is supported
  const allSupportedExtensions = Object.values(DEFAULT_ATTACHMENT_CONFIG.supportedTypes).flat();
  if (!allSupportedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Tipo de archivo no soportado: ${extension}. Por favor usa uno de: ${allSupportedExtensions.slice(0, 10).join(', ')}...`,
    };
  }

  return { valid: true };
}

/**
 * Process a single file into a TaskAttachment
 */
async function processFile(filePath: string): Promise<TaskAttachment> {
  const fileName = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = getMimeType(extension);
  const attachmentType = getAttachmentType(extension);
  const sanitizedFileName = sanitizeFileName(fileName);

  try {
    // Read file
    const fileBuffer = await fs.readFile(filePath);
    const fileSize = fileBuffer.length;

    // Check file size
    if (fileSize > DEFAULT_ATTACHMENT_CONFIG.maxFileSize) {
      throw new Error(`El archivo "${sanitizedFileName}" excede el límite de ${formatFileSize(DEFAULT_ATTACHMENT_CONFIG.maxFileSize)}`);
    }

    // Determine how to encode the file based on type
    let data: string;
    let textContent: string | undefined;

    if (['text', 'code'].includes(attachmentType)) {
      // For text/code files, try to read as UTF-8 text
      try {
        const fileContent = fileBuffer.toString('utf-8');
        data = fileBuffer.toString('base64');
        textContent = fileContent;
      } catch (e) {
        // Fallback to base64 if not valid UTF-8
        data = fileBuffer.toString('base64');
      }
    } else if (attachmentType === 'image') {
      // Images: base64 encode
      data = fileBuffer.toString('base64');
    } else if (attachmentType === 'audio' || attachmentType === 'video') {
      // Audio/Video: base64 encode (note: will use STT for audio)
      data = fileBuffer.toString('base64');
    } else {
      // Documents, spreadsheets, presentations, ebooks: base64 encode
      // The actual text extraction will happen on the renderer or via OpenCode
      data = fileBuffer.toString('base64');
    }

    return {
      type: attachmentType,
      data,
      fileName: sanitizedFileName,
      mimeType,
      size: fileSize,
      timestamp: new Date().toISOString(),
      label: sanitizedFileName,
      textContent,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error al procesar "${sanitizedFileName}": ${error.message}`);
    }
    throw new Error(`Error desconocido al procesar "${sanitizedFileName}"`);
  }
}

/**
 * Process multiple files into TaskAttachments
 */
async function processFiles(filePaths: string[]): Promise<{ attachments: TaskAttachment[]; totalSize: number; warnings: string[] }> {
  const attachments: TaskAttachment[] = [];
  let totalSize = 0;
  const warnings: string[] = [];

  for (const filePath of filePaths) {
    try {
      const attachment = await processFile(filePath);
      totalSize += attachment.size || 0;

      // Check total size limit
      if (totalSize > DEFAULT_ATTACHMENT_CONFIG.maxTotalSize) {
        warnings.push(`El tamaño total de archivos excede ${formatFileSize(DEFAULT_ATTACHMENT_CONFIG.maxTotalSize)}. Algunos archivos no fueron adjuntados.`);
        break;
      }

      attachments.push(attachment);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : String(error));
    }
  }

  return { attachments, totalSize, warnings };
}

/**
 * Register all file-related IPC handlers
 */
export function registerFilesHandlers(): void {
  /**
   * Handler: files:pick-files
   * Opens file dialog and processes selected files
   */
  ipcMain.handle('files:pick-files', async (): Promise<FileAttachmentResult> => {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        return { success: false, error: 'No hay ventana principal disponible' };
      }

      // Build file filters for dialog
      const filters = [
        { name: 'Todos los archivos', extensions: ['*'] },
        {
          name: 'Imágenes',
          extensions: DEFAULT_ATTACHMENT_CONFIG.supportedTypes.image.map((ext: string) => ext.slice(1)),
        },
        {
          name: 'Documentos',
          extensions: [
            ...DEFAULT_ATTACHMENT_CONFIG.supportedTypes.document.map((ext: string) => ext.slice(1)),
            ...DEFAULT_ATTACHMENT_CONFIG.supportedTypes.text.map((ext: string) => ext.slice(1)),
          ],
        },
        {
          name: 'Hojas de cálculo',
          extensions: DEFAULT_ATTACHMENT_CONFIG.supportedTypes.spreadsheet.map((ext: string) => ext.slice(1)),
        },
        {
          name: 'Presentaciones',
          extensions: DEFAULT_ATTACHMENT_CONFIG.supportedTypes.presentation.map((ext: string) => ext.slice(1)),
        },
        {
          name: 'Código',
          extensions: DEFAULT_ATTACHMENT_CONFIG.supportedTypes.code.map((ext: string) => ext.slice(1)),
        },
        {
          name: 'Audio',
          extensions: DEFAULT_ATTACHMENT_CONFIG.supportedTypes.audio.map((ext: string) => ext.slice(1)),
        },
        {
          name: 'Video',
          extensions: DEFAULT_ATTACHMENT_CONFIG.supportedTypes.video.map((ext: string) => ext.slice(1)),
        },
      ];

      const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Seleccionar archivos para adjuntar',
        filters,
        properties: ['openFile', 'multiSelections'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: true, attachments: [] };
      }

      // Validate files
      const validationErrors: string[] = [];
      for (const filePath of result.filePaths) {
        const validation = validateFile(filePath);
        if (!validation.valid) {
          validationErrors.push(validation.error || `Archivo inválido: ${filePath}`);
        }
      }

      if (validationErrors.length > 0) {
        return {
          success: false,
          error: validationErrors.join('; '),
        };
      }

      // Process files
      const { attachments, totalSize, warnings } = await processFiles(result.filePaths);

      return {
        success: true,
        attachments,
        totalSize,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al seleccionar archivos',
      };
    }
  });

  /**
   * Handler: files:validate-file
   * Validates a file before selection
   */
  ipcMain.handle('files:validate-file', async (_event, filePath: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const validation = validateFile(filePath);
      return validation;
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Error de validación',
      };
    }
  });

  /**
   * Handler: files:get-config
   * Returns the attachment configuration
   */
  ipcMain.handle('files:get-config', async (): Promise<AttachmentConfig> => {
    return DEFAULT_ATTACHMENT_CONFIG;
  });

  /**
   * Handler: files:process-file
   * Processes a single file (for drag & drop or custom selection)
   */
  ipcMain.handle('files:process-file', async (_event, filePath: string): Promise<FileAttachmentResult> => {
    try {
      const validation = validateFile(filePath);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const attachment = await processFile(filePath);
      return {
        success: true,
        attachments: [attachment],
        totalSize: attachment.size || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al procesar archivo',
      };
    }
  });

  /**
   * Handler: files:process-multiple
   * Processes multiple files from paths (for drag & drop)
   */
  ipcMain.handle('files:process-multiple', async (_event, filePaths: string[]): Promise<FileAttachmentResult> => {
    try {
      const { attachments, totalSize, warnings } = await processFiles(filePaths);
      return {
        success: true,
        attachments,
        totalSize,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al procesar archivos',
      };
    }
  });
}
