'use client';

import { useEffect, useState } from 'react';
import { Topbar } from '@/components/lumina/topbar';
import { Sidebar } from '@/components/lumina/sidebar';
import { Editor } from '@/components/lumina/editor';
import { AIPanel } from '@/components/lumina/ai-panel';
import { NewFileModal, DeleteConfirmModal, SettingsModal, RenameModal, ProjectModal } from '@/components/lumina/modals';
import { FileContextMenu } from '@/components/lumina/sidebar';
import { AboutTerminal } from '@/components/lumina/about-terminal';
import { useLuminaStore } from '@/store/use-lumina-store';
import { getAllFiles, getSettings, getAllSkills, getAllProjects, getPersona } from '@/lib/indexeddb';

// ─── Main Page ─────────────────────────────────────────────

export default function Home() {
  const sidebarOpen = useLuminaStore((s) => s.sidebarOpen);
  const aiPanelOpen = useLuminaStore((s) => s.aiPanelOpen);
  const fileToRename = useLuminaStore((s) => s.fileToRename);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load persisted data from IndexedDB on mount ──
  useEffect(() => {
    async function loadData() {
      try {
        const [files, settings, skills, projects, persona] = await Promise.all([
          getAllFiles(),
          getSettings(),
          getAllSkills(),
          getAllProjects(),
          getPersona(),
        ]);

        if (files.length > 0) {
          // Filter out closed files — workspace stays exactly as user left it
          const openFiles = files.filter((f) => !f.isClosed);
          useLuminaStore.getState().setFiles(openFiles);
        }

        if (settings) {
          useLuminaStore.getState().updateSettings(settings);
        }

        if (skills.length > 0) {
          useLuminaStore.getState().setSkills(skills);
        }

        if (projects.length > 0) {
          useLuminaStore.getState().setProjects(projects);
        }

        if (persona) {
          useLuminaStore.getState().setPersona(persona);
        }
      } catch (err) {
        console.error('Failed to load data from IndexedDB:', err);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    }

    loadData();
  }, []);

  // ── Loading State ──
  if (!mounted || loading) {
    return (
      <div className="flex h-screen w-screen bg-surface-void items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 bg-accent-dim rounded-full"
                style={{
                  animation: 'ledpulse 1.2s ease-in-out infinite',
                  animationDelay: `${i * 0.3}s`,
                }}
              />
            ))}
          </div>
          <span className="font-mono text-[10px] text-text-mute tracking-wide uppercase">
            Loading workspace…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-void">
      {/* ── Topbar ── */}
      <Topbar />

      {/* ── Main Content: Three-panel layout ── */}
      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <div className="flex-shrink-0">
            <Sidebar />
          </div>
        )}

        {/* ── Editor ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <Editor />
        </div>

        {/* ── AI Panel ── */}
        {aiPanelOpen && (
          <div className="flex-shrink-0">
            <AIPanel />
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <NewFileModal />
      <DeleteConfirmModal />
      <RenameModal key={fileToRename ?? '_'} fileId={fileToRename} />
      <SettingsModal />
      <ProjectModal />

      {/* ── Context Menu ── */}
      <FileContextMenu />

      {/* ── About Terminal (easter egg) ── */}
      <AboutTerminal />
    </div>
  );
}
