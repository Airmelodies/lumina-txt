'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useLuminaStore } from '@/store/use-lumina-store';
import { ABOUT_DOCS } from '@/lib/about-docs';

// ─── Types ──────────────────────────────────────────────────

type Phase = 'splash' | 'terminal' | 'reader';

interface TerminalLine {
  text: string;
  className: string;
}

// ─── Boot Messages ──────────────────────────────────────────

const BOOT_MESSAGES = [
  'INITIALIZING LUMINA CORE...',
  'LOADING FILE MODULES [OK]',
  'MOUNTING AI ENGINE [OK]',
  'ESTABLISHING LOCAL STORAGE...',
  'AI PROVIDER: READY [OK]',
  'WORKSPACE: MOUNTED [OK]',
  'SYSTEM READY.',
];

// ─── About Terminal Component ───────────────────────────────

export function AboutTerminal() {
  const aboutTerminalOpen = useLuminaStore((s) => s.aboutTerminalOpen);
  const setAboutTerminalOpen = useLuminaStore((s) => s.setAboutTerminalOpen);
  const files = useLuminaStore((s) => s.files);
  const settings = useLuminaStore((s) => s.settings);
  const projects = useLuminaStore((s) => s.projects);
  const skills = useLuminaStore((s) => s.skills);
  const saveDirectoryName = useLuminaStore((s) => s.saveDirectoryName);

  const [phase, setPhase] = useState<Phase>('splash');
  const [bootText, setBootText] = useState('');
  const [splashOpacity, setSplashOpacity] = useState(1);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputDisabled, setInputDisabled] = useState(false);
  const [readerDocIndex, setReaderDocIndex] = useState(0);
  const [readerDoc, setReaderDoc] = useState<{ title: string; content: string } | null>(null);
  const [isUserFile, setIsUserFile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const readerBodyRef = useRef<HTMLDivElement>(null);

  // ── Close handler ──
  const close = useCallback(() => {
    setAboutTerminalOpen(false);
    // Reset state after close animation
    setTimeout(() => {
      setPhase('splash');
      setBootText('');
      setSplashOpacity(1);
      setTerminalLines([]);
      setInputValue('');
      setInputDisabled(false);
      setReaderDoc(null);
      setIsUserFile(false);
      setReaderDocIndex(0);
    }, 300);
  }, [setAboutTerminalOpen]);

  // ── Escape to close ──
  useEffect(() => {
    if (!aboutTerminalOpen) return;
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (phase === 'reader') {
          // From reader → back to terminal
          setReaderDoc(null);
          setIsUserFile(false);
          setTimeout(() => inputRef.current?.focus(), 100);
        } else {
          close();
        }
      }
      // Arrow keys in reader
      if (phase === 'reader' && !isUserFile) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setReaderDocIndex((i) => Math.max(0, i - 1));
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setReaderDocIndex((i) => Math.min(ABOUT_DOCS.length - 1, i + 1));
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [aboutTerminalOpen, phase, isUserFile, close]);

  // ── Line helpers ──
  const addLines = useCallback((lines: TerminalLine[]) => {
    setTerminalLines((prev) => [...prev, ...lines]);
  }, []);

  // ── Boot sequence ──
  useEffect(() => {
    if (!aboutTerminalOpen) return;
    if (phase !== 'splash') return;

    let cancelled = false;

    async function boot() {
      for (const msg of BOOT_MESSAGES) {
        if (cancelled) return;
        setBootText(msg);
        await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));
      }
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 400));
      // Fade out splash
      setSplashOpacity(0);
      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;
      // Show terminal
      setPhase('terminal');
      addLines([
        { text: 'LUMINA TXT v0.4.0 [LXT Terminal]', className: 'crt-glow-bright' },
        { text: 'Type "help" for a list of available commands.', className: 'text-[#aaddaa]' },
        { text: '', className: '' },
      ]);
    }

    boot();
    return () => { cancelled = true; };
  }, [aboutTerminalOpen, phase, addLines]);

  // ── Focus input when terminal is visible ──
  useEffect(() => {
    if (phase === 'terminal' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [phase]);

  // ── Scroll terminal output to bottom ──
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [terminalLines]);

  // ── Scroll reader to top when doc changes ──
  useEffect(() => {
    if (readerBodyRef.current) {
      readerBodyRef.current.scrollTop = 0;
    }
  }, [readerDocIndex]);

  // ── Process command ──
  const processCommand = useCallback(async (cmdString: string) => {
    const echo: TerminalLine = { text: `LXT@LUMINA:~$ ${cmdString}`, className: 'text-white' };
    addLines([echo]);

    const args = cmdString.trim().split(/\s+/).filter(Boolean);
    const cmd = args[0]?.toLowerCase();

    if (!cmd) return;

    setInputDisabled(true);

    switch (cmd) {
      case 'help': {
        const lines: TerminalLine[] = [
          { text: 'Available commands:', className: 'crt-glow' },
          { text: '', className: '' },
          { text: '  help            Show this message', className: '' },
          { text: '  status          Display workspace diagnostics', className: '' },
          { text: '  ls              List workspace files', className: '' },
          { text: '  read            Open document reader', className: '' },
          { text: '  read <file>     Read a workspace file in reader', className: '' },
          { text: '  clear           Clear terminal output', className: '' },
          { text: '  date            Display current date', className: '' },
          { text: '  reboot          Replay boot sequence', className: '' },
          { text: '  sudo            Try it.', className: '' },
          { text: '  exit            Close terminal', className: '' },
        ];
        addLines(lines);
        break;
      }

      case 'status': {
        const providerLabel = settings.provider === 'zai' ? 'Z.ai (Built-in)' : settings.provider === 'local' ? 'Local (Ollama)' : 'Cloud (Gemini)';
        const totalSize = files.reduce((acc, f) => acc + f.size, 0);
        const sizeStr = totalSize < 1024 ? `${totalSize} B` : totalSize < 1024 * 1024 ? `${(totalSize / 1024).toFixed(1)} KB` : `${(totalSize / (1024 * 1024)).toFixed(1)} MB`;
        const lines: TerminalLine[] = [
          { text: '── WORKSPACE DIAGNOSTICS ──', className: 'crt-glow' },
          { text: '', className: '' },
          { text: `  PROVIDER        ${providerLabel}`, className: '' },
          { text: `  FILES           ${files.length}`, className: '' },
          { text: `  PROJECTS        ${projects.length}`, className: '' },
          { text: `  SKILLS          ${skills.length}`, className: '' },
          { text: `  WORKSPACE SIZE  ${sizeStr}`, className: '' },
          { text: `  SAVE DIRECTORY  ${saveDirectoryName || 'NOT SET'}`, className: '' },
          { text: '', className: '' },
          { text: 'All systems nominal.', className: 'text-[#aaddaa]' },
        ];
        addLines(lines);
        break;
      }

      case 'ls': {
        if (files.length === 0) {
          addLines([{ text: '  (workspace is empty)', className: 'text-[#3a3a50]' }]);
        } else {
          const lines: TerminalLine[] = files.map((f) => ({
            text: `  ${f.name.padEnd(24)} ${f.size} bytes`,
            className: '',
          }));
          addLines(lines);
        }
        break;
      }

      case 'read': {
        if (args.length < 2) {
          // Open pre-loaded docs reader
          setReaderDocIndex(0);
          setReaderDoc({ title: ABOUT_DOCS[0].title, content: ABOUT_DOCS[0].content });
          setIsUserFile(false);
          setPhase('reader');
        } else {
          // Try to find a workspace file
          const query = args.slice(1).join(' ').toLowerCase();
          const matches = files.filter((f) => f.name.toLowerCase().includes(query));

          if (matches.length === 0) {
            addLines([{ text: `  read: "${args.slice(1).join(' ')}" — file not found in workspace`, className: 'text-[#ff5555]' }]);
          } else if (matches.length > 1) {
            addLines([{ text: `  Ambiguous — did you mean: ${matches.map((f) => f.name).join(', ')}?`, className: 'text-[#f5a623]' }]);
          } else {
            setReaderDoc({ title: matches[0].name, content: matches[0].content });
            setIsUserFile(true);
            setPhase('reader');
          }
        }
        break;
      }

      case 'clear': {
        setTerminalLines([]);
        break;
      }

      case 'date': {
        addLines([{ text: `  ${new Date().toString()}`, className: '' }]);
        break;
      }

      case 'reboot': {
        setTerminalLines([]);
        setInputDisabled(true);
        setPhase('splash');
        setSplashOpacity(1);
        setBootText('');
        break;
      }

      case 'sudo': {
        addLines([{ text: '  Nice try. This incident will be reported.', className: 'text-[#ff5555]' }]);
        break;
      }

      case 'exit': {
        setInputDisabled(false);
        close();
        return;
      }

      default: {
        addLines([{ text: `  Command not found: ${cmd}`, className: 'text-[#ff5555]' }]);
        break;
      }
    }

    setInputDisabled(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [addLines, files, settings.provider, projects, skills, saveDirectoryName, close]);

  // ── Handle Enter key ──
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && inputValue.trim()) {
        processCommand(inputValue.trim());
        setInputValue('');
      }
    },
    [inputValue, processCommand]
  );

  // ── Reader doc navigation ──
  const currentDoc = useMemo(() => {
    if (readerDoc && isUserFile) return readerDoc;
    return ABOUT_DOCS[readerDocIndex] ?? ABOUT_DOCS[0];
  }, [readerDoc, isUserFile, readerDocIndex]);

  // ── Render reader doc content with glow ──
  const renderContent = useCallback((content: string) => {
    return content.split('\n').map((line, i) => (
      <div key={i} className="whitespace-pre-wrap break-words">
        {line || '\u00A0'}
      </div>
    ));
  }, []);

  if (!aboutTerminalOpen) return null;

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div
      className="fixed inset-0 z-[1000] bg-[#09090d] crt-overlay crt-flicker"
      style={{ transition: 'opacity 0.3s ease' }}
      onClick={() => { if (phase === 'terminal') inputRef.current?.focus(); }}
    >
      {/* ── Phase 1: SPLASH SCREEN ── */}
      {phase === 'splash' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-20"
          style={{ opacity: splashOpacity, transition: 'opacity 0.6s ease' }}
        >
          <div className="crt-logo">LUMINA</div>
          <div className="crt-glow mt-4 text-xl font-bold tracking-[0.1em]">
            LXT — LUMINA TXT
          </div>
          <div className="crt-glow mt-8 text-base h-7 font-mono">{bootText}</div>
        </div>
      )}

      {/* ── Phase 2: TERMINAL ── */}
      {phase === 'terminal' && (
        <div className="absolute inset-0 flex flex-col p-4 sm:p-8 z-10" style={{ animation: 'fadeIn 0.4s ease' }}>
          {/* Output area */}
          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto mb-2 font-mono text-sm leading-relaxed"
            style={{ scrollbarWidth: 'none' }}
          >
            {terminalLines.map((line, i) => (
              <div
                key={i}
                className={`${line.className || 'crt-glow'}`}
                style={{
                  textShadow: line.className?.includes('white')
                    ? undefined
                    : '0 0 4px rgba(200, 240, 96, 0.3)',
                }}
              >
                {line.text || '\u00A0'}
              </div>
            ))}
          </div>

          {/* Input line */}
          <div className="flex items-center shrink-0">
            <span className="crt-glow mr-2 font-mono text-sm font-bold">LXT@LUMINA:~$</span>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={inputDisabled}
                className="absolute inset-0 opacity-0 cursor-default"
                autoComplete="off"
                spellCheck={false}
              />
              <div className="font-mono text-sm flex items-center pointer-events-none">
                <span className="crt-glow">{inputValue}</span>
                <span className="crt-cursor" />
              </div>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={close}
            className="absolute top-4 right-4 px-2.5 py-1 border border-[rgba(200,240,96,0.2)] text-[#c8f060] font-mono text-[10px] tracking-[0.06em] uppercase hover:border-[rgba(200,240,96,0.5)] hover:bg-[rgba(200,240,96,0.05)] rounded-sm transition-colors cursor-pointer z-[60]"
          >
            Exit Terminal
          </button>
        </div>
      )}

      {/* ── Phase 3: IMMERSIVE READER ── */}
      {phase === 'reader' && currentDoc && (
        <div className="absolute inset-0 flex flex-col z-20" style={{ animation: 'fadeIn 0.4s ease' }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(200,240,96,0.1)] shrink-0 z-[60]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setReaderDoc(null);
                setIsUserFile(false);
                setPhase('terminal');
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[#c8f060] font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-[rgba(200,240,96,0.08)] rounded-sm transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
              Back
            </button>
            <span className="crt-glow font-mono text-xs tracking-[0.08em] uppercase font-medium">
              {currentDoc.title}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); close(); }}
              className="p-1.5 text-[rgba(200,240,96,0.4)] hover:text-[#c8f060] transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {/* Reader body */}
          <div
            ref={readerBodyRef}
            className="flex-1 overflow-y-auto p-6 sm:p-10 font-mono text-sm leading-[1.9]"
          >
            {renderContent(currentDoc.content)}
          </div>

          {/* Bottom bar — only for pre-loaded docs (not user files) */}
          {!isUserFile && (
            <div className="flex items-center justify-center gap-4 px-4 py-3 border-t border-[rgba(200,240,96,0.1)] shrink-0 z-[60]" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={(e) => { e.stopPropagation(); setReaderDocIndex((i) => Math.max(0, i - 1)); }}
                disabled={readerDocIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-[#c8f060] font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-[rgba(200,240,96,0.08)] rounded-sm transition-colors cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              <span className="crt-glow font-mono text-[10px] tracking-[0.1em]">
                {readerDocIndex + 1} / {ABOUT_DOCS.length}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setReaderDocIndex((i) => Math.min(ABOUT_DOCS.length - 1, i + 1)); }}
                disabled={readerDocIndex === ABOUT_DOCS.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 text-[#c8f060] font-mono text-[10px] tracking-[0.06em] uppercase hover:bg-[rgba(200,240,96,0.08)] rounded-sm transition-colors cursor-pointer disabled:opacity-25 disabled:pointer-events-none"
              >
                Next
                <ChevronRight size={12} />
              </button>
            </div>
          )}

          {/* Bottom bar — for user files */}
          {isUserFile && (
            <div className="flex items-center justify-center px-4 py-3 border-t border-[rgba(200,240,96,0.1)] shrink-0 z-[60]">
              <span className="text-[rgba(200,240,96,0.3)] font-mono text-[9px] tracking-[0.1em] uppercase">
                ← → keys disabled — single file view — press Esc to return
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
