import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { DashboardSummary, Subject } from '../types/index.js';
import { PageId } from '../components/Sidebar.js';
import {
  Brain,
  BookOpen,
  Sparkles,
  Award,
  Layers,
  ArrowRight,
  TrendingUp,
  RotateCcw,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

interface DashboardProps {
  onNavigate: (page: PageId, subjectId?: string) => void;
  onRefreshDue: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onRefreshDue }) => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await api.getDashboardSummary();
      setData(summary);
      onRefreshDue();
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-xs font-mono text-zinc-500">Loading learning state...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="p-6 rounded-xl border border-red-900/50 bg-red-950/20 text-red-200">
          <div className="flex items-center gap-2 font-semibold mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            Unable to connect to backend
          </div>
          <p className="text-xs text-red-300/80 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-red-900/40 hover:bg-red-800/40 rounded-lg text-xs font-medium border border-red-800 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { metrics, subjectBreakdown, recentReviews, ratingDistribution } = data;

  // Rating labels mapping
  const ratingLabels: Record<number, string> = {
    1: 'Again',
    2: 'Hard',
    3: 'Good',
    4: 'Easy',
  };

  const chartRatingData = [1, 2, 3, 4].map(rating => {
    const item = ratingDistribution.find(r => r._id === rating);
    return {
      name: ratingLabels[rating],
      count: item ? item.count : 0,
    };
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Due Recall Banner */}
      {metrics.dueQuestions > 0 ? (
        <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/80 to-zinc-900/50 border border-emerald-500/30 shadow-xl shadow-emerald-950/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                ACTIVE RECALL QUEUE
              </div>
              <h3 className="text-xl font-bold text-zinc-100">
                You have {metrics.dueQuestions} concept{metrics.dueQuestions === 1 ? '' : 's'} due for review today.
              </h3>
              <p className="text-xs text-zinc-400 max-w-xl">
                The FSRS algorithm has scheduled these items to strengthen long-term memory stability before decay sets in.
              </p>
            </div>
            <button
              onClick={() => onNavigate('recall')}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02]"
            >
              <Brain className="w-4 h-4" />
              <span>Start Recall Session</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-zinc-200">Daily Queue Clear</h4>
              <p className="text-xs text-zinc-500">All current reviews are up to date! Great job maintaining your retention schedule.</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('surprise')}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition-colors"
          >
            Launch Surprise Drill
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Total Concepts</span>
            <BookOpen className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{metrics.totalConcepts}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Across {metrics.totalSubjects} subjects</p>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Due for Review</span>
            <Brain className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{metrics.dueQuestions}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Total {metrics.totalQuestions} questions generated</p>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Retention Rate</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{metrics.retentionRate}%</div>
          <p className="text-[11px] text-zinc-500 mt-1">Based on {metrics.totalReviews} total reviews</p>
        </div>

        <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Active Subjects</span>
            <Layers className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-100">{metrics.totalSubjects}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Multi-domain tracking</p>
        </div>
      </div>

      {/* Quick Workflows Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-500">Accelerated Workflows</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('fresh-start')}
            className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-emerald-400 flex items-center justify-between">
              Fresh Start
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h4>
            <p className="text-xs text-zinc-500 mt-1">
              Returning after weeks away? Get a condensed subject overview, dependency map, and targeted sprint.
            </p>
          </div>

          <div
            onClick={() => onNavigate('interview')}
            className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-indigo-500/40 hover:bg-zinc-900/80 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-indigo-400 flex items-center justify-between">
              Interview Mode
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h4>
            <p className="text-xs text-zinc-500 mt-1">
              Simulate technical interview rounds, model answers, follow-up probe drilldowns, and revision checklist.
            </p>
          </div>

          <div
            onClick={() => onNavigate('graph')}
            className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-teal-500/40 hover:bg-zinc-900/80 transition-all cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-3 group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200 group-hover:text-teal-400 flex items-center justify-between">
              Knowledge Graph
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h4>
            <p className="text-xs text-zinc-500 mt-1">
              Interactive 2D topological network showing concept prerequisites, associations, and live recall status.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Section: Subjects & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Subject Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Active Subjects</h3>
            <button
              onClick={() => onNavigate('concepts')}
              className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1"
            >
              View all concepts <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {subjectBreakdown.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-zinc-800/80 bg-zinc-900/20 text-zinc-500 text-xs">
                No subjects found. Ingest your first notes or seed demo data!
              </div>
            ) : (
              subjectBreakdown.map(subj => (
                <div
                  key={subj.id}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 hover:border-zinc-700/80 flex items-center justify-between transition-all"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-zinc-100">{subj.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                      <span>{subj.concepts} concepts</span>
                      <span>•</span>
                      <span>{subj.questions} questions</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {subj.due > 0 && (
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {subj.due} due
                      </span>
                    )}
                    <button
                      onClick={() => onNavigate('concepts', subj.id)}
                      className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors border border-zinc-700/60"
                    >
                      Explore
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Rating Distribution Mini Chart */}
        <div className="p-5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Recall Rating Distribution</h4>
            <p className="text-xs text-zinc-500">Historical performance across all reviews</p>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRatingData}>
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#10b981', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>FSRS Retention Target: 90%</span>
            <span className="text-emerald-400">Stable</span>
          </div>
        </div>
      </div>
    </div>
  );
};
