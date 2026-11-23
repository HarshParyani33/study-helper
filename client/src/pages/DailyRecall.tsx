import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Question, AnswerEvaluation } from '../types/index.js';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Eye,
  Send,
  HelpCircle,
  Clock,
  Layers,
} from 'lucide-react';

interface DailyRecallProps {
  subjectId?: string;
  onFinished: () => void;
}

export const DailyRecall: React.FC<DailyRecallProps> = ({ subjectId, onFinished }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [sessionStats, setSessionStats] = useState<{ reviewed: number; again: number; good: number }>({
    reviewed: 0,
    again: 0,
    good: 0,
  });

  useEffect(() => {
    loadDueQuestions();
  }, [subjectId]);

  const loadDueQuestions = async () => {
    try {
      setLoading(true);
      const data = await api.getDueQuestions(subjectId);
      setQuestions(data);
      setCurrentIndex(0);
      resetCardState();
    } catch (err) {
      console.error('Failed to load due questions:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetCardState = () => {
    setUserAnswer('');
    setShowAnswer(false);
    setEvaluation(null);
    setStartTime(Date.now());
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Only trigger submit rating if answer is already shown
        if (!showAnswer) return;
      }

      if (e.key === ' ' && !showAnswer) {
        setShowAnswer(true);
      } else if (showAnswer && !submitting) {
        if (e.key === '1') handleRating(1);
        if (e.key === '2') handleRating(2);
        if (e.key === '3') handleRating(3);
        if (e.key === '4') handleRating(4);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAnswer, submitting, currentIndex, questions]);

  const handleEvaluateAI = async () => {
    const currentQ = questions[currentIndex];
    if (!currentQ || !userAnswer.trim()) return;

    try {
      setEvaluating(true);
      const evalResult = await api.evaluateAnswer({
        questionId: currentQ._id,
        userAnswer: userAnswer.trim(),
      });
      setEvaluation(evalResult);
      setShowAnswer(true);
    } catch (err: any) {
      console.error('Evaluation failed:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleRating = async (rating: number) => {
    const currentQ = questions[currentIndex];
    if (!currentQ || submitting) return;

    try {
      setSubmitting(true);
      const elapsedMs = Date.now() - startTime;

      await api.submitReview({
        questionId: currentQ._id,
        rating,
        userAnswer,
        evaluation: evaluation ? evaluation.feedback : '',
        elapsedMs,
      });

      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        again: rating === 1 ? prev.again + 1 : prev.again,
        good: rating >= 3 ? prev.good + 1 : prev.good,
      }));

      // Move to next card or finish
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        resetCardState();
      } else {
        // Queue completed
        setQuestions([]);
      }
    } catch (err: any) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-zinc-500">Retrieving spaced repetition queue...</p>
        </div>
      </div>
    );
  }

  // Queue Empty State
  if (questions.length === 0 || currentIndex >= questions.length) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-6 pt-16 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-zinc-100">Recall Queue Completed!</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            You've reviewed all cards due for today. The FSRS engine has recalibrated next review intervals for optimal memory stability.
          </p>
        </div>

        {sessionStats.reviewed > 0 && (
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-around font-mono text-xs">
            <div>
              <span className="text-zinc-500 block">Reviewed</span>
              <span className="text-zinc-100 font-bold text-base">{sessionStats.reviewed}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Good / Easy</span>
              <span className="text-emerald-400 font-bold text-base">{sessionStats.good}</span>
            </div>
            <div>
              <span className="text-zinc-500 block">Again (Lapses)</span>
              <span className="text-amber-400 font-bold text-base">{sessionStats.again}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={onFinished}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const concept = typeof currentQ.conceptId === 'object' ? currentQ.conceptId : null;
  const subjectName = typeof currentQ.subjectId === 'object' ? currentQ.subjectId.name : 'Subject';
  const progressPercent = Math.round(((currentIndex) / questions.length) * 100);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Progress Bar & Badge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              {subjectName}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="uppercase text-[11px] font-semibold text-emerald-400">
              {currentQ.type}
            </span>
          </div>
          <span>
            Card {currentIndex + 1} of {questions.length}
          </span>
        </div>

        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Main Flashcard Container */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-2xl relative space-y-6">
        {/* Concept Title & Difficulty */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h4 className="text-xs font-mono text-zinc-500 uppercase">Concept</h4>
            <h3 className="text-base font-semibold text-zinc-200">
              {concept ? concept.title : 'Concept Drill'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
              currentQ.difficulty === 'hard'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                : currentQ.difficulty === 'easy'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {currentQ.difficulty.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Question Front */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
            Active Retrieval Question:
          </span>
          <p className="text-lg font-medium text-zinc-100 leading-relaxed">
            {currentQ.front}
          </p>
        </div>

        {/* Active Free-Text Recall Area */}
        <div className="space-y-3 pt-2">
          <label className="text-xs text-zinc-400 flex items-center justify-between">
            <span>Your Explanation (Free-text active recall):</span>
            <span className="text-[11px] font-mono text-zinc-500">Test intuition before revealing</span>
          </label>
          <textarea
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            disabled={showAnswer}
            placeholder="Type your explanation here in your own words..."
            rows={3}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/80 font-mono transition-colors"
          />

          {/* Reveal or AI Evaluate Controls */}
          {!showAnswer && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setShowAnswer(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span>Show Model Answer [Space]</span>
              </button>

              <button
                onClick={handleEvaluateAI}
                disabled={evaluating || !userAnswer.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium border border-emerald-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{evaluating ? 'Evaluating...' : 'AI Evaluation & Score'}</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Evaluation Box (if generated) */}
        {evaluation && (
          <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Sparkles className="w-4 h-4" /> AI Recall Feedback
              </span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                Score: {evaluation.score}/100
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{evaluation.feedback}</p>
            {evaluation.missingKeyPoints.length > 0 && (
              <div className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <span className="font-semibold block mb-1">Key Nuances Missed:</span>
                <ul className="list-disc list-inside space-y-0.5 text-zinc-400">
                  {evaluation.missingKeyPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Model Answer & Criteria (Revealed) */}
        {showAnswer && (
          <div className="space-y-4 pt-4 border-t border-zinc-800 animate-fadeIn">
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                Model Architecture / Answer:
              </span>
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-sm text-zinc-200 leading-relaxed whitespace-pre-line font-sans">
                {currentQ.back}
              </div>
            </div>

            {/* Evaluation Criteria Checklist */}
            {currentQ.evaluationCriteria && currentQ.evaluationCriteria.length > 0 && (
              <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-900 space-y-2">
                <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  Evaluation Checkpoints:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-zinc-400">
                  {currentQ.evaluationCriteria.map((crit, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                      <span>{crit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FSRS Rating Buttons */}
            <div className="space-y-2 pt-2">
              <span className="text-xs text-zinc-400 block text-center">
                Rate your active recall to calibrate the FSRS spaced repetition interval:
              </span>
              <div className="grid grid-cols-4 gap-3 pt-1">
                <button
                  onClick={() => handleRating(1)}
                  disabled={submitting}
                  className="p-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-medium text-xs transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="font-bold">Again [1]</span>
                  <span className="text-[10px] text-zinc-500 font-mono group-hover:text-rose-300">
                    &lt; 10m
                  </span>
                </button>

                <button
                  onClick={() => handleRating(2)}
                  disabled={submitting}
                  className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium text-xs transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="font-bold">Hard [2]</span>
                  <span className="text-[10px] text-zinc-500 font-mono group-hover:text-amber-300">
                    2 - 3d
                  </span>
                </button>

                <button
                  onClick={() => handleRating(3)}
                  disabled={submitting}
                  className="p-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium text-xs transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="font-bold">Good [3]</span>
                  <span className="text-[10px] text-zinc-500 font-mono group-hover:text-emerald-300">
                    5 - 7d
                  </span>
                </button>

                <button
                  onClick={() => handleRating(4)}
                  disabled={submitting}
                  className="p-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-400 font-medium text-xs transition-all flex flex-col items-center gap-1 group"
                >
                  <span className="font-bold">Easy [4]</span>
                  <span className="text-[10px] text-zinc-500 font-mono group-hover:text-teal-300">
                    12 - 18d
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
