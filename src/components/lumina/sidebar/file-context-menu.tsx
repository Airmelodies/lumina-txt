'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Pencil, Copy, Download, Save, ClipboardCopy, Trash2, XCircle } from 'lucide-react';
import { useLuminaStore } from '@/store/use-lumina-store';
import { saveFileToDisk, saveToDefaultDirectory, copyToClipboard } from '@/lib/file-actions';
import { saveFile } from '@/lib/indexeddb';
import { toast } from 'sonner';

// ─── File Context Menu Component ────────────────────────────
// Custom-built context menu with terminal aesthetic.
// Positioned at cursor, closes on click-outside / Escape / scroll.

export function FileContextMenu() {
  const contextMenu = useLuminaStore((s) => s.contextMenu);
  const files = useLuminaStore((s) => s.files);
  const hideContextMenu = useLuminaStore((s) => s.hideContextMenu);
  const setRenameModalOpen = useLuminaStore((s) => s.setRenameModalOpen);
  const duplicateFile = useLuminaStore((s) => s.duplicateFile);
  const setDeleteModalOpen = useLuminaStore((s) => s.setDeleteModalOpen);
  const closeFile = useLuminaStore((s) => s.closeFile);

  const menuRef = useRef<HTMLDivElement>(null);
  const fileId = contextMenu.fileId;
  const file = fileId ? files.find((f) => f.id === fileId) : null;

  // ── Close on click outside ──
  useEffect(() => {
    if (!contextMenu.visible) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    }

    // Defer listener so the right-click itself doesn't close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu.visible, hideContextMenu]);

  // ── Close on Escape ──
  useEffect(() => {
    if (!contextMenu.visible) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        hideContextMenu();
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [contextMenu.visible, hideContextMenu]);

  // ── Close on scroll ──
  useEffect(() => {
    if (!contextMenu.visible) return;

    function handleScroll() {
      hideContextMenu();
    }

    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [contextMenu.visible, hideContextMenu]);

  // ── Position adjustment: keep menu in viewport ──
  const adjustedPos = useCallback(() => {
    let x = contextMenu.x;
    let y = contextMenu.y;
    const menuW = 180;
    const menuH = 220; // approximate
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;

    if (x + menuW > vw) x = vw - menuW - 8;
    if (y + menuH > vh) y = vh - menuH - 8;
    if (x < 4) x = 4;
    if (y < 4) y = 4;

    return { x, y };
  }, [contextMenu.x, contextMenu.y]);

  // ── Menu item actions ──

  const handleRename = useCallback(() => {
    if (!fileId) return;
    hideContextMenu();
    setRenameModalOpen(true, fileId);
  }, [fileId, hideContextMenu, setRenameModalOpen]);

  const handleDuplicate = useCallback(() => {
    if (!fileId) return;
    hideContextMenu();
    duplicateFile(fileId);
    toast.success('File duplicated');
  }, [fileId, hideContextMenu, duplicateFile]);

  const handleExport = useCallback(async () => {
    if (!file) return;
    hideContextMenu();
    const saved = await saveFileToDisk(file.content, file.name);
    if (saved) toast.success('Exported to disk');
  }, [file, hideContextMenu]);

  const saveDirectoryHandle = useLuminaStore((s) => s.saveDirectoryHandle);
  const saveDirectoryName = useLuminaStore((s) => s.saveDirectoryName);
  const setHasUnsavedChanges = useLuminaStore((s) => s.setHasUnsavedChanges);

  const handleSave = useCallback(async () => {
    if (!file) return;
    hideContextMenu();
    try {
      // Always save to IndexedDB first
      await saveFile(file);
      setHasUnsavedChanges(false);

      // Dual-write: if default save directory is set, also write to disk
      if (saveDirectoryHandle) {
        const diskOk = await saveToDefaultDirectory(saveDirectoryHandle, file.content, file.name);
        if (diskOk) {
          toast.success('File saved', {
            description: `${file.name} → ${saveDirectoryName ?? 'disk'}`,
          });
        } else {
          toast.success('File saved', {
            description: `${file.name} saved to local storage (disk write failed)`,
          });
        }
      } else {
        toast.success('File saved', {
          description: `${file.name} saved to local storage`,
        });
      }
    } catch {
      toast.error('Save failed');
    }
  }, [file, hideContextMenu, saveDirectoryHandle, saveDirectoryName, setHasUnsavedChanges]);

  const handleCopyName = useCallback(async () => {
    if (!file) return;
    hideContextMenu();
    const ok = await copyToClipboard(file.name);
    if (ok) {
      toast.success('Filename copied');
    } else {
      toast.error('Failed to copy');
    }
  }, [file, hideContextMenu]);

  const handleClose = useCallback(() => {
    if (!fileId || !file) return;
    hideContextMenu();
    closeFile(fileId);
    toast.success(`${file.name} closed`, {
      description: 'Removed from workspace',
    });
  }, [fileId, file, hideContextMenu, closeFile]);

  const handleDelete = useCallback(() => {
    if (!fileId) return;
    hideContextMenu();
    setDeleteModalOpen(true, fileId);
  }, [fileId, hideContextMenu, setDeleteModalOpen]);

  if (!contextMenu.visible) return null;

  const pos = adjustedPos();

  return (
    <div
      ref={menuRef}
      className={[
        'fixed z-[1000] w-[180px]',
        'bg-surface-raised border border-border-lit rounded-[3px] py-1',
        'shadow-[0_8px_24px_rgba(0,0,0,0.5)]',
        'animate-fade-in',
      ].join(' ')}
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Rename */}
      <button
        onClick={handleRename}
        className="w-full text-left px-2.5 py-1.5 rounded-[2px] cursor-pointer text-text-base hover:bg-surface-hover hover:text-text-bright transition-colors flex items-center gap-2"
      >
        <Pencil size={11} className="text-text-dim flex-shrink-0" />
        <span className="font-mono text-[10px]">Rename</span>
      </button>

      {/* Duplicate */}
      <button
        onClick={handleDuplicate}
        className="w-full text-left px-2.5 py-1.5 rounded-[2px] cursor-pointer text-text-base hover:bg-surface-hover hover:text-text-bright transition-colors flex items-center gap-2"
      >
        <Copy size={11} className="text-text-dim flex-shrink-0" />
        <span className="font-mono text-[10px]">Duplicate</span>
      </button>

      {/* Separator */}
      <div className="h-px bg-border-dim my-1 mx-2" />

      {/* Save */}
      <button
        onClick={handleSave}
        className="w-full text-left px-2.5 py-1.5 rounded-[2px] cursor-pointer text-text-base hover:bg-surface-hover hover:text-text-bright transition-colors flex items-center gap-2"
      >
        <Save size={11} className="text-accent-dim flex-shrink-0" />
        <span className="font-mono text-[10px]">Save</span>
      </button>

      {/* Export */}
      <button
        onClick={handleExport}
        className="w-full text-left px-2.5 py-1.5 rounded-[2px] cursor-pointer text-text-base hover:bg-surface-hover hover:text-text-bright transition-colors flex items-center gap-2"
      >
        <Download size={11} className="text-text-dim flex-shrink-0" />
        <span className="font-mono text-[10px]">Export</span>
      </button>

      {/* Copy name */}
      <button
        onClick={handleCopyName}
        className="w-full text-left px-2.5 py-1.5 rounded-[2px] cursor-pointer text-text-base hover:bg-surface-hover hover:text-text-bright transition-colors flex items-center gap-2"
      >
        <ClipboardCopy size={11} className="text-text-dim flex-shrink-0" />
        <span className="font-mono text-[10px]">Copy name</span>
      </button>

      {/* Separator */}
      <div className="h-px bg-border-dim my-1 mx-2" />

      {/* Close / Unload from workspace */}
      <button
        onClick={handleClose}
        className="w-full text-left px-2.5 py-1.5 rounded-[2px] cursor-pointer text-text-base hover:bg-surface-hover hover:text-text-bright transition-colors flex items-center gap-2"
      >
        <XCircle size={11} className="text-text-dim flex-shrink-0" />
        <span className="font-mono text-[10px]">Close</span>
      </button>

      {/* Separator */}
      <div className="h-px bg-border-dim my-1 mx-2" />

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full text-left px-2.5 py-1.5 rounded-[2px] cursor-pointer text-status-error hover:bg-status-error/12 transition-colors flex items-center gap-2"
      >
        <Trash2 size={11} className="text-status-error flex-shrink-0" />
        <span className="font-mono text-[10px]">Delete</span>
      </button>
    </div>
  );
}
