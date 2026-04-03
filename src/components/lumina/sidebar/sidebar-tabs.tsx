'use client';

import { useLuminaStore, type SidebarTab } from '@/store/use-lumina-store';

// ─── Tab Configuration ──────────────────────────────────────

const tabs: { id: SidebarTab; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'tree', label: 'File Tree' },
  { id: 'skills', label: 'Skills' },
];

// ─── Sidebar Tabs Component ─────────────────────────────────

export function SidebarTabs() {
  const sidebarTab = useLuminaStore((s) => s.sidebarTab);
  const setSidebarTab = useLuminaStore((s) => s.setSidebarTab);

  return (
    <div className="w-full h-7 flex flex-row bg-surface-panel border-b border-border-base shrink-0">
      {tabs.map((tab) => {
        const isActive = sidebarTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={[
              'flex-1 text-center py-1.5 cursor-pointer',
              'font-mono text-[9px] tracking-[0.06em] uppercase',
              'border-b-2 transition-colors duration-100',
              isActive
                ? 'text-text-bright border-accent-primary'
                : 'text-text-dim border-transparent hover:bg-surface-hover',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
