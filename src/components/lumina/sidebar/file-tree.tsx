'use client';

import { useCallback } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { useLuminaStore, TextFile, FolderNode, FileType } from '@/store/use-lumina-store';

// ─── File Type Indicators ───────────────────────────────────

const FILE_INDICATORS: Record<FileType, { char: string; color: string }> = {
  txt:  { char: 'T', color: 'text-text-dim' },
  md:   { char: 'M', color: 'text-accent-dim' },
  json: { char: 'J', color: 'text-[#f5a623]' },
  html: { char: 'H', color: 'text-[#e06060]' },
  css:  { char: 'C', color: 'text-[#60a0e0]' },
};

// ─── File Indicator Badge ───────────────────────────────────

function FileIndicator({ type }: { type: FileType }) {
  const indicator = FILE_INDICATORS[type] ?? FILE_INDICATORS.txt;
  return (
    <span
      className={[
        'inline-flex items-center justify-center',
        'w-4 h-4 shrink-0',
        'font-mono text-[9px]',
        indicator.color,
      ].join(' ')}
    >
      {indicator.char}
    </span>
  );
}

// ─── Tag Chip ───────────────────────────────────────────────

function TagChip({ tag }: { tag: string }) {
  return (
    <span className="file-chip shrink-0">{tag}</span>
  );
}

// ─── File Node Row ──────────────────────────────────────────

interface FileNodeRowProps {
  file: TextFile;
  depth: number;
  isActive: boolean;
}

function FileNodeRow({ file, depth, isActive }: FileNodeRowProps) {
  const setActiveFile = useLuminaStore((s) => s.setActiveFile);
  const showContextMenu = useLuminaStore((s) => s.showContextMenu);

  const handleClick = useCallback(() => {
    setActiveFile(file.id);
  }, [setActiveFile, file.id]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      showContextMenu(file.id, e.clientX, e.clientY);
      e.preventDefault();
    },
    [showContextMenu, file.id]
  );

  return (
    <div
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      className={[
        'flex items-center gap-1.5 px-2 py-1.5 cursor-pointer',
        'transition-colors duration-100 group',
        isActive ? 'bg-surface-raised' : 'hover:bg-surface-hover',
      ].join(' ')}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
    >
      <FileIndicator type={file.fileType} />
      <span
        className={[
          'font-mono text-[10px] truncate max-w-[120px]',
          isActive ? 'text-text-bright' : 'text-text-base',
        ].join(' ')}
      >
        {file.name}
      </span>
      {file.tags.length > 0 && (
        <TagChip tag={file.tags[0]} />
      )}
    </div>
  );
}

// ─── Folder Node ────────────────────────────────────────────

interface FolderNodeComponentProps {
  folder: FolderNode;
  depth: number;
  folders: FolderNode[];
  files: TextFile[];
  activeFileId: string | null;
}

function FolderNodeComponent({
  folder,
  depth,
  folders,
  files,
  activeFileId,
}: FolderNodeComponentProps) {
  const toggleFolder = useLuminaStore((s) => s.toggleFolder);
  const showContextMenu = useLuminaStore((s) => s.showContextMenu);

  // Get child folders
  const childFolders = folders.filter((f) => f.parentId === folder.id);
  // Get child files
  const childFiles = files.filter((f) => f.parentId === folder.id);

  const handleToggle = useCallback(() => {
    toggleFolder(folder.id);
  }, [toggleFolder, folder.id]);

  return (
    <div>
      {/* Folder header row */}
      <div
        onClick={handleToggle}
        className={[
          'flex items-center gap-1.5 px-2 py-1 cursor-pointer',
          'transition-colors duration-100',
          'hover:bg-surface-hover',
        ].join(' ')}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {folder.isExpanded ? (
          <ChevronDown size={10} className="shrink-0 text-text-mute" />
        ) : (
          <ChevronRight size={10} className="shrink-0 text-text-mute" />
        )}
        <span className="font-mono text-[10px] text-text-mid truncate">
          {folder.name}
        </span>
        {folder.children.length > 0 && (
          <span className="font-mono text-[8px] text-text-mute ml-auto shrink-0">
            {folder.children.length}
          </span>
        )}
      </div>

      {/* Expanded children */}
      {folder.isExpanded && (
        <div>
          {/* Render child folders first, then files */}
          {childFolders.map((childFolder) => (
            <FolderNodeComponent
              key={childFolder.id}
              folder={childFolder}
              depth={depth + 1}
              folders={folders}
              files={files}
              activeFileId={activeFileId}
            />
          ))}
          {childFiles.map((file) => (
            <FileNodeRow
              key={file.id}
              file={file}
              depth={depth + 1}
              isActive={file.id === activeFileId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main File Tree Component ───────────────────────────────

export function FileTree() {
  const folders = useLuminaStore((s) => s.folders);
  const files = useLuminaStore((s) => s.files);
  const activeFileId = useLuminaStore((s) => s.activeFileId);
  const rootFolderName = useLuminaStore((s) => s.rootFolderName);

  // Root-level folders (parentId === null)
  const rootFolders = folders.filter((f) => f.parentId === null);
  // Root-level files (parentId === null and have folder association)
  const rootFiles = files.filter((f) => f.parentId === null && folders.length > 0);

  // If no folder is loaded, show empty state
  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4">
        <span className="font-mono text-[9px] text-text-mute mb-3">
          No folder loaded
        </span>
        <button
          onClick={() => {
            // Dispatch a custom event that sidebar can listen to
            window.dispatchEvent(new CustomEvent('lumina:choose-folder'));
          }}
          className={[
            'px-3 py-1.5 rounded-[2px] cursor-pointer',
            'font-mono text-[9px] text-text-dim',
            'border border-dashed border-border-base',
            'hover:text-text-mid hover:border-border-lit',
            'transition-colors duration-100',
          ].join(' ')}
        >
          Choose folder to load tree
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      {/* Root folder label */}
      {rootFolderName && (
        <div className="px-3 pt-3 pb-1">
          <span className="terminal-label">{rootFolderName}</span>
        </div>
      )}

      {/* Tree nodes */}
      <div className="pb-4">
        {rootFolders.map((folder) => (
          <FolderNodeComponent
            key={folder.id}
            folder={folder}
            depth={0}
            folders={folders}
            files={files}
            activeFileId={activeFileId}
          />
        ))}
        {rootFiles.map((file) => (
          <FileNodeRow
            key={file.id}
            file={file}
            depth={0}
            isActive={file.id === activeFileId}
          />
        ))}
      </div>
    </div>
  );
}
