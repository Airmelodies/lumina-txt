'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardCopy, FilePlus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLuminaStore, type AIMode } from '@/store/use-lumina-store';
import { saveConversation, getConversation, deleteConversation } from '@/lib/indexeddb';
import { buildSkillSystemPrompt } from '@/lib/skill-parser';

// ─── Mode Definitions ──────────────────────────────────────

const AI_MODES: { mode: AIMode; label: string }[] = [
  { mode: 'summarize', label: 'Summarize' },
  { mode: 'tag', label: 'Tag' },
  { mode: 'rewrite', label: 'Rewrite' },
  { mode: 'extract-tasks', label: 'Extract tasks' },
  { mode: 'search', label: 'Search lib' },
  { mode: 'chat', label: 'Chat w/ file' },
  { mode: 'skill', label: 'Use skill' },
];

// Modes that operate on the whole file without needing a prompt
const AUTO_MODES: AIMode[] = ['summarize', 'tag', 'rewrite', 'extract-tasks', 'search'];

// ─── Prompt Builders ───────────────────────────────────────

function buildPrompt(mode: AIMode, content: string, userPrompt: string): string {
  switch (mode) {
    case 'summarize':
      return `Summarize this text concisely:\n\n${content}`;
    case 'tag':
      return `Suggest 2-4 relevant tags for this text. Return only the tags as a comma-separated list:\n\n${content}`;
    case 'rewrite':
      return `Rewrite this text for clarity and readability:\n\n${content}`;
    case 'extract-tasks':
      return `Extract actionable tasks from this text. List them with checkboxes:\n\n${content}`;
    case 'search':
      return `Based on this document, what are the key topics?\n\n${content}`;
    case 'chat':
      return `Context from file:\n${content}\n\nUser question: ${userPrompt}`;
    default:
      return content;
  }
}

// ─── Model Display Name ────────────────────────────────────

function getModelLabel(settings: { provider: string; ollamaModel: string; geminiModel: string }): string {
  if (settings.provider === 'zai') return 'Z.ai';
  if (settings.provider === 'local') return settings.ollamaModel || 'Ollama';
  return settings.geminiModel || 'Gemini';
}

// ─── Simple Markdown-like Renderer ─────────────────────────

function renderOutput(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Lines starting with — get the dash in accent-primary
    if (line.startsWith('—') || line.startsWith('- ')) {
      const dash = line.startsWith('—') ? '—' : '- ';
      const rest = line.slice(dash.length);
      // Handle bold within the rest
      return (
        <div key={i} className="leading-[1.7]">
          <span className="text-accent-primary">{dash}</span>
          <span>{renderInline(rest)}</span>
        </div>
      );
    }

    // Empty line = paragraph break
    if (line.trim() === '') {
      return <div key={i} className="h-3" />;
    }

    // Checkbox lines: [x] or [ ]
    if (/^\[[ x]\]/.test(line)) {
      const checked = line.startsWith('[x]');
      const rest = line.replace(/^\[[ x]\]\s*/, '');
      return (
        <div key={i} className="leading-[1.7] flex items-start gap-1.5">
          <span className={`inline-block w-3 h-3 mt-[2px] flex-shrink-0 border ${checked ? 'border-accent-primary bg-accent-glow' : 'border-border-base bg-surface-panel'}`}>
            {checked && <span className="text-accent-primary text-[8px] leading-none">✓</span>}
          </span>
          <span>{renderInline(rest)}</span>
        </div>
      );
    }

    // Default line with bold support
    return (
      <div key={i} className="leading-[1.7]">
        {renderInline(line)}
      </div>
    );
  });
}

function renderInline(text: string): (string | JSX.Element)[] {
  // Simple bold parsing: **text** -> bold span
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={i} className="text-text-base font-medium">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Loading Dots Animation ────────────────────────────────

function LoadingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 bg-accent-dim"
            style={{
              animation: 'ledpulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
      <span className="text-text-dim ml-1.5 font-mono text-[10px] tracking-wide uppercase">
        Analyzing...
      </span>
    </div>
  );
}

// ─── Main AI Panel Component ───────────────────────────────

export function AIPanel() {
  const {
    aiMode,
    aiOutput,
    aiLoading,
    aiPrompt,
    aiConversation,
    activeFileId,
    files,
    settings,
    skills,
    activeSkillId,
    persona,
    projects,
    activeProjectId,
    setAIMode,
    setAIOutput,
    setAILoading,
    setAIPrompt,
    setAIConversation,
    addAIMessage,
    clearAIConversation,
    setActiveSkill,
  } = useLuminaStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track previous file ID for conversation persistence
  const prevFileIdRef = useRef<string | null>(null);

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) ?? null,
    [files, activeFileId]
  );

  const modelLabel = useMemo(() => getModelLabel(settings), [settings]);

  // ─── Conversation Persistence ────────────────────────────
  useEffect(() => {
    const prevFileId = prevFileIdRef.current;

    // Save current conversation for previous file
    if (prevFileId && aiConversation.length > 0) {
      saveConversation({
        fileId: prevFileId,
        messages: aiConversation,
        updatedAt: new Date().toISOString(),
      }).catch(() => {
        // Silently ignore save errors
      });
    }

    // Load conversation for new active file
    if (activeFileId) {
      getConversation(activeFileId)
        .then((record) => {
          if (record && record.messages.length > 0) {
            setAIConversation(record.messages);
            // Restore last assistant message as output
            const lastAssistant = [...record.messages].reverse().find((m) => m.role === 'assistant');
            if (lastAssistant) {
              setAIOutput(lastAssistant.content);
            } else {
              setAIOutput('');
            }
          } else {
            // No conversation found → clear
            setAIConversation([]);
            setAIOutput('');
          }
        })
        .catch(() => {
          setAIConversation([]);
          setAIOutput('');
        });
    }

    // Update ref
    prevFileIdRef.current = activeFileId;
  }, [activeFileId]);

  // Auto-scroll output to bottom when new content arrives
  const scrollToBottom = useCallback(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, []);

  // ─── Clear Conversation Handler ──────────────────────────
  const handleClearConversation = useCallback(async () => {
    clearAIConversation();
    if (activeFileId) {
      try {
        await deleteConversation(activeFileId);
      } catch {
        // Silently ignore
      }
    }
  }, [clearAIConversation, activeFileId]);

  // ─── Submit Handler ──────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (isSubmitting || aiLoading) return;

    // Validate: need an active file
    if (!activeFile) {
      toast.error('Select a file first');
      return;
    }

    // Validate: chat and skill modes need a prompt
    if (!aiPrompt.trim() && !AUTO_MODES.includes(aiMode) && aiMode !== 'skill') {
      toast.error('Enter a prompt or select an auto mode');
      return;
    }

    setIsSubmitting(true);
    setAILoading(true);
    setAIOutput('');

    let builtPrompt: string;
    // Build the full system prompt context stack (priority: Skill > Project > Persona > Mode default)
    const systemPromptParts: string[] = [];

    // 1. Skill system prompt (highest priority)
    if (aiMode === 'skill' && activeSkillId) {
      const skill = skills.find((s) => s.id === activeSkillId);
      if (skill) {
        systemPromptParts.push(buildSkillSystemPrompt(skill));
        builtPrompt = `${activeFile.content}\n\nUser: ${aiPrompt.trim()}`;
      } else {
        toast.error('Selected skill not found');
        setAILoading(false);
        setIsSubmitting(false);
        return;
      }
    } else {
      builtPrompt = buildPrompt(aiMode, activeFile.content, aiPrompt.trim());
    }

    // 2. Project context (if active project)
    const activeProject = activeProjectId
      ? projects.find((p) => p.id === activeProjectId)
      : null;
    if (activeProject) {
      if (activeProject.instructions.trim()) {
        systemPromptParts.push(`Project Instructions (${activeProject.name}):\n${activeProject.instructions.trim()}`);
      }
      // Include always-on reference files
      const alwaysOnRefs = activeProject.referenceFiles.filter((f) => f.contextMode === 'always-on');
      if (alwaysOnRefs.length > 0) {
        const refContent = alwaysOnRefs
          .map((f) => `--- ${f.name} ---\n${f.content}`)
          .join('\n\n');
        systemPromptParts.push(`Project Reference Files:\n${refContent}`);
      }
    }

    // 3. Persona (master or project override)
    const effectivePersona = activeProject?.personaOverride
      ? { systemPrompt: activeProject.personaOverride, name: activeProject.name, tone: 'custom' as const }
      : persona;
    if (effectivePersona.systemPrompt.trim()) {
      systemPromptParts.push(`Persona (${effectivePersona.name || 'Master'}):\n${effectivePersona.systemPrompt.trim()}`);
    }

    // Combine all context into one system prompt
    let systemPrompt = systemPromptParts.length > 0
      ? systemPromptParts.join('\n\n---\n\n')
      : undefined;

    // ── Skill Router: replace {{SKILL_REGISTRY}} placeholder ──
    if (systemPrompt && systemPrompt.includes('{{SKILL_REGISTRY}}')) {
      const registry = skills
        .filter((s) => s.id !== activeSkillId)
        .map((s) => `- **${s.name}** (priority: ${s.priority ?? 0}): ${s.description}`)
        .join('\n');
      systemPrompt = systemPrompt.replace('{{SKILL_REGISTRY}}', registry || '(No other skills loaded)');
    }

    // Add user message to conversation
    addAIMessage('user', builtPrompt);

    try {
      // For chat/skill modes, send full conversation history for multi-turn.
      // For auto modes (summarize/tag/etc.), send only the current message.
      const isConversational = aiMode === 'chat' || aiMode === 'skill';
      const updatedConversation = [...aiConversation, { role: 'user' as const, content: builtPrompt }];
      const messages = isConversational ? updatedConversation : [{ role: 'user' as const, content: builtPrompt }];

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          mode: aiMode,
          systemPrompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? 'AI request failed');
      }

      const output = data.output ?? 'No response received.';
      setAIOutput(output);
      addAIMessage('assistant', output);

      // If mode is 'tag', try to apply tags to the file
      if (aiMode === 'tag' && activeFile) {
        const tags = output
          .split(',')
          .map((t: string) => t.trim().replace(/^#+\s*/, ''))
          .filter((t: string) => t.length > 0);
        if (tags.length > 0) {
          useLuminaStore.getState().updateFile(activeFile.id, { tags });
        }
      }

      // If mode is 'summarize', apply summary to file
      if (aiMode === 'summarize' && activeFile) {
        useLuminaStore.getState().updateFile(activeFile.id, {
          summary: output.slice(0, 200),
        });
      }

      // Persist conversation to IndexedDB after each exchange
      if (activeFileId) {
        const updatedConversation = useLuminaStore.getState().aiConversation;
        if (updatedConversation.length > 0) {
          saveConversation({
            fileId: activeFileId,
            messages: updatedConversation,
            updatedAt: new Date().toISOString(),
          }).catch(() => {
            // Silently ignore
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Request failed';
      setAIOutput(`Error: ${message}`);
      toast.error(message);
    } finally {
      setAILoading(false);
      setIsSubmitting(false);
      // Scroll to bottom after output
      setTimeout(scrollToBottom, 50);
    }
  }, [
    isSubmitting,
    aiLoading,
    activeFile,
    aiPrompt,
    aiMode,
    activeSkillId,
    skills,
    activeFileId,
    setAILoading,
    setAIOutput,
    addAIMessage,
    scrollToBottom,
  ]);

  // Copy AI output to clipboard
  const handleCopyOutput = useCallback(async () => {
    if (!aiOutput) return;
    try {
      await navigator.clipboard.writeText(aiOutput);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [aiOutput]);

  // Append AI output to active file
  const handleAppendToFile = useCallback(async () => {
    if (!aiOutput || !activeFile) {
      toast.error('No output or no active file');
      return;
    }
    const separator = '\n\n--- AI Output ---\n';
    const newContent = activeFile.content + (activeFile.content ? separator : '') + aiOutput + '\n';
    const lines = newContent.split('\n').length;
    const size = newContent.length;

    useLuminaStore.getState().updateFile(activeFile.id, { content: newContent, size, lines });

    // Also persist to IndexedDB
    try {
      const { saveFile } = await import('@/lib/indexeddb');
      await saveFile({ ...activeFile, content: newContent, size, lines, updatedAt: new Date().toISOString() });
      toast.success(`Appended to ${activeFile.name}`);
    } catch {
      toast.error('Failed to save');
    }
  }, [aiOutput, activeFile]);

  // Clear AI output
  const handleClearOutput = useCallback(() => {
    setAIOutput('');
  }, [setAIOutput]);

  // Keyboard handler: Enter to submit, Shift+Enter for newline
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Clear prompt on Escape
  const handleKeyDownCapture = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        setAIPrompt('');
        textareaRef.current?.blur();
      }
    },
    [setAIPrompt]
  );

  // Message count for indicator
  const msgCount = aiConversation.length;

  return (
    <div className="w-64 border-l border-border-base bg-surface-panel flex flex-col h-full">
      {/* ── AI Topbar ── */}
      <div className="h-9 border-b border-border-base flex items-center justify-between px-3 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-text-dim">
            AI Analysis
          </span>
          {msgCount > 0 && (
            <span className="font-mono text-[8px] text-text-mute">
              ({msgCount} msg{msgCount !== 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {msgCount > 0 && (
            <button
              onClick={handleClearConversation}
              title="Clear conversation"
              className="p-1 text-text-mute hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
          <span className="font-mono text-[9px] px-1.5 py-0.5 border border-border-base text-accent-dim tracking-[0.04em] accent-glow">
            {modelLabel}
          </span>
        </div>
      </div>

      {/* ── Mode Grid ── */}
      <div className="grid grid-cols-2 gap-px bg-border-dim border-b border-border-base flex-shrink-0">
        {AI_MODES.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setAIMode(mode)}
            className={`
              px-2.5 py-1.5 bg-surface-panel
              font-mono text-[9px] tracking-[0.06em] uppercase text-left
              border-y-0 border-r-0 border-l-2 cursor-pointer transition-colors duration-100
              ${
                aiMode === mode
                  ? 'bg-surface-raised text-accent-primary border-l-accent-primary'
                  : 'text-text-mute border-l-transparent hover:bg-surface-hover hover:text-text-mid'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Active Context Indicator ── */}
      {(activeProjectId || persona.systemPrompt.trim() || activeSkillId) && (
        <div className="border-b border-border-base px-2.5 py-1.5 flex-shrink-0 bg-surface-surface">
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeProjectId && (() => {
              const p = projects.find((pr) => pr.id === activeProjectId);
              return p ? (
                <span className="font-mono text-[8px] px-1.5 py-0.5 border border-border-base text-text-dim bg-surface-panel rounded-[2px]">
                  Proj: {p.name}
                </span>
              ) : null;
            })()}
            {persona.systemPrompt.trim() && (
              <span className="font-mono text-[8px] px-1.5 py-0.5 border border-border-base text-text-dim bg-surface-panel rounded-[2px]">
                {persona.name || 'Persona'}: {persona.tone}
              </span>
            )}
            {activeSkillId && aiMode === 'skill' && (() => {
              const sk = skills.find((s) => s.id === activeSkillId);
              return sk ? (
                <span className="font-mono text-[8px] px-1.5 py-0.5 border border-accent-dim text-accent-dim bg-accent-glow rounded-[2px]">
                  Skill: {sk.name}
                </span>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* ── Skill Selector (collapsible, shown only when skill mode active) ── */}
      {aiMode === 'skill' && (
        <div className="border-b border-border-base flex-shrink-0">
          <div className="max-h-[150px] overflow-y-auto bg-surface-surface border border-border-base rounded-[2px] mx-1.5 my-1.5">
            {skills.length === 0 ? (
              <div className="px-2.5 py-2 font-mono text-[10px] text-text-mute italic">
                No skills loaded
              </div>
            ) : (
              skills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => setActiveSkill(skill.id)}
                  className={`
                    w-full text-left px-2.5 py-1.5 cursor-pointer transition-colors duration-100
                    border-l-2
                    ${
                      activeSkillId === skill.id
                        ? 'bg-surface-hover border-l-accent-primary text-accent-primary'
                        : 'border-l-transparent hover:bg-surface-hover'
                    }
                  `}
                >
                  <div className="font-mono text-[10px] font-bold leading-tight">
                    {skill.name}
                  </div>
                  <div className="font-mono text-[10px] text-text-mute leading-tight truncate mt-0.5">
                    {skill.description}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── AI Output ── */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 font-mono text-[11px] text-text-base"
      >
        {aiLoading && !aiOutput ? (
          <LoadingIndicator />
        ) : aiOutput ? (
          <div>
            {/* Output header */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="font-mono text-[9px] tracking-[0.10em] uppercase text-accent-dim flex-shrink-0">
                Output
              </span>
              <div className="flex-1 h-px bg-border-dim" />
              {/* Action buttons — only show when there's output */}
              {aiOutput && (
                <div className="flex items-center gap-1">
                  <button onClick={handleCopyOutput} title="Copy to clipboard" className="p-1 text-text-mute hover:text-text-mid transition-colors">
                    <ClipboardCopy size={12} />
                  </button>
                  <button onClick={handleAppendToFile} title="Append to active file" className="p-1 text-text-mute hover:text-text-mid transition-colors">
                    <FilePlus size={12} />
                  </button>
                  <button onClick={handleClearOutput} title="Clear output" className="p-1 text-text-mute hover:text-text-mid transition-colors">
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
            {/* Output text */}
            <div className="text-text-mid text-[11px] leading-[1.7] animate-fade-in">
              {renderOutput(aiOutput)}
            </div>
          </div>
        ) : (
          <p className="text-text-mute italic text-[10px] leading-[1.7] mt-1">
            Run an AI mode or type a prompt below
          </p>
        )}
      </div>

      {/* ── AI Input Zone ── */}
      <div className="border-t border-border-base flex-shrink-0 p-2.5 px-3 bg-surface-surface">
        {/* Prompt label */}
        <div className="font-mono text-[9px] tracking-[0.10em] uppercase text-text-mute mb-1">
          Prompt
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={aiPrompt}
          onChange={(e) => setAIPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the AI about this file…"
          disabled={aiLoading}
          spellCheck={true}
          rows={3}
          className="
            w-full px-2 py-1.5 border border-border-base bg-surface-panel text-text-base
            font-mono text-[11px] leading-[1.5] resize-none
            placeholder:text-text-mute
            outline-none focus:border-border-lit
            disabled:opacity-50 disabled:cursor-not-allowed
            min-h-[56px]
          "
        />

        {/* Footer row */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-mono text-[9px] text-text-mute">
            ⏎ send · ⇧⏎ nl · ⎋ clear
          </span>
          <button
            onClick={handleSubmit}
            disabled={aiLoading || isSubmitting}
            className="
              px-3 py-1 border border-accent-dim accent-glow text-accent-primary
              font-mono text-[10px] tracking-[0.06em] uppercase
              cursor-pointer transition-all duration-150
              hover:bg-accent-glow-strong hover:border-accent-primary
              hover:shadow-[0_0_8px_rgba(200,240,96,0.15)]
              disabled:opacity-40 disabled:cursor-not-allowed
              disabled:hover:bg-accent-glow disabled:hover:border-accent-dim disabled:hover:shadow-none
            "
          >
            Run →
          </button>
        </div>
      </div>
    </div>
  );
}

export default AIPanel;
