'use client';

import { TextFile } from '@/store/use-lumina-store';
import { useLuminaStore } from '@/store/use-lumina-store';
import { Trash2 } from 'lucide-react';

// ─── Relative Time Utility ──────────────────────────────────

function relativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// ─── Byte Size Formatter ────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── File Item Component ────────────────────────────────────

interface FileItemProps {
  file: TextFile;
  isActive: boolean;
  onClick: () => void;
}

export function FileItem({ file, isActive, onClick }: FileItemProps) {
  const setActiveFile = useLuminaStore((s) => s.setActiveFile);
  const showContextMenu = useLuminaStore((s) => s.showContextMenu);
  const setDeleteModalOpen = useLuminaStore((s) => s.setDeleteModalOpen);

  const meta = `${relativeTime(file.updatedAt)} · ${formatSize(file.size)}`;
  const tag = file.tags.length > 0 ? file.tags[0] : null;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveFile(file.id);
    showContextMenu(file.id, e.clientX, e.clientY);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModalOpen(true, file.id);
  };

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        onContextMenu={handleContextMenu}
        className={[
          'w-full text-left px-3 py-2 cursor-pointer',
          'border-l-2 border-transparent',
          'transition-colors duration-100',
          'hover:bg-surface-raised',
          isActive && 'bg-surface-raised border-l-accent-primary',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* File name */}
        <div
          className={[
            'font-mono text-[10px] truncate max-w-[140px]',
            isActive ? 'text-text-bright' : 'text-text-base',
          ].join(' ')}
        >
          {file.name}
        </div>

        {/* Meta row: time + size + optional tag */}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-[9px] text-text-mute">
            {meta}
          </span>
          {tag && (
            <span className="file-chip">
              {tag}
            </span>
          )}
        </div>
      </button>

      {/* Hover-visible delete button */}
      <button
        onClick={handleDeleteClick}
        title="Delete file"
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded-[2px] text-text-dim hover:text-status-error cursor-pointer"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
