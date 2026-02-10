// apps/desktop/src/renderer/components/landing/PlusMenu/index.tsx

'use client';

import { useState, useEffect } from 'react';
import { Plus, Paperclip, Loader2 } from 'lucide-react';
import type { Skill, TaskAttachment } from '@accomplish_ai/agent-core/common';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SkillsSubmenu } from './SkillsSubmenu';
import { CreateSkillModal } from '@/components/skills/CreateSkillModal';

interface PlusMenuProps {
  onSkillSelect: (command: string) => void;
  onOpenSettings: (tab: 'skills') => void;
  disabled?: boolean;
  /** Callback when attachments change */
  onAttachmentsChange?: (attachments: TaskAttachment[]) => void;
  /** Current attachments (for counter badge) */
  attachments?: TaskAttachment[];
}

export function PlusMenu({
  onSkillSelect,
  onOpenSettings,
  disabled,
  onAttachmentsChange,
  attachments = [],
}: PlusMenuProps) {
  const [open, setOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);

  // Fetch enabled skills when dropdown opens (filter out hidden skills for UI)
  useEffect(() => {
    if (open && window.accomplish) {
      window.accomplish
        .getEnabledSkills()
        .then((skills: Skill[]) => setSkills(skills.filter((s) => !s.isHidden)))
        .catch((err: Error) => console.error('Failed to load skills:', err));
    }
  }, [open]);

  const handleRefresh = async () => {
    const accomplish = window.accomplish;
    if (!accomplish || isRefreshing) return;
    setIsRefreshing(true);
    try {
      // Run resync and minimum delay in parallel so animation is visible
      const [, updatedSkills] = await Promise.all([
        new Promise((resolve) => setTimeout(resolve, 600)),
        accomplish.resyncSkills().then(() => accomplish.getEnabledSkills()),
      ]);
      // Filter out hidden skills for UI display
      setSkills(updatedSkills.filter((s: Skill) => !s.isHidden));
    } catch (err) {
      console.error('Failed to refresh skills:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSkillSelect = (command: string) => {
    onSkillSelect(command);
    setOpen(false);
  };

  const handleManageSkills = () => {
    setOpen(false);
    onOpenSettings('skills');
  };

  const handleCreateNewSkill = () => {
    setOpen(false);
    setCreateModalOpen(true);
  };

  /**
   * Handle file attachment
   * Opens file dialog and processes selected files
   */
  const handleAttachFiles = async () => {
    if (isAttaching || !window.accomplish) return;

    setIsAttaching(true);
    try {
      const result = await window.accomplish.pickFiles();

      if (result.success && result.attachments && result.attachments.length > 0) {
        // Notify parent component about new attachments
        onAttachmentsChange?.([...attachments, ...result.attachments]);

        // Show warnings in console if any
        if (result.warnings && result.warnings.length > 0) {
          console.warn('File attachment warnings:', result.warnings);
        }

        // Close menu after attachment
        setOpen(false);
      } else if (result.error) {
        console.error('File attachment error:', result.error);
      }
    } catch (error) {
      console.error('Error attaching files:', error);
    } finally {
      setIsAttaching(false);
    }
  };

  return (
    <>
      <CreateSkillModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            disabled={disabled}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            title="Agregar contenido"
          >
            <Plus className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {/* Attach Files - NOW ENABLED */}
          <DropdownMenuItem
            onClick={handleAttachFiles}
            disabled={isAttaching || disabled}
            className="cursor-pointer"
          >
            {isAttaching ? (
              <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />
            ) : (
              <Paperclip className="h-4 w-4 mr-2 shrink-0" />
            )}
            <span>Adjuntar Archivos</span>
            {attachments.length > 0 && (
              <span className="ml-auto pl-4 text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {attachments.length}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Skills Submenu */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <svg
                className="h-4 w-4 mr-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Usar Skills
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-[280px] p-0">
              <SkillsSubmenu
                skills={skills}
                onSkillSelect={handleSkillSelect}
                onManageSkills={handleManageSkills}
                onCreateNewSkill={handleCreateNewSkill}
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
