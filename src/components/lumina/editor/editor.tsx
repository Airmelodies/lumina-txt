'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Save, RotateCcw, Sparkles, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { saveFile } from '@/lib/indexeddb';
import { saveFileToDisk, saveToDefaultDirectory } from '@/lib/file-actions';
import { useLuminaStore } from '@/store/use-lumina-store';

// ─── Utilities ──────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function countLines(content: string): number {
  if (!content) return 0;
  return content.split('\n').length;
}

// ─── Toolbar Separator ──────────────────────────────────────

function ToolbarSeparator() {
  return <div className="w-px h-3.5 bg-border-dim mx-1" />;
}

// ─── Editor Component ───────────────────────────────────────

export function Editor() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // ── Store State ──
  const files = useLuminaStore((s) => s.files);
  const activeFileId = useLuminaStore((s) => s.activeFileId);
  const cursorLine = useLuminaStore((s) => s.cursorLine);
  const cursorCol = useLuminaStore((s) => s.cursorCol);
  const wordWrap = useLuminaStore((s) => s.wordWrap);
  const hasUnsavedChanges = useLuminaStore((s) => s.hasUnsavedChanges);
  const textBrightness = useLuminaStore((s) => s.textBrightness);
  const bgContrast = useLuminaStore((s) => s.bgContrast);
  const spellCheck = useLuminaStore((s) => s.spellCheck);
  const aiPanelOpen = useLuminaStore((s) => s.aiPanelOpen);
  const saveDirectoryHandle = useLuminaStore((s) => s.saveDirectoryHandle);
  const saveDirectoryName = useLuminaStore((s) => s.saveDirectoryName);

  // ── Store Actions ──
  const updateFile = useLuminaStore((s) => s.updateFile);
  const setCursor = useLuminaStore((s) => s.setCursor);
  const toggleWordWrap = useLuminaStore((s) => s.toggleWordWrap);
  const setHasUnsavedChanges = useLuminaStore((s) => s.setHasUnsavedChanges);
  const setAIPanelOpen = useLuminaStore((s) => s.toggleAIPanel);
  const setTextBrightness = useLuminaStore((s) => s.setTextBrightness);
  const setBgContrast = useLuminaStore((s) => s.setBgContrast);

  // ── Derived State ──
  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) ?? null,
    [files, activeFileId]
  );

  const lineCount = useMemo(
    () => (activeFile ? countLines(activeFile.content) : 0),
    [activeFile]
  );

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  }, [lineCount]);

  // ── Selection State ──
  const [selectionInfo, setSelectionInfo] = useState<'none' | string>('none');

  // ── Handle Content Change ──
  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!activeFile) return;
      const content = e.target.value;
      const size = new Blob([content]).size;
      const lines = countLines(content);

      updateFile(activeFile.id, { content, size, lines });
      setHasUnsavedChanges(true);
    },
    [activeFile, updateFile, setHasUnsavedChanges]
  );

  // ── Markdown Formatting Helper ──
  const applyFormatting = useCallback(
    (prefix: string, suffix: string, placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea || !activeFile) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const hasSelection = start !== end;

      // For list: prefix each line in selection
      if (prefix === '- ' && hasSelection && selectedText.includes('\n')) {
        const lines = selectedText.split('\n');
        const prefixed = lines.map((line) => `${prefix}${line}`).join('\n');
        const newValue =
          textarea.value.substring(0, start) + prefixed + textarea.value.substring(end);
        textarea.value = newValue;
        textarea.selectionStart = start;
        textarea.selectionEnd = start + prefixed.length;
        textarea.focus();
        handleContentChange({ target: textarea } as React.ChangeEvent<HTMLTextAreaElement>);
        return;
      }

      const insertion = hasSelection
        ? `${prefix}${selectedText}${suffix}`
        : `${prefix}${placeholder}${suffix}`;

      const newValue =
        textarea.value.substring(0, start) + insertion + textarea.value.substring(end);

      textarea.value = newValue;

      if (hasSelection) {
        textarea.selectionStart = start;
        textarea.selectionEnd = start + insertion.length;
      } else {
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length + placeholder.length;
      }

      textarea.focus();
      handleContentChange({ target: textarea } as React.ChangeEvent<HTMLTextAreaElement>);
    },
    [activeFile, handleContentChange]
  );

  // ── Sync Line Numbers Scroll ──
  const syncScroll = useCallback(() => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.style.transform = `translateY(-${textareaRef.current.scrollTop}px)`;
    }
  }, []);

  // ── Calculate Cursor Position ──
  const updateCursorPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const content = textarea.value;
    const pos = textarea.selectionStart;
    const linesBeforeCursor = content.substring(0, pos).split('\n');
    const line = linesBeforeCursor.length;
    const col = linesBeforeCursor[linesBeforeCursor.length - 1].length + 1;
    setCursor(line, col);

    // Selection info
    const selStart = textarea.selectionStart;
    const selEnd = textarea.selectionEnd;
    if (selStart !== selEnd) {
      const selectedText = content.substring(selStart, selEnd);
      const selectedLines = selectedText.split('\n').length;
      setSelectionInfo(selectedLines === 1
        ? `(${selectedText.length} sel)`
        : `(${selectedLines} lines sel)`);
    } else {
      setSelectionInfo('none');
    }
  }, [setCursor, setSelectionInfo]);

  // ── Handle Save (IndexedDB + optional disk write) ──
  const handleSave = useCallback(async () => {
    if (!activeFile) return;
    try {
      // Always save to IndexedDB first
      await saveFile(activeFile);
      updateFile(activeFile.id, {
        content: activeFile.content,
        size: activeFile.size,
        lines: activeFile.lines,
      });
      setHasUnsavedChanges(false);

      // Dual-write: if default save directory is set, also write to disk
      if (saveDirectoryHandle) {
        const diskOk = await saveToDefaultDirectory(saveDirectoryHandle, activeFile.content, activeFile.name);
        if (diskOk) {
          toast.success('File saved', {
            description: `${activeFile.name} → ${saveDirectoryName ?? 'disk'}`,
          });
        } else {
          toast.success('File saved', {
            description: `${activeFile.name} saved to local storage (disk write failed)`,
          });
        }
      } else {
        toast.success('File saved', {
          description: `${activeFile.name} saved to local storage`,
        });
      }
    } catch {
      toast.error('Save failed', {
        description: 'Could not write to IndexedDB',
      });
    }
  }, [activeFile, updateFile, setHasUnsavedChanges, saveDirectoryHandle, saveDirectoryName]);

  // ── Handle Revert ──
  const handleRevert = useCallback(async () => {
    if (!activeFile) return;
    try {
      const { getFile } = await import('@/lib/indexeddb');
      const savedFile = await getFile(activeFile.id);
      if (savedFile) {
        updateFile(activeFile.id, { content: savedFile.content, size: savedFile.size, lines: savedFile.lines });
        setHasUnsavedChanges(false);
        toast.info('Reverted', {
          description: `${activeFile.name} reverted to last saved state`,
        });
      }
    } catch {
      toast.error('Revert failed', {
        description: 'Could not read from IndexedDB',
      });
    }
  }, [activeFile, updateFile, setHasUnsavedChanges]);

  // ── Handle Keyboard Shortcuts ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Tab → insert 2 spaces
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        textarea.value = newValue;
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        handleContentChange({ target: textarea } as React.ChangeEvent<HTMLTextAreaElement>);
      }

      // Ctrl+S / Cmd+S → save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      // Ctrl+B → bold
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        applyFormatting('**', '**', 'bold text');
      }

      // Ctrl+I → italic
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        applyFormatting('*', '*', 'italic text');
      }

      // Ctrl+F → delegate to browser native find (do NOT preventDefault)
    },
    [handleContentChange, handleSave, applyFormatting]
  );

  // ── Keyboard Shortcut Global Listener (for Ctrl+S when textarea not focused) ──
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeFile) {
          handleSave();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeFile, handleSave]);

  // ── Update cursor when active file changes ──
  useEffect(() => {
    if (textareaRef.current && activeFile) {
      setCursor(1, 1);
    }
  }, [activeFileId, setCursor]);

  // ── Re-compute line count and update when content changes externally ──
  const currentSize = activeFile ? formatFileSize(activeFile.size) : '0 B';
  const currentLines = activeFile ? activeFile.lines : 0;
  const modifiedTime = activeFile ? relativeTime(activeFile.updatedAt) : '—';

  // ── Empty State ──
  if (!activeFile) {
    return (
      <div className="flex-1 flex flex-col bg-surface-void">
        {/* Empty topbar */}
        <div className="h-9 border-b border-border-base bg-surface-panel flex items-center px-3.5">
          <span className="font-mono text-[10px] text-text-dim tracking-[0.04em]">
            Library
          </span>
        </div>

        {/* Empty state */}
        <div className="flex-1 flex items-center justify-center">
          <span className="font-mono text-[11px] text-text-mute">
            Select or create a file to begin editing
          </span>
        </div>

        {/* Empty status bar */}
        <div className="h-[22px] border-t border-border-base bg-surface-panel flex items-center justify-between px-3.5">
          <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">
            No file open
          </span>
          <div className="flex gap-3">
            <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">Spaces: 2</span>
            <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">UTF-8</span>
            <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">LF</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Editor with Active File ──
  return (
    <div className="flex-1 flex flex-col bg-surface-void min-h-0">
      {/* ── Editor Topbar ── */}
      <div className="h-9 border-b border-border-base bg-surface-panel flex items-center justify-between px-3.5 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-text-dim tracking-[0.04em]">Library</span>
          <span className="font-mono text-[10px] text-text-mute">/</span>
          <span className="font-mono text-[10px] text-text-mid tracking-[0.04em]">
            {activeFile.name}
            {hasUnsavedChanges && (
              <span className="text-accent-primary ml-0.5">●</span>
            )}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-1">
          <button
            onClick={handleRevert}
            disabled={!hasUnsavedChanges}
            className="px-2.5 py-1 border border-border-base bg-transparent text-text-dim font-mono text-[10px] tracking-[0.04em] rounded-sm transition-colors hover:bg-surface-raised hover:text-text-mid disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
          >
            <RotateCcw size={11} className="inline-block mr-1 -mt-px" />
            Revert
          </button>
          <button
            onClick={handleSave}
            className="px-2.5 py-1 border border-border-base bg-transparent text-text-dim font-mono text-[10px] tracking-[0.04em] rounded-sm transition-colors hover:border-accent-dim hover:text-accent-primary hover:bg-accent-glow cursor-pointer"
          >
            <Save size={11} className="inline-block mr-1 -mt-px" />
            Save
          </button>
          <button
            onClick={async () => {
              if (activeFile) {
                const saved = await saveFileToDisk(activeFile.content, activeFile.name);
                if (saved) toast.success('Exported', { description: `${activeFile.name}` });
              }
            }}
            className="px-2.5 py-1 border border-border-base bg-transparent text-text-dim font-mono text-[10px] tracking-[0.04em] rounded-sm transition-colors hover:bg-surface-raised hover:text-text-mid cursor-pointer"
          >
            <Download size={11} className="inline-block mr-1 -mt-px" />
            Export
          </button>
          <button
            onClick={() => setAIPanelOpen()}
            className={`px-2.5 py-1 border font-mono text-[10px] tracking-[0.06em] uppercase rounded-sm cursor-pointer transition-all duration-150 ${
              aiPanelOpen
                ? 'border-accent-dim accent-glow text-accent-primary hover:bg-accent-glow-strong hover:border-accent-primary hover:shadow-[0_0_8px_rgba(200,240,96,0.15)]'
                : 'border-border-base bg-transparent text-text-dim hover:bg-surface-raised hover:text-text-mid'
            }`}
          >
            <Sparkles size={11} className="inline-block mr-1 -mt-px" />
            AI Assist
          </button>
        </div>
      </div>

      {/* ── Doc Header ── */}
      <div className="px-4 py-3.5 pb-2.5 border-b border-border-base shrink-0">
        <div className="font-mono text-sm font-medium text-text-bright tracking-[0.01em]">
          {activeFile.name}
        </div>
        <div className="flex gap-4 mt-1">
          <span className="font-mono text-[9px] tracking-[0.06em] uppercase">
            <span className="text-text-mute">Format </span>
            <span className="text-text-dim font-normal">UTF-8 · .{activeFile.fileType}</span>
          </span>
          <span className="font-mono text-[9px] tracking-[0.06em] uppercase">
            <span className="text-text-mute">Size </span>
            <span className="text-text-dim font-normal">{currentSize}</span>
          </span>
          <span className="font-mono text-[9px] tracking-[0.06em] uppercase">
            <span className="text-text-mute">Lines </span>
            <span className="text-text-dim font-normal">{currentLines}</span>
          </span>
          <span className="font-mono text-[9px] tracking-[0.06em] uppercase">
            <span className="text-text-mute">Modified </span>
            <span className="text-text-dim font-normal">{modifiedTime}</span>
          </span>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="px-4 py-1.5 border-b border-border-base bg-surface-panel flex items-center gap-0.5 shrink-0">
        {/* H1 */}
        <button onClick={() => applyFormatting('# ', '', 'heading')} className="px-2 py-0.5 bg-transparent border-none text-text-mute font-mono text-[10px] tracking-[0.03em] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer">H1</button>
        {/* H2 */}
        <button onClick={() => applyFormatting('## ', '', 'heading')} className="px-2 py-0.5 bg-transparent border-none text-text-mute font-mono text-[10px] tracking-[0.03em] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer">H2</button>
        <ToolbarSeparator />
        {/* Bold */}
        <button onClick={() => applyFormatting('**', '**', 'bold text')} className="px-2 py-0.5 bg-transparent border-none text-text-mute font-mono text-[10px] tracking-[0.03em] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer font-semibold">B</button>
        {/* Italic */}
        <button onClick={() => applyFormatting('*', '*', 'italic text')} className="px-2 py-0.5 bg-transparent border-none text-text-mute font-mono text-[10px] tracking-[0.03em] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer italic">I</button>
        <ToolbarSeparator />
        {/* List */}
        <button onClick={() => applyFormatting('- ', '', 'item')} className="px-2 py-0.5 bg-transparent border-none text-text-mute font-mono text-[10px] tracking-[0.03em] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer">— list</button>
        {/* Code block */}
        <button onClick={() => applyFormatting('```\n', '\n```', 'code')} className="px-2 py-0.5 bg-transparent border-none text-text-mute font-mono text-[10px] tracking-[0.03em] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer">{'{ }'}</button>
        <ToolbarSeparator />
        {/* Wrap */}
        <button onClick={toggleWordWrap} className={`px-2 py-0.5 bg-transparent border-none font-mono text-[10px] tracking-[0.03em] rounded-xs transition-colors cursor-pointer ${wordWrap ? 'text-accent-dim bg-accent-glow' : 'text-text-mute hover:text-text-mid hover:bg-surface-raised'}`}>Wrap</button>
        <ToolbarSeparator />
        {/* Find — native Ctrl+F (can't be triggered programmatically in modern browsers) */}
        <button
          onClick={() => {
            textareaRef.current?.focus();
            toast('Find in file', {
              description: 'Press Ctrl+F / ⌘F to search',
              duration: 2000,
            });
          }}
          className="px-2 py-0.5 bg-transparent border-none text-text-mute font-mono text-[10px] tracking-[0.03em] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer"
          title="Find in file (Ctrl+F)"
        >
          <Search size={12} className="inline-block -mt-px" />
        </button>

        {/* ── Spacer ── */}
        <div className="flex-1" />

        {/* ── Brightness control ── */}
        <div className="flex items-center gap-0.5">
          <span className="font-mono text-[8px] text-text-mute mr-0.5">Aa</span>
          <button onClick={() => setTextBrightness(textBrightness - 1)} disabled={textBrightness <= -5} className="w-4 h-4 flex items-center justify-center bg-transparent border-none text-text-dim font-mono text-[10px] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer disabled:opacity-20 disabled:pointer-events-none">−</button>
          <span className="font-mono text-[8px] text-text-dim w-4 text-center">{textBrightness > 0 ? '+' : ''}{textBrightness}</span>
          <button onClick={() => setTextBrightness(textBrightness + 1)} disabled={textBrightness >= 5} className="w-4 h-4 flex items-center justify-center bg-transparent border-none text-text-dim font-mono text-[10px] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer disabled:opacity-20 disabled:pointer-events-none">+</button>
        </div>

        <ToolbarSeparator />

        {/* ── BG contrast control ── */}
        <div className="flex items-center gap-0.5">
          <span className="font-mono text-[8px] text-text-mute mr-0.5">BG</span>
          <button onClick={() => setBgContrast(bgContrast - 1)} disabled={bgContrast <= -5} className="w-4 h-4 flex items-center justify-center bg-transparent border-none text-text-dim font-mono text-[10px] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer disabled:opacity-20 disabled:pointer-events-none">−</button>
          <span className="font-mono text-[8px] text-text-dim w-4 text-center">{bgContrast > 0 ? '+' : ''}{bgContrast}</span>
          <button onClick={() => setBgContrast(bgContrast + 1)} disabled={bgContrast >= 5} className="w-4 h-4 flex items-center justify-center bg-transparent border-none text-text-dim font-mono text-[10px] rounded-xs transition-colors hover:text-text-mid hover:bg-surface-raised cursor-pointer disabled:opacity-20 disabled:pointer-events-none">+</button>
        </div>
      </div>

      {/* ── Editor Body ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Scroll Zone */}
        <div
          className="flex-1 flex overflow-hidden"
          style={{
            filter: textBrightness === 0 ? undefined : `brightness(${1 + textBrightness * 0.15})`,
            backgroundColor: bgContrast === 0 ? undefined : `rgb(${5 + bgContrast * 4}, ${5 + bgContrast * 4}, ${7 + bgContrast * 4})`,
          }}
        >
          {/* Line Numbers */}
          <div className="w-9 shrink-0 bg-surface-panel border-r border-border-base overflow-hidden pt-3.5">
            <div ref={lineNumbersRef} className="transition-transform">
              {lineNumbers.map((num) => (
                <div
                  key={num}
                  className={`font-mono text-[10px] text-text-mute leading-[21.6px] text-right pr-2 select-none ${
                    num === cursorLine ? 'text-accent-dim' : ''
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>

          {/* Text Area */}
          <div className="flex-1 overflow-y-auto p-3.5">
            <textarea
              ref={textareaRef}
              value={activeFile.content}
              onChange={handleContentChange}
              onScroll={syncScroll}
              onKeyUp={updateCursorPosition}
              onClick={updateCursorPosition}
              onKeyDown={handleKeyDown}
              onSelect={updateCursorPosition}
              spellCheck={spellCheck}
              className="w-full h-full bg-transparent border-none outline-none resize-none editor-caret font-mono text-xs text-text-base leading-[21.6px]"
              style={{ whiteSpace: wordWrap ? 'pre-wrap' : 'pre', wordBreak: wordWrap ? 'break-all' : 'normal' }}
              placeholder="Start writing..."
            />
          </div>
        </div>
      </div>

      {/* ── Status Bar ── */}
      <div className="h-[22px] border-t border-border-base bg-surface-panel flex items-center justify-between px-3.5 shrink-0">
        <div className="flex gap-3">
          <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">
            Ln {cursorLine}, Col {cursorCol}
          </span>
          <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">
            {selectionInfo === 'none' ? 'No selection' : selectionInfo}
          </span>
        </div>
        <div className="flex gap-3">
          <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">Spaces: 2</span>
          <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">UTF-8</span>
          <span className="font-mono text-[9px] text-text-mute tracking-[0.06em]">LF</span>
        </div>
      </div>
    </div>
  );
}
