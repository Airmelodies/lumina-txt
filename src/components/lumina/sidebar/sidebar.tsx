'use client';

import { useRef, useCallback, useEffect } from 'react';
import { Search, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useLuminaStore, TextFile, FolderNode } from '@/store/use-lumina-store';
import { getFileType } from '@/store/use-lumina-store';
import { isSupportedFile, saveFile, saveFiles, saveFolders } from '@/lib/indexeddb';
import { FileItem } from './file-item';
import { SidebarTabs } from './sidebar-tabs';
import { FileTree } from './file-tree';
import { SkillsPanel } from './skills-panel';

// ─── Directory Scanner (File System Access API) ─────────────

/**
 * Recursively scans a FileSystemDirectoryHandle, building a flat list
 * of TextFile[] and FolderNode[]. Uses the modern File System Access API
 * for directory picking.
 */
async function scanDirectory(
  dirHandle: any, // Browser FileSystemDirectoryHandle — not fully typed
  parentId: string | null = null,
  path: string = ''
): Promise<{ files: TextFile[]; folders: FolderNode[] }> {
  const files: TextFile[] = [];
  const folders: FolderNode[] = [];

  for await (const entry of dirHandle.values()) {
    const entryPath = path ? `${path}/${entry.name}` : entry.name;

    if (entry.kind === 'file') {
      if (isSupportedFile(entry.name)) {
        const file = await entry.getFile();
        const content = await file.text();
        const now = new Date().toISOString();
        files.push({
          id: crypto.randomUUID(),
          name: entry.name,
          content,
          tags: [],
          summary: null,
          fileType: getFileType(entry.name),
          parentId,
          projectIds: [],
          isClosed: false,
          createdAt: now,
          updatedAt: now,
          size: content.length,
          lines: content.split('\n').length,
        });
      }
    } else if (entry.kind === 'directory') {
      const folderId = crypto.randomUUID();
      const children = await scanDirectory(entry, folderId, entryPath);

      folders.push({
        id: folderId,
        name: entry.name,
        parentId,
        children: [...children.folders.map((f) => f.id), ...children.files.map((f) => f.id)],
        isExpanded: false,
      });

      files.push(...children.files);
      folders.push(...children.folders);
    }
  }

  return { files, folders };
}

// ─── Fallback: Scan files from <input webkitdirectory> ──────

function scanFileList(fileList: FileList): TextFile[] {
  const files: TextFile[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    if (isSupportedFile(file.name)) {
      // Note: synchronous read is not available; we'll read all via promises
      files.push(file);
    }
  }

  return files;
}

async function readFilesAsTextFiles(rawFiles: File[]): Promise<TextFile[]> {
  const results: TextFile[] = [];

  for (const file of rawFiles) {
    try {
      const content = await file.text();
      const now = new Date().toISOString();
      results.push({
        id: crypto.randomUUID(),
        name: file.name,
        content,
        tags: [],
        summary: null,
        fileType: getFileType(file.name),
        parentId: null,
        projectIds: [],
        isClosed: false,
        createdAt: now,
        updatedAt: now,
        size: content.length,
        lines: content.split('\n').length,
      });
    } catch {
      // Skip unreadable files
    }
  }

  return results;
}

// ─── Main Sidebar Component ─────────────────────────────────

export function Sidebar() {
  const files = useLuminaStore((s) => s.files);
  const activeFileId = useLuminaStore((s) => s.activeFileId);
  const sidebarTab = useLuminaStore((s) => s.sidebarTab);
  const searchQuery = useLuminaStore((s) => s.searchQuery);
  const setSearchQuery = useLuminaStore((s) => s.setSearchQuery);
  const setActiveFile = useLuminaStore((s) => s.setActiveFile);
  const addFile = useLuminaStore((s) => s.addFile);
  const addFiles = useLuminaStore((s) => s.addFiles);
  const setFolders = useLuminaStore((s) => s.setFolders);
  const setRootFolder = useLuminaStore((s) => s.setRootFolder);
  const setSidebarTab = useLuminaStore((s) => s.setSidebarTab);
  const setNewFileModalOpen = useLuminaStore((s) => s.setNewFileModalOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);

  // ── Filter files by search query ──
  const filteredFiles = searchQuery
    ? files.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : files;

  // ── Handle folder loading via File System Access API ──
  const handleChooseFolder = useCallback(async () => {
    // Try modern File System Access API first
    if (typeof window !== 'undefined' && (window as any).showDirectoryPicker) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        const folderName = dirHandle.name;

        toast.loading(`Scanning ${folderName}…`, { id: 'folder-scan' });

        const { files: scannedFiles, folders: scannedFolders } =
          await scanDirectory(dirHandle);

        // Store in IndexedDB
        await saveFolders(scannedFolders);
        await saveFiles(scannedFiles);

        // Update store
        setRootFolder(dirHandle, folderName);
        setFolders(scannedFolders);
        addFiles(scannedFiles);

        // Auto-switch to tree tab
        setSidebarTab('tree');

        toast.success(`${scannedFiles.length} files loaded from ${folderName}`, {
          id: 'folder-scan',
        });
      } catch (err: unknown) {
        // User cancelled the picker
        if (err instanceof Error && err.name === 'AbortError') {
          toast.dismiss('folder-scan');
          return;
        }
        toast.error('Failed to load folder', { id: 'folder-scan' });
      }
    } else {
      // Fallback: use webkitdirectory input
      dirInputRef.current?.click();
    }
  }, [setRootFolder, setFolders, addFiles, setSidebarTab]);

  // ── Handle fallback directory input change ──
  const handleDirInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;

      toast.loading('Scanning folder…', { id: 'folder-scan' });

      try {
        // Get folder name from webkitRelativePath
        const firstPath = selected[0]?.webkitRelativePath ?? '';
        const folderName = firstPath.split('/')[0] || 'Folder';

        const rawFiles = scanFileList(selected);
        const textFiles = await readFilesAsTextFiles(rawFiles);

        await saveFiles(textFiles);
        addFiles(textFiles);
        setSidebarTab('tree');

        toast.success(`${textFiles.length} files loaded from ${folderName}`, {
          id: 'folder-scan',
        });
      } catch {
        toast.error('Failed to load folder', { id: 'folder-scan' });
      }

      e.target.value = '';
    },
    [addFiles, setSidebarTab]
  );

  // ── Handle file import via input (individual files) ──
  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;

      const promises = Array.from(selected).map(
        (file) =>
          new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const content = reader.result as string;
              const now = new Date().toISOString();
              const newFile = {
                id: crypto.randomUUID(),
                name: file.name,
                content,
                tags: [] as string[],
                summary: null as string | null,
                fileType: getFileType(file.name),
                parentId: null as string | null,
                projectIds: [] as string[],
                isClosed: false,
                createdAt: now,
                updatedAt: now,
                size: content.length,
                lines: content.split('\n').length,
              };
              addFile(newFile);
              saveFile(newFile).catch(() => {});
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsText(file);
          })
      );

      Promise.all(promises).then(() => {
        toast.success(`${selected.length} file(s) loaded`);
      });

      // Reset input so the same file can be re-selected
      e.target.value = '';
    },
    [addFile]
  );

  // ── Listen for choose-folder events from FileTree empty state ──
  useEffect(() => {
    const handler = () => {
      handleChooseFolder();
    };
    window.addEventListener('lumina:choose-folder', handler);
    return () => window.removeEventListener('lumina:choose-folder', handler);
  }, [handleChooseFolder]);

  return (
    <aside className="w-[220px] min-w-[220px] h-full bg-surface-panel border-r border-border-base flex flex-col">
      <div className="flex flex-col h-full overflow-hidden">
        {/* ── Sidebar Tabs ── */}
        <SidebarTabs />

        {/* ── Conditional Content ── */}
        {sidebarTab === 'tree' ? (
          <SidebarTreeView />
        ) : sidebarTab === 'skills' ? (
          <SkillsPanel />
        ) : (
          <SidebarWorkspace
            files={files}
            filteredFiles={filteredFiles}
            activeFileId={activeFileId}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setActiveFile={setActiveFile}
            handleChooseFolder={handleChooseFolder}
            handleFileImport={handleFileImport}
            setNewFileModalOpen={setNewFileModalOpen}
            fileInputRef={fileInputRef}
          />
        )}

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.html,.css"
          multiple
          className="hidden"
          onChange={handleFileImport}
        />
        <input
          ref={dirInputRef}
          type="file"
          // @ts-expect-error webkitdirectory is not in the TS types
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={handleDirInputChange}
        />
      </div>
    </aside>
  );
}

// ─── Workspace View (original sidebar content) ──────────────

interface SidebarWorkspaceProps {
  files: TextFile[];
  filteredFiles: TextFile[];
  activeFileId: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setActiveFile: (id: string) => void;
  handleChooseFolder: () => void;
  handleFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setNewFileModalOpen: (open: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

function SidebarWorkspace({
  files,
  filteredFiles,
  activeFileId,
  searchQuery,
  setSearchQuery,
  setActiveFile,
  handleChooseFolder,
  setNewFileModalOpen,
}: SidebarWorkspaceProps) {
  return (
    <>
      {/* ── Workspace Section ── */}
      <div className="px-3 pt-3 pb-2">
        <span className="terminal-label">Workspace</span>
        <div className="mt-2 space-y-2">
          {/* Choose folder button */}
          <button
            onClick={handleChooseFolder}
            className={[
              'w-full text-left px-3 py-1.5 rounded-[2px]',
              'font-mono text-[10px] tracking-[0.04em]',
              'border border-dashed border-border-base',
              'text-text-dim hover:text-text-mid hover:border-border-lit',
              'transition-colors duration-100 cursor-pointer',
              'flex items-center gap-2',
            ].join(' ')}
          >
            <FolderOpen size={10} className="shrink-0 text-text-dim" />
            Choose folder
          </button>

          {/* New file button */}
          <button
            onClick={() => setNewFileModalOpen(true)}
            className={[
              'w-full text-left px-3 py-1.5 rounded-[2px]',
              'font-mono text-[10px] tracking-[0.04em]',
              'border border-solid border-border-base',
              'text-text-dim hover:text-text-mid hover:border-border-lit',
              'transition-colors duration-100 cursor-pointer',
            ].join(' ')}
          >
            + New file
          </button>
        </div>
      </div>

      {/* ── Search Section ── */}
      <div className="px-3 pb-2">
        <span className="terminal-label">Search</span>
        <div className="relative mt-2">
          <Search
            size={10}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter files…"
            className={[
              'w-full bg-surface-surface border border-border-base',
              'text-text-base font-mono text-[10px]',
              'placeholder:text-text-mute',
              'pl-7 pr-2 py-1.5 rounded-[2px]',
              'outline-none focus:border-border-lit',
              'transition-colors duration-100',
            ].join(' ')}
          />
        </div>
      </div>

      {/* ── File List Section ── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-3 pt-1 pb-1">
          <span className="terminal-label">Recents</span>
        </div>
        <div className="px-1">
          {filteredFiles.length === 0 && (
            <div className="px-2 py-4 text-center">
              <span className="font-mono text-[9px] text-text-mute">
                {files.length === 0
                  ? 'No files yet'
                  : 'No matches found'}
              </span>
            </div>
          )}
          {filteredFiles.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              isActive={file.id === activeFileId}
              onClick={() => setActiveFile(file.id)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Tree View ──────────────────────────────────────────────

function SidebarTreeView() {
  return <FileTree />;
}
