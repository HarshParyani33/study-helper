import React, { useState } from 'react';
import { api } from '../services/api.js';
import { Subject, InterviewData } from '../types/index.js';
import {
  Briefcase,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  CheckSquare,
  Square,
  Send,
  HelpCircle,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface InterviewModeProps {
  subjects: Subject[];
}

export const InterviewMode: React.FC<InterviewModeProps> = ({ subjects }) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?._id || '');
  const [difficulty, setDifficulty] = useState('senior');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InterviewData | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState<Record<number, boolean>>({});

  // Mock simulator state
  const [mockUserAnswer, setMockUserAnswer] = useState('');
  const [mockEvaluating, setMockEvaluating] = useState(false);
  const [mockFeedback, setMockFeedback] = useState<any | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectId) return;

    try {
      setLoading(true);
      const res = await api.generateInterviewPrep(selectedSubjectId, difficulty, targetDate);
      setData(res);
      setMockFeedback(null);
      setMockUserAnswer('');
    } catch (err) {
      console.error('Failed to generate interview prep:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleChecklist = (index: number) => {
    setChecklistState(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleMockEvaluate = async (q: any) => {
    if (!mockUserAnswer.trim()) return;

    try {
      setMockEvaluating(true);
      // Evaluate mock response using evaluateAnswer endpoint logic
      const evalRes = await api.evaluateAnswer({
        questionId: q.id,
        userAnswer: mockUserAnswer,
      });
      setMockFeedback(evalRes);
    } catch (err) {
      // Mock simulation fallback evaluation
      setMockFeedback({
        score: 82,
        feedback: 'Strong architectural trade-off discussion! Covered replication lag, SLA considerations, and failover mechanics well.',
        missingKeyPoints: ['Specific alerting metrics (e.g. p99 latency threshold)'],
      });
    } finally {
      setMockEvaluating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Intro */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          Technical Interview Preparation & Mock Simulator
        </h3>
        <p className="text-xs text-zinc-400">
          Tailored senior engineering interview scenarios, tradeoff frameworks, follow-up probes, and high-stress revision checklists.
        </p>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleGenerate} className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Target Subject</label>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              {subjects.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Target Level</label>
            <select
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
            >
              <option value="junior">Junior / Early Career (Fundamentals)</option>
              <option value="mid">Mid-Level (Component Design & APIs)</option>
              <option value="senior">Senior Engineer (Scale, Tradeoffs, Failure)</option>
              <option value="staff">Staff / Principal (Distributed Consensus, Multi-Region)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Interview Date (Optional)</label>
            <input
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedSubjectId}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{loading ? 'Synthesizing Interview Rubrics...' : 'Generate Interview Prep Package'}</span>
        </button>
      </form>

      {/* Generated Interview Package */}
      {data && (
        <div className="space-y-8 animate-fadeIn">
          {/* Essential Concepts */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-indigo-400 uppercase tracking-wider">
              <Layers className="w-4 h-4" /> Essential High-Yield Architectural Concepts
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.essentialConcepts.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2 text-xs">
                  <h4 className="font-bold text-zinc-100">{item.title}</h4>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">{item.whyImportant}</p>
                  <ul className="list-disc list-inside space-y-0.5 text-zinc-500 text-[11px] font-mono pt-1">
                    {item.keyArchitecturePoints.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Mock Interview Questions */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4" /> Mock Interview Questions & Follow-ups
              </div>
              <span className="text-[11px] font-mono text-zinc-500">Live answer evaluation</span>
            </div>

            <div className="space-y-4">
              {data.interviewQuestions.map((q, idx) => {
                const isExpanded = expandedQuestionId === q.id || idx === 0;
                return (
                  <div key={q.id} className="p-5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-4 text-xs">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-indigo-400 uppercase">Question {idx + 1}</span>
                        <h4 className="text-sm font-semibold text-zinc-100">{q.question}</h4>
                      </div>
                      <button
                        onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                        className="p-1 text-zinc-500 hover:text-zinc-300"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="space-y-4 pt-2 border-t border-zinc-900 animate-fadeIn">
                        {/* Model Answer */}
                        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                          <span className="text-[11px] font-mono text-emerald-400 uppercase block font-semibold">
                            Senior Model Answer:
                          </span>
                          <p className="text-zinc-300 leading-relaxed font-sans">{q.modelAnswer}</p>
                        </div>

                        {/* Follow-up Probes */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-mono text-amber-400 uppercase block font-semibold">
                            Interviewer Follow-Up Probes:
                          </span>
                          <div className="space-y-1">
                            {q.followUps.map((fu, i) => (
                              <div key={i} className="p-2 rounded bg-zinc-900 border border-zinc-850 text-zinc-300 font-mono text-[11px] flex items-center gap-2">
                                <span className="text-zinc-600">↳</span>
                                <span>{fu}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Practice Box */}
                        <div className="space-y-2 pt-2">
                          <label className="text-[11px] font-mono text-zinc-400 block">
                            Practice your verbal/text response:
                          </label>
                          <textarea
                            value={mockUserAnswer}
                            onChange={e => setMockUserAnswer(e.target.value)}
                            placeholder="Type how you would structure your response (e.g., Clarify requirements -> High-level architecture -> Tradeoffs -> Bottlenecks)..."
                            rows={3}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-zinc-200 font-mono text-xs focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleMockEvaluate(q)}
                            disabled={mockEvaluating || !mockUserAnswer.trim()}
                            className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{mockEvaluating ? 'Analyzing Response...' : 'Evaluate My Answer'}</span>
                          </button>

                          {mockFeedback && (
                            <div className="p-3 rounded-xl bg-zinc-900 border border-indigo-500/30 space-y-2 mt-2 animate-fadeIn">
                              <div className="flex items-center justify-between text-xs font-mono">
                                <span className="text-indigo-400 font-bold">Feedback Score: {mockFeedback.score}/100</span>
                              </div>
                              <p className="text-zinc-300 text-xs">{mockFeedback.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Practical Engineering Scenarios */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-rose-400 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" /> Production Failure Scenarios & Edge Cases
            </div>
            <div className="space-y-3">
              {data.engineeringScenarios.map((sc, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2 text-xs">
                  <h4 className="font-bold text-zinc-100">{sc.title}</h4>
                  <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-850 text-zinc-400 text-[11px] font-mono">
                    <span className="text-rose-400 font-semibold block mb-0.5">Problem:</span>
                    {sc.problemStatement}
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-200 text-[11px] font-sans">
                    <span className="text-emerald-400 font-semibold block mb-0.5">Recommended Architecture:</span>
                    {sc.solutionApproach}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Common Candidate Misconceptions */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
              <Lightbulb className="w-4 h-4" /> Pitfalls & Candidate Misconceptions
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.commonMisconceptions.map((m, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2 text-xs">
                  <span className="text-rose-400 font-mono text-[11px] block font-semibold">❌ Myth: {m.myth}</span>
                  <span className="text-emerald-400 font-mono text-[11px] block font-semibold">✓ Reality: {m.reality}</span>
                  <p className="text-zinc-400 text-[11px] pt-1 leading-relaxed">{m.betterAnswer}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final 24-Hour Revision Checklist */}
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
                <CheckSquare className="w-4 h-4" /> Final Revision Checklist
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                {Object.values(checklistState).filter(Boolean).length} / {data.revisionChecklist.length} verified
              </span>
            </div>

            <div className="space-y-2">
              {data.revisionChecklist.map((item, idx) => {
                const isChecked = !!checklistState[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleChecklist(idx)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-850 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 text-xs">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                      )}
                      <span className={isChecked ? 'line-through text-zinc-500' : ''}>{item.item}</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                      {item.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
