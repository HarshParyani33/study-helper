import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { Question, AnswerEvaluation } from '../types/index.js';
import {
  Shuffle,
  Brain,
  CheckCircle2,
  Sparkles,
  Eye,
  RotateCcw,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface SurpriseRecallProps {
  onFinished: () => void;
}

export const SurpriseRecall: React.FC<SurpriseRecallProps> = ({ onFinished }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSurpriseBatch();
  }, []);

  const loadSurpriseBatch = async () => {
    try {
      setLoading(true);
      const data = await api.getSurpriseRecall(8);
      setQuestions(data);
      setCurrentIndex(0);
      resetCard();
    } catch (err) {
      console.error('Failed to load surprise recall:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetCard = () => {
    setUserAnswer('');
    setShowAnswer(false);
    setEvaluation(null);
  };

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
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setEvaluating(false);
    }
  };

  const handleRating = async (rating: number) => {
    const currentQ = questions[currentIndex];
    if (!currentQ || submitting) return;

    try {
      setSubmitting(true);
      await api.submitReview({
        questionId: currentQ._id,
        rating,
        userAnswer,
        evaluation: evaluation ? evaluation.feedback : '',
      });

      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(prev => prev + 1);
        resetCard();
      } else {
        setQuestions([]);
      }
    } catch (err) {
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
          <p className="text-xs font-mono text-zinc-500">Selecting high-yield surprise concepts across subjects...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-6 pt-16 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center mx-auto text-teal-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-zinc-100">Surprise Drill Complete!</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Cross-subject drill completed! You tested recall across multiple subject domains to prevent cognitive compartmentalization.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={loadSurpriseBatch}
            className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl border border-zinc-700"
          >
            Another Drill
          </button>
          <button
            onClick={onFinished}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-xs rounded-xl shadow-md"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const concept = typeof currentQ.conceptId === 'object' ? currentQ.conceptId : null;
  const subjectName = typeof currentQ.subjectId === 'object' ? currentQ.subjectId.name : 'Cross-Topic';

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
        <div className="flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-teal-400" />
          <span className="text-zinc-200 font-semibold">{subjectName}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-teal-400 uppercase">Surprise Recall</span>
        </div>
        <span>
          {currentIndex + 1} of {questions.length}
        </span>
      </div>

      {/* Flashcard */}
      <div className="p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800 shadow-2xl space-y-6">
        <div>
          <span className="text-[10px] font-mono text-zinc-500 uppercase">Cross-Subject Concept:</span>
          <h3 className="text-base font-semibold text-zinc-200">{concept ? concept.title : 'Concept Drill'}</h3>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Question:</span>
          <p className="text-lg font-medium text-zinc-100 leading-relaxed">{currentQ.front}</p>
        </div>

        {/* Free text answer */}
        <div className="space-y-3">
          <textarea
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            disabled={showAnswer}
            placeholder="Type your explanation here..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-teal-500"
          />

          {!showAnswer && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setShowAnswer(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium border border-zinc-700"
              >
                <Eye className="w-3.5 h-3.5 text-zinc-400" />
                <span>Show Model Answer</span>
              </button>

              <button
                onClick={handleEvaluateAI}
                disabled={evaluating || !userAnswer.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 rounded-lg text-xs font-medium border border-teal-500/30 disabled:opacity-40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{evaluating ? 'Evaluating...' : 'AI Evaluate'}</span>
              </button>
            </div>
          )}
        </div>

        {/* AI Feedback */}
        {evaluation && (
          <div className="p-4 rounded-xl bg-zinc-950 border border-teal-500/40 space-y-2 animate-fadeIn text-xs">
            <div className="flex items-center justify-between font-mono">
              <span className="text-teal-400 font-semibold">AI Feedback Score:</span>
              <span className="text-emerald-400 font-bold">{evaluation.score}/100</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">{evaluation.feedback}</p>
          </div>
        )}

        {/* Revealed Answer & Ratings */}
        {showAnswer && (
          <div className="space-y-4 pt-4 border-t border-zinc-800 animate-fadeIn">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-teal-400 uppercase">Model Answer:</span>
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 leading-relaxed font-sans">
                {currentQ.back}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-2">
              <button
                onClick={() => handleRating(1)}
                className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold"
              >
                Again [1]
              </button>
              <button
                onClick={() => handleRating(2)}
                className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold"
              >
                Hard [2]
              </button>
              <button
                onClick={() => handleRating(3)}
                className="p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold"
              >
                Good [3]
              </button>
              <button
                onClick={() => handleRating(4)}
                className="p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold"
              >
                Easy [4]
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
