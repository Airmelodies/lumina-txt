'use client';

import { useEffect, useCallback } from 'react';
import { useLuminaStore } from '@/store/use-lumina-store';
import { deleteFile as deleteFileFromDB } from '@/lib/indexeddb';
import { toast } from 'sonner';

export function DeleteConfirmModal() {
  const {
    deleteModalOpen,
    fileToDelete,
    files,
    setDeleteModalOpen,
    removeFile,
  } = useLuminaStore();

  const fileToDisplay = files.find((f) => f.id === fileToDelete);
  const displayName = fileToDisplay?.name ?? 'this file';

  const close = useCallback(() => {
    setDeleteModalOpen(false);
  }, [setDeleteModalOpen]);

  const handleDelete = useCallback(async () => {
    if (!fileToDelete) return;

    removeFile(fileToDelete);
    deleteFileFromDB(fileToDelete).catch(() => {
      toast.error('Failed to delete file from storage');
    });
    close();
    toast.success('File deleted');
  }, [fileToDelete, removeFile, close]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    },
    [close]
  );

  useEffect(() => {
    if (deleteModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteModalOpen, handleKeyDown]);

  if (!deleteModalOpen) return null;

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
            Delete File
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
          <p className="font-mono text-[11px] text-text-mid leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="text-text-bright font-medium">{displayName}</span>?
          </p>
          <p className="font-mono text-[10px] text-text-mute mt-2">
            This action cannot be undone.
          </p>
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
            onClick={handleDelete}
            className="px-3 py-1 border border-status-error/30 text-status-error bg-status-error/12 font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-status-error/20 rounded-[2px] transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
