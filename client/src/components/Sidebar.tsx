import React from 'react';
import {
  LayoutDashboard,
  Brain,
  UploadCloud,
  Network,
  BookOpen,
  RotateCcw,
  Briefcase,
  Shuffle,
  BarChart3,
  Database,
  ChevronRight,
  Layers,
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'recall'
  | 'ingest'
  | 'graph'
  | 'concepts'
  | 'fresh-start'
  | 'interview'
  | 'surprise'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  dueCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, dueCount = 0 }) => {
  const navItems: { id: PageId; label: string; icon: any; badge?: number; group?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recall', label: 'Daily Recall', icon: Brain, badge: dueCount },
    { id: 'surprise', label: 'Surprise Recall', icon: Shuffle },
    { id: 'ingest', label: 'Ingestion Studio', icon: UploadCloud },
    { id: 'graph', label: 'Knowledge Graph', icon: Network },
    { id: 'concepts', label: 'Concept Library', icon: BookOpen },
    { id: 'fresh-start', label: 'Fresh Start', icon: RotateCcw },
    { id: 'interview', label: 'Interview Mode', icon: Briefcase },
    { id: 'analytics', label: 'Learning History', icon: BarChart3 },
    { id: 'settings', label: 'Settings & Backup', icon: Database },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-zinc-950 border-r border-zinc-900 flex flex-col h-screen select-none">
      {/* Brand */}
      <div className="p-5 border-b border-zinc-900 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-zinc-950 font-bold shadow-lg shadow-emerald-500/10">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5">
            Learning OS
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-zinc-500">Autonomous Knowledge</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-zinc-600">
          Core Workflows
        </div>
        {navItems.slice(0, 4).map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800/90 text-emerald-400 border border-zinc-700/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-5 px-3 pb-2 text-[11px] font-mono uppercase tracking-wider text-zinc-600">
          Exploration & Mastery
        </div>
        {navItems.slice(4).map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-zinc-800/90 text-emerald-400 border border-zinc-700/60 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950/60">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            FSRS 4.5 Engine
          </span>
          <span className="font-mono text-[11px] text-zinc-600">Localhost</span>
        </div>
      </div>
    </aside>
  );
};
