import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Concept, Subject, Question } from '../types/index.js';
import {
  BookOpen,
  Search,
  Filter,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Plus,
  Trash2,
  Brain,
} from 'lucide-react';

interface ConceptLibraryProps {
  initialSubjectId?: string;
  subjects: Subject[];
  onNavigateToRecall: () => void;
}

export const ConceptLibrary: React.FC<ConceptLibraryProps> = ({
  initialSubjectId = '',
  subjects,
  onNavigateToRecall,
}) => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectId, setSubjectId] = useState(initialSubjectId);
  const [importance, setImportance] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeConceptQuestions, setActiveConceptQuestions] = useState<Question[]>([]);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState<string | null>(null);
  const [newQuestionFront, setNewQuestionFront] = useState('');
  const [newQuestionBack, setNewQuestionBack] = useState('');
  const [newQuestionType, setNewQuestionType] = useState('recall');

  useEffect(() => {
    loadConcepts();
  }, [subjectId, importance, difficulty]);

  const loadConcepts = async () => {
    try {
      setLoading(true);
      const data = await api.getConcepts({
        subjectId: subjectId || undefined,
        importance: importance || undefined,
        difficulty: difficulty || undefined,
        search: search.trim() || undefined,
      });
      setConcepts(data);
    } catch (err) {
      console.error('Failed to load concepts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadConcepts();
  };

  const toggleExpand = async (c: Concept) => {
    if (expandedId === c._id) {
      setExpandedId(null);
      setActiveConceptQuestions([]);
    } else {
      setExpandedId(c._id);
      try {
        const full = await api.getConceptByIdOrSlug(c._id);
        setActiveConceptQuestions(full.questions || []);
      } catch (err) {
        console.error('Failed to load concept details:', err);
      }
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddQuestionModal || !newQuestionFront.trim() || !newQuestionBack.trim()) return;

    try {
      const q = await api.addQuestionToConcept(showAddQuestionModal, {
        front: newQuestionFront.trim(),
        back: newQuestionBack.trim(),
        type: newQuestionType as any,
      });
      setActiveConceptQuestions(prev => [q, ...prev]);
      setShowAddQuestionModal(null);
      setNewQuestionFront('');
      setNewQuestionBack('');
    } catch (err) {
      console.error('Failed to add question:', err);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Search and Filters Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search concepts by title, keywords, or explanations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium border border-zinc-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500 font-mono">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={subjectId}
            onChange={e => setSubjectId(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Subjects</option>
            {subjects.map(s => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={importance}
            onChange={e => setImportance(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="">Any Importance</option>
            <option value="high">High Importance</option>
            <option value="medium">Medium Importance</option>
            <option value="low">Low Importance</option>
          </select>

          <select
            value={difficulty}
            onChange={e => setDifficulty(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
          >
            <option value="">Any Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          <span className="ml-auto font-mono text-zinc-500 text-[11px]">
            {concepts.length} concept{concepts.length === 1 ? '' : 's'} found
          </span>
        </div>
      </div>

      {/* Concept Cards List */}
      {loading ? (
        <div className="p-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      ) : concepts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/20 border border-zinc-800/80 text-zinc-500 text-xs">
          No concepts matched your filter. Try adjusting your search or ingest new learning material.
        </div>
      ) : (
        <div className="space-y-3">
          {concepts.map(c => {
            const isExpanded = expandedId === c._id;
            const subjectLabel = typeof c.subjectId === 'object' ? c.subjectId.name : 'General';

            return (
              <div
                key={c._id}
                className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                        {subjectLabel}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        c.importance === 'high'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {c.importance.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                        {c.difficulty}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-zinc-100">{c.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl line-clamp-2">
                      {c.explanation}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {c.dueQuestionCount !== undefined && c.dueQuestionCount > 0 && (
                      <span className="text-[11px] font-mono px-2 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {c.dueQuestionCount} Due
                      </span>
                    )}
                    <button
                      onClick={() => toggleExpand(c)}
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      title={isExpanded ? 'Collapse' : 'Expand Details'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="pt-4 border-t border-zinc-800/80 space-y-4 animate-fadeIn">
                    {/* Practical Example */}
                    {c.practicalExample && (
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-850 space-y-1">
                        <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 uppercase font-medium">
                          <Lightbulb className="w-3.5 h-3.5" /> Production Application / Example
                        </span>
                        <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                          {c.practicalExample}
                        </p>
                      </div>
                    )}

                    {/* Common Mistakes */}
                    {c.commonMistakes && c.commonMistakes.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-850 space-y-1.5">
                        <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5 uppercase font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> Common Anti-Patterns & Misconceptions
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-xs text-zinc-400">
                          {c.commonMistakes.map((m, idx) => (
                            <li key={idx}>{m}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Prerequisites & Related */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-850">
                        <span className="text-zinc-500 block mb-1">Prerequisites:</span>
                        {c.prerequisites && c.prerequisites.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.prerequisites.map((p, i) => (
                              <span key={i} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-600">None (Foundational)</span>
                        )}
                      </div>

                      <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-850">
                        <span className="text-zinc-500 block mb-1">Related Concepts:</span>
                        {c.relatedConcepts && c.relatedConcepts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {c.relatedConcepts.map((r, i) => (
                              <span key={i} className="px-2 py-0.5 bg-zinc-800 text-emerald-400/90 rounded">
                                {r}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-zinc-600">None listed</span>
                        )}
                      </div>
                    </div>

                    {/* Active Questions for Concept */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                          Spaced Repetition Questions ({activeConceptQuestions.length})
                        </h4>
                        <button
                          onClick={() => setShowAddQuestionModal(c._id)}
                          className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-mono"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Question
                        </button>
                      </div>

                      <div className="space-y-2">
                        {activeConceptQuestions.map((q, idx) => (
                          <div key={q._id || idx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-zinc-500 font-mono text-[11px]">
                              <span className="text-emerald-400 uppercase">{q.type}</span>
                              <span>Due: {new Date(q.nextReviewAt).toLocaleDateString()}</span>
                            </div>
                            <p className="font-medium text-zinc-200">{q.front}</p>
                            <p className="text-zinc-400 font-mono text-[11px] pt-1">{q.back}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Question Modal */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl animate-fadeIn">
            <h4 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-400" /> Add Custom Recall Question
            </h4>

            <form onSubmit={handleAddQuestion} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400">Question Prompt (Front):</label>
                <textarea
                  value={newQuestionFront}
                  onChange={e => setNewQuestionFront(e.target.value)}
                  placeholder="e.g. Under what network partition conditions does CAP theorem mandate consistency sacrifice?"
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Model Answer (Back):</label>
                <textarea
                  value={newQuestionBack}
                  onChange={e => setNewQuestionBack(e.target.value)}
                  placeholder="Accurate, concise model answer..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Question Type:</label>
                <select
                  value={newQuestionType}
                  onChange={e => setNewQuestionType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-zinc-300 font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="recall">Recall</option>
                  <option value="explanation">Explanation</option>
                  <option value="comparison">Comparison</option>
                  <option value="interview">Interview</option>
                  <option value="scenario">Scenario</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-lg shadow-md"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
