'use client';

import { Settings, PanelLeftClose, PanelLeft, PanelRightClose, PanelRight, FolderKanban, Download } from 'lucide-react';
import { useLuminaStore } from '@/store/use-lumina-store';
import { usePWA } from '@/hooks/use-pwa';

// ─── Topbar Component ───────────────────────────────────────

export function Topbar() {
  const sidebarOpen = useLuminaStore((s) => s.sidebarOpen);
  const aiPanelOpen = useLuminaStore((s) => s.aiPanelOpen);
  const toggleSidebar = useLuminaStore((s) => s.toggleSidebar);
  const toggleAIPanel = useLuminaStore((s) => s.toggleAIPanel);
  const setSettingsOpen = useLuminaStore((s) => s.setSettingsOpen);
  const settings = useLuminaStore((s) => s.settings);
  const files = useLuminaStore((s) => s.files);
  const projects = useLuminaStore((s) => s.projects);
  const activeProjectId = useLuminaStore((s) => s.activeProjectId);
  const setActiveProject = useLuminaStore((s) => s.setActiveProject);

  const { canInstall, promptInstall } = usePWA();

  const providerLabel = settings.provider === 'zai' ? 'Z.ai' : settings.provider === 'local' ? 'Local' : 'Cloud';
  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null;

  return (
    <header className="h-9 border-b border-border-base bg-surface-panel flex items-center justify-between px-3.5 shrink-0">
      {/* ── Left: App ID + Name ── */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleSidebar}
          className="p-1 text-text-mute hover:text-text-mid transition-colors cursor-pointer"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} />}
        </button>

        <span className="font-mono text-[11px] font-semibold tracking-[0.12em] uppercase text-accent-primary">
          LXT
        </span>
        <div className="w-px h-3.5 bg-border-base" />
        <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-text-mid">
          Lumina TXT
        </span>
      </div>

      {/* ── Center: Active Project (if any) ── */}
      {activeProject && (
        <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
          <FolderKanban size={10} className="text-accent-dim" />
          <span className="font-mono text-[10px] text-accent-primary tracking-[0.04em]">
            {activeProject.name}
          </span>
        </div>
      )}

      {/* ── Right: Status + Actions ── */}
      <div className="flex items-center gap-2">
        {/* Status LED */}
        <div className="status-led" />
        <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-text-dim">
          {providerLabel} · {files.length} file{files.length !== 1 ? 's' : ''}
        </span>

        <div className="w-px h-3.5 bg-border-base mx-1" />

        {/* Tags */}
        <span className="tag-badge">AI-ready</span>

        {/* Install PWA button — only shows when browser supports it */}
        {canInstall && (
          <button
            onClick={promptInstall}
            className="p-1 text-text-mute hover:text-accent-primary transition-colors cursor-pointer"
            title="Install Lumina TXT as app"
          >
            <Download size={12} />
          </button>
        )}

        <div className="w-px h-3.5 bg-border-base mx-1" />

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1 text-text-mute hover:text-text-mid transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings size={13} />
        </button>

        {/* AI Panel Toggle */}
        <button
          onClick={toggleAIPanel}
          className="p-1 text-text-mute hover:text-text-mid transition-colors cursor-pointer"
          title={aiPanelOpen ? 'Hide AI panel' : 'Show AI panel'}
        >
          {aiPanelOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
        </button>
      </div>
    </header>
  );
}
