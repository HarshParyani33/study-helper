import React from 'react';
import { PageId } from './Sidebar.js';
import { Brain, PlusCircle, RefreshCw } from 'lucide-react';
import { Subject } from '../types/index.js';

interface HeaderProps {
  currentPage: PageId;
  subjects: Subject[];
  selectedSubjectId: string;
  onSelectSubject: (id: string) => void;
  onNavigate: (page: PageId) => void;
  dueCount?: number;
  onRefresh?: () => void;
}

const PAGE_META: Record<PageId, { title: string; description: string }> = {
  dashboard: {
    title: 'Knowledge Overview',
    description: 'Autonomous spaced repetition tracking and subject health.',
  },
  planner: {
    title: 'Study Planner',
    description: 'Shared 10-day preparation roadmap with dual-profile tracking, timetable, and DSA matrix.',
  },
  recall: {
    title: 'Daily Recall Session',
    description: 'Active retrieval flashcards with AI answer analysis and FSRS scheduling.',
  },
  surprise: {
    title: 'Surprise Recall Drill',
    description: 'Cross-topic retrieval targeting forgotten or foundational concepts.',
  },
  ingest: {
    title: 'Ingestion Studio',
    description: 'Extract concepts, deduplicate, enrich knowledge, and generate recall questions.',
  },
  graph: {
    title: 'Interactive Knowledge Graph',
    description: 'Explore concept dependencies, prerequisites, and retention states.',
  },
  concepts: {
    title: 'Concept Library',
    description: 'Search, filter, and inspect structured concepts across subjects.',
  },
  'fresh-start': {
    title: 'Fresh Start Recovery',
    description: 'Condensed recovery session and diagnostics after a learning break.',
  },
  interview: {
    title: 'Technical Interview Mode',
    description: 'High-signal architectural questions, scenario drills, and revision checklists.',
  },
  analytics: {
    title: 'Learning Analytics',
    description: 'Long-term retention curves, review volume, and stability distribution.',
  },
  settings: {
    title: 'Settings & Backups',
    description: 'Database snapshot exports, restorations, and system status.',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  subjects,
  selectedSubjectId,
  onSelectSubject,
  onNavigate,
  dueCount = 0,
  onRefresh,
}) => {
  const meta = PAGE_META[currentPage] || { title: 'Personal Learning OS', description: '' };

  return (
    <header className="h-16 px-8 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-base font-semibold text-zinc-100">{meta.title}</h2>
        <p className="text-xs text-zinc-500">{meta.description}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Subject filter for pages that support it */}
        {['graph', 'concepts', 'recall', 'fresh-start', 'interview'].includes(currentPage) && (
          <select
            value={selectedSubjectId}
            onChange={e => onSelectSubject(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-mono"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded-lg transition-colors border border-zinc-800/60"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        {currentPage !== 'ingest' && (
          <button
            onClick={() => onNavigate('ingest')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ingest Notes</span>
          </button>
        )}

        {currentPage !== 'recall' && dueCount > 0 && (
          <button
            onClick={() => onNavigate('recall')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors shadow-sm"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Review {dueCount} Due</span>
          </button>
        )}
      </div>
    </header>
  );
};
