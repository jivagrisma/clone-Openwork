/**
 * AttachmentsList Component
 *
 * Displays a list of file attachments with icons, file info, and remove buttons.
 * Supports multiple file types: images, documents, spreadsheets, presentations, audio, video, code, and text.
 */

'use client';

import React from 'react';
import {
  X,
  FileText,
  Image,
  Code,
  FileJson,
  File,
  FileSpreadsheet,
  Presentation,
  Music,
  Video,
  Book,
  Mail,
  FileWarning,
} from 'lucide-react';
import type { TaskAttachment } from '@accomplish_ai/agent-core';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';

interface AttachmentsListProps {
  attachments: TaskAttachment[];
  onRemove: (index: number) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Get the appropriate icon for a file type
 */
const getFileIcon = (type: TaskAttachment['type'], className = 'h-4 w-4'): React.ReactElement => {
  const iconClassName = className;

  switch (type) {
    case 'image':
      return <Image className={iconClassName} />;
    case 'text':
      return <FileText className={iconClassName} />;
    case 'code':
      return <Code className={iconClassName} />;
    case 'json':
      return <FileJson className={iconClassName} />;
    case 'spreadsheet':
      return <FileSpreadsheet className={iconClassName} />;
    case 'presentation':
      return <Presentation className={iconClassName} />;
    case 'audio':
      return <Music className={iconClassName} />;
    case 'video':
      return <Video className={iconClassName} />;
    case 'ebook':
      return <Book className={iconClassName} />;
    case 'email':
      return <Mail className={iconClassName} />;
    case 'screenshot':
      return <Image className={iconClassName} />;
    default:
      return <File className={iconClassName} />;
  }
};

/**
 * Get file type display name in Spanish
 */
const getFileTypeName = (type: TaskAttachment['type']): string => {
  const typeNames: Record<TaskAttachment['type'], string> = {
    image: 'Imagen',
    text: 'Texto',
    code: 'Código',
    json: 'JSON',
    document: 'Documento',
    spreadsheet: 'Hoja de cálculo',
    presentation: 'Presentación',
    audio: 'Audio',
    video: 'Video',
    ebook: 'Libro electrónico',
    email: 'Correo',
    screenshot: 'Captura',
  };

  return typeNames[type] || type;
};

/**
 * Get badge color variant based on file type
 */
const getBadgeVariant = (type: TaskAttachment['type']): 'default' | 'secondary' | 'outline' | 'destructive' => {
  const colorMap: Partial<Record<TaskAttachment['type'], 'default' | 'secondary' | 'outline' | 'destructive'>> = {
    image: 'default',
    text: 'secondary',
    code: 'outline',
    json: 'outline',
    document: 'secondary',
    spreadsheet: 'default',
    presentation: 'default',
    audio: 'secondary',
    video: 'secondary',
    ebook: 'outline',
    email: 'outline',
    screenshot: 'default',
  };

  return colorMap[type] || 'secondary';
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Get file extension from filename or MIME type
 */
const getFileExtension = (attachment: TaskAttachment): string => {
  if (attachment.fileName) {
    const ext = attachment.fileName.split('.').pop();
    if (ext) return ext.toUpperCase();
  }

  // Fallback to MIME type
  if (attachment.mimeType) {
    const mimeToExt: Record<string, string> = {
      'application/pdf': 'PDF',
      'application/msword': 'DOC',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.ms-powerpoint': 'PPT',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'application/zip': 'ZIP',
    };

    return mimeToExt[attachment.mimeType] || attachment.mimeType.split('/')[1]?.toUpperCase() || 'FILE';
  }

  return 'FILE';
};

export const AttachmentsList: React.FC<AttachmentsListProps> = ({
  attachments,
  onRemove,
  className = '',
  disabled = false,
}) => {
  const { t } = useTranslation();

  if (attachments.length === 0) {
    return null;
  }

  // Calculate total size
  const totalSize = attachments.reduce((sum, att) => sum + (att.size || 0), 0);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header with count and total size */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {attachments.length} {attachments.length === 1 ? 'archivo adjuntado' : 'archivos adjuntados'}
        </span>
        <span className="text-muted-foreground text-xs">
          {formatFileSize(totalSize)}
        </span>
      </div>

      {/* Attachment items */}
      <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
        {attachments.map((attachment, index) => {
          const fileName = attachment.fileName || attachment.label || `Archivo ${index + 1}`;
          const fileSize = attachment.size ? formatFileSize(attachment.size) : '';
          const fileExtension = getFileExtension(attachment);
          const fileTypeName = getFileTypeName(attachment.type);
          const badgeVariant = getBadgeVariant(attachment.type);

          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              {/* File type icon */}
              <div className="flex-shrink-0 text-muted-foreground">
                {getFileIcon(attachment.type)}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" title={fileName}>
                    {fileName}
                  </span>
                  {fileSize && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ({fileSize})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {/* File type badge */}
                  <Badge variant={badgeVariant} className="text-xs px-1.5 py-0">
                    {fileTypeName}
                  </Badge>

                  {/* File extension badge */}
                  {fileExtension && (
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0 rounded">
                      {fileExtension}
                    </span>
                  )}

                  {/* Page count for documents */}
                  {attachment.pageCount && attachment.pageCount > 1 && (
                    <span className="text-xs text-muted-foreground">
                      {attachment.pageCount} páginas
                    </span>
                  )}
                </div>

                {/* Language for text files */}
                {attachment.language && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Idioma detectado: {attachment.language}
                  </div>
                )}
              </div>

              {/* Remove button */}
              {!disabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="flex-shrink-0 h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  title='Eliminar archivo'
                >
                  <X className="h-4 w-4" />
                </Button>
              )}

              {/* Disabled indicator */}
              {disabled && (
                <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center text-muted-foreground/30">
                  <FileWarning className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Warnings section */}
      {attachments.some((att) => !att.size) && (
        <div className="text-xs text-muted-foreground">
          ⓘ Algunos archivos no tienen información de tamaño
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for inline display (e.g., in a message bubble)
 */
interface AttachmentChipProps {
  attachment: TaskAttachment;
  onRemove?: () => void;
  disabled?: boolean;
}

export const AttachmentChip: React.FC<AttachmentChipProps> = ({
  attachment,
  onRemove,
  disabled = false,
}) => {
  const fileName = attachment.fileName || attachment.label || 'Archivo';
  const fileTypeName = getFileTypeName(attachment.type);
  const badgeVariant = getBadgeVariant(attachment.type);

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-sm">
      <span className="text-muted-foreground">{getFileIcon(attachment.type, 'h-3.5 w-3.5')}</span>
      <span className="max-w-[150px] truncate" title={fileName}>
        {fileName}
      </span>
      <Badge variant={badgeVariant} className="text-xs px-1 py-0 h-4">
        {fileTypeName}
      </Badge>
      {!disabled && onRemove && (
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive ml-1"
          title="Eliminar"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

/**
 * Attachment preview component for images
 */
interface AttachmentPreviewProps {
  attachment: TaskAttachment;
  onRemove?: () => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachment,
  onRemove,
}) => {
  const isImage = attachment.type === 'image' || attachment.type === 'screenshot';

  if (!isImage || !attachment.data) {
    return null;
  }

  return (
    <div className="relative inline-block group">
      <img
        src={`data:${attachment.mimeType || 'image/png'};base64,${attachment.data}`}
        alt={attachment.fileName || attachment.label || 'Imagen adjunta'}
        className="max-w-[200px] max-h-[200px] rounded-lg border object-cover"
      />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          title="Eliminar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {attachment.fileName && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 rounded-b-lg truncate px-2">
          {attachment.fileName}
        </div>
      )}
    </div>
  );
};
