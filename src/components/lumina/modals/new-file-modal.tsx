'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLuminaStore, TextFile, getFileType } from '@/store/use-lumina-store';
import { saveFile } from '@/lib/indexeddb';
import { toast } from 'sonner';

export function NewFileModal() {
  const { newFileModalOpen, setNewFileModalOpen, addFile } = useLuminaStore();
  const [filename, setFilename] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setNewFileModalOpen(false);
    setFilename('');
  }, [setNewFileModalOpen]);

  const handleCreate = useCallback(() => {
    let name = filename.trim();
    if (!name) {
      toast.error('Filename cannot be empty');
      inputRef.current?.focus();
      return;
    }

    // Auto-append .txt extension if missing
    if (!name.endsWith('.txt')) {
      name = name + '.txt';
    }

    const now = new Date().toISOString();
    const newFile: TextFile = {
      id: crypto.randomUUID(),
      name,
      content: '',
      tags: [],
      summary: null,
      fileType: getFileType(name),
      parentId: null,
      projectIds: [],
      isClosed: false,
      createdAt: now,
      updatedAt: now,
      size: 0,
      lines: 1,
    };

    addFile(newFile);
    saveFile(newFile).catch(() => {
      toast.error('Failed to save file to storage');
    });
    close();
    toast.success('File created');
  }, [filename, addFile, close]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    },
    [close]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleCreate();
    },
    [handleCreate]
  );

  useEffect(() => {
    if (newFileModalOpen) {
      // Defer focus to next frame so the modal is rendered
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [newFileModalOpen, handleKeyDown]);

  if (!newFileModalOpen) return null;

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
            New Text File
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
            placeholder="untitled.txt"
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
            onClick={handleCreate}
            className="px-3 py-1 border border-accent-dim text-accent-primary bg-accent-glow font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-accent-glow-strong hover:border-accent-primary rounded-[2px] transition-colors cursor-pointer"
          >
            Create file
          </button>
        </div>
      </div>
    </div>
  );
}
