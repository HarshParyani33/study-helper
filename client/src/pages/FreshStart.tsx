import React, { useState } from 'react';
import { api } from '../services/api.js';
import { Subject, FreshStartData } from '../types/index.js';
import {
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Eye,
  Layers,
  Calendar,
} from 'lucide-react';

interface FreshStartProps {
  subjects: Subject[];
  onNavigateToRecall: () => void;
}

export const FreshStart: React.FC<FreshStartProps> = ({ subjects, onNavigateToRecall }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?._id || '');
  const [inactivityDuration, setInactivityDuration] = useState('30 days');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FreshStartData | null>(null);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<Record<string, string>>({});
  const [revealedDiagnostics, setRevealedDiagnostics] = useState<Record<string, boolean>>({});

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    try {
      setLoading(true);
      const res = await api.generateFreshStart(selectedSubjectId, inactivityDuration);
      setData(res);
      setDiagnosticAnswers({});
      setRevealedDiagnostics({});
    } catch (err) {
      console.error('Failed to generate fresh start:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiagnosticReveal = (qId: string) => {
    setRevealedDiagnostics(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Intro Brief */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-emerald-400" />
          Fresh Start Recovery Engine
        </h3>
        <p className="text-xs text-zinc-400">
          Returning to a subject after weeks or months away? Avoid passive note re-reading. Get a synthesized subject overview, baseline diagnostics, and a 3-stage targeted sprint.
        </p>
      </div>

      {/* Generator Control Card */}
      <form onSubmit={handleGenerate} className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Select Subject to Recover</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              {subjects.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.conceptCount || 0} concepts)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Duration of Inactivity</label>
            <select
              value={inactivityDuration}
              onChange={e => setInactivityDuration(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
            >
              <option value="14 days">2 Weeks (Minor memory decay)</option>
              <option value="30 days">1 Month (Moderate decay)</option>
              <option value="60 days">2 Months (Significant decay)</option>
              <option value="90 days">3+ Months (Structural recovery)</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedSubjectId}
          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Synthesizing Recovery Plan...' : 'Generate Personalized Recovery Sprint'}</span>
        </button>
      </form>

      {/* Fresh Start Plan Output */}
      {data && (
        <div className="space-y-8 animate-fadeIn">
          {/* Section 1: Condensed Subject Overview */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
              <Layers className="w-4 h-4" /> Condensed Architectural Overview
            </div>
            <h4 className="text-base font-bold text-zinc-100">{data.subjectName}</h4>
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-sans">
              {data.overview}
            </p>
          </div>

          {/* Section 2: Identified Weak Areas & Foundational Bottlenecks */}
          {data.identifiedWeakAreas.length > 0 && (
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" /> High-Risk Regression Areas
              </div>
              <p className="text-xs text-zinc-400">
                These concepts carry high complexity or dependency centrality and are the primary causes of mental friction after {data.inactivityDuration}.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {data.identifiedWeakAreas.map((w, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-zinc-200">{w.conceptTitle}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {w.urgency.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">{w.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Baseline Diagnostic Questions */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4" /> Baseline Diagnostic Check ({data.diagnosticQuestions.length} Questions)
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Measure baseline recall</span>
            </div>

            <div className="space-y-4">
              {data.diagnosticQuestions.map(q => {
                const isRevealed = revealedDiagnostics[q.questionId];
                return (
                  <div key={q.questionId} className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-3 text-xs">
                    <div className="flex items-center justify-between text-zinc-500 font-mono text-[11px]">
                      <span>Concept: {q.conceptTitle}</span>
                      <span>{q.questionId}</span>
                    </div>
                    <p className="font-medium text-zinc-200">{q.question}</p>

                    <input
                      type="text"
                      placeholder="Type your quick baseline response..."
                      value={diagnosticAnswers[q.questionId] || ''}
                      onChange={e => setDiagnosticAnswers({ ...diagnosticAnswers, [q.questionId]: e.target.value })}
                      disabled={isRevealed}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => toggleDiagnosticReveal(q.questionId)}
                        className="text-[11px] font-mono text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        {isRevealed ? 'Hide Expected Answer' : 'Check Expected Answer'}
                      </button>
                    </div>

                    {isRevealed && (
                      <div className="p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] text-zinc-300 font-sans leading-relaxed animate-fadeIn">
                        <span className="font-bold text-emerald-400 block mb-0.5">Expected Baseline:</span>
                        {q.expectedAnswer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Prioritized Recovery Plan (3 Stages) */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
              <Calendar className="w-4 h-4" /> Prioritized Recovery Roadmap
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data.prioritizedRecoveryPlan.map((stage, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ~{stage.estimatedMinutes} mins
                    </span>
                    <h5 className="text-xs font-bold text-zinc-200">{stage.stage}</h5>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{stage.focus}</p>
                  </div>

                  <div className="pt-2 border-t border-zinc-900">
                    <span className="text-[10px] font-mono text-zinc-500 block mb-1">Target Concepts:</span>
                    <div className="flex flex-wrap gap-1">
                      {stage.concepts.map((c, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-850 text-zinc-300 font-mono">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Trigger */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-zinc-900 border border-emerald-500/30 flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-100">Ready to begin Stage 1 Recovery?</h4>
              <p className="text-xs text-zinc-400">Launch a targeted Daily Recall session focusing on due and weak items.</p>
            </div>
            <button
              onClick={onNavigateToRecall}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-md transition-all"
            >
              <span>Begin Recall Sprint</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
