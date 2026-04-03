'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLuminaStore } from '@/store/use-lumina-store';
import { saveFile } from '@/lib/indexeddb';
import { toast } from 'sonner';

// ─── Rename Modal Component ─────────────────────────────────
// Same structural pattern as NewFileModal: backdrop → modal → titlebar → body → footer.
// Receives `fileId` prop; parent should pass `key={fileId}` to reset on each open.

interface RenameModalProps {
  fileId: string | null;
}

export function RenameModal({ fileId }: RenameModalProps) {
  const renameModalOpen = useLuminaStore((s) => s.renameModalOpen);
  const setRenameModalOpen = useLuminaStore((s) => s.setRenameModalOpen);
  const files = useLuminaStore((s) => s.files);
  const updateFile = useLuminaStore((s) => s.updateFile);

  const currentFile = fileId
    ? files.find((f) => f.id === fileId) ?? null
    : null;

  // Initialize filename from current file (resets when key changes / remounts)
  const [filename, setFilename] = useState(currentFile?.name ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setRenameModalOpen(false);
  }, [setRenameModalOpen]);

  const handleRename = useCallback(() => {
    const name = filename.trim();
    if (!name) {
      toast.error('Filename cannot be empty');
      inputRef.current?.focus();
      return;
    }

    if (!fileId || !currentFile) return;

    // Don't do anything if name is unchanged
    if (name === currentFile.name) {
      close();
      return;
    }

    const updated = { ...currentFile, name };
    updateFile(fileId, { name });
    saveFile(updated).catch(() => {
      toast.error('Failed to save renamed file');
    });

    close();
    toast.success('File renamed');
  }, [filename, fileId, currentFile, updateFile, close]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    },
    [close]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleRename();
    },
    [handleRename]
  );

  useEffect(() => {
    if (renameModalOpen) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [renameModalOpen, handleKeyDown]);

  if (!renameModalOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/72 backdrop-blur-[2px] z-[999]"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-[340px] bg-surface-raised border border-border-lit overflow-hidden rounded-[3px] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titlebar */}
        <div className="bg-surface-panel border-b border-border-base px-3.5 py-2.5 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.10em] uppercase text-text-base">
            Rename File
          </span>
          <button
            onClick={close}
            className="bg-none border-none text-text-dim font-mono text-xs cursor-pointer hover:text-text-bright transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-3.5 py-4">
          <label className="font-mono text-[9px] tracking-[0.10em] uppercase text-text-mute mb-1 block">
            Filename
          </label>
          <input
            ref={inputRef}
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={currentFile?.name ?? 'untitled.txt'}
            className="w-full px-2 py-1.5 border border-border-base bg-surface-surface text-text-bright font-mono text-[11px] outline-none placeholder:text-text-mute focus:border-border-lit rounded-[2px] transition-colors"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-1.5 px-3.5 py-2.5 border-t border-border-base bg-surface-panel">
          <button
            onClick={close}
            className="px-3 py-1 border border-border-base bg-transparent text-text-dim font-mono text-[10px] tracking-[0.06em] uppercase hover:border-border-lit hover:text-text-base rounded-[2px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleRename}
            className="px-3 py-1 border border-accent-dim text-accent-primary bg-accent-glow font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-accent-glow-strong hover:border-accent-primary rounded-[2px] transition-colors cursor-pointer"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}
