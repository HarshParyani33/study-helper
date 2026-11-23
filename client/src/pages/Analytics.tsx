import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { DashboardSummary } from '../types/index.js';
import {
  BarChart3,
  TrendingUp,
  Brain,
  Layers,
  Award,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const Analytics: React.FC = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardSummary();
      setData(res);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const { metrics, recentReviews, ratingDistribution, subjectBreakdown } = data;

  const chartRatingData = [
    { name: 'Again (1)', count: ratingDistribution.find(r => r._id === 1)?.count || 0, fill: '#f43f5e' },
    { name: 'Hard (2)', count: ratingDistribution.find(r => r._id === 2)?.count || 0, fill: '#f59e0b' },
    { name: 'Good (3)', count: ratingDistribution.find(r => r._id === 3)?.count || 0, fill: '#10b981' },
    { name: 'Easy (4)', count: ratingDistribution.find(r => r._id === 4)?.count || 0, fill: '#14b8a6' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          Learning Analytics & FSRS Health
        </h3>
        <p className="text-xs text-zinc-400">
          Tracking memory consolidation, retention rate %, and review velocity across your knowledge base.
        </p>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <span className="text-xs text-zinc-500 block mb-1">Estimated Retention</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{metrics.retentionRate}%</span>
          <p className="text-[11px] text-zinc-500 mt-1">Target: 90% (FSRS v4.5)</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <span className="text-xs text-zinc-500 block mb-1">Total Review Attempts</span>
          <span className="text-2xl font-bold font-mono text-zinc-100">{metrics.totalReviews}</span>
          <p className="text-[11px] text-zinc-500 mt-1">Persistent audit logs</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <span className="text-xs text-zinc-500 block mb-1">Concepts Ingested</span>
          <span className="text-2xl font-bold font-mono text-indigo-400">{metrics.totalConcepts}</span>
          <p className="text-[11px] text-zinc-500 mt-1">Across {metrics.totalSubjects} subjects</p>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <span className="text-xs text-zinc-500 block mb-1">Spaced Repetition Questions</span>
          <span className="text-2xl font-bold font-mono text-teal-400">{metrics.totalQuestions}</span>
          <p className="text-[11px] text-zinc-500 mt-1">{metrics.dueQuestions} due now</p>
        </div>
      </div>

      {/* Two Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rating Breakdown */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">FSRS Rating Frequency</h4>
            <p className="text-xs text-zinc-500">Distribution of self-ratings across all historical study sessions</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRatingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="name" stroke="#71717a" fontSize={11} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reviews Volume Timeline */}
        <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-zinc-200">Recent Review Activity</h4>
            <p className="text-xs text-zinc-500">Completed reviews over recent days</p>
          </div>
          <div className="h-64 w-full">
            {recentReviews.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentReviews}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="_id" stroke="#71717a" fontSize={11} tickLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 font-mono">
                No recent review activity logged yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject Knowledge Breakdown Table */}
      <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 space-y-4">
        <h4 className="text-sm font-semibold text-zinc-200">Subject Coverage Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] font-mono uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3">Subject Name</th>
                <th className="py-2.5 px-3">Concepts</th>
                <th className="py-2.5 px-3">Questions</th>
                <th className="py-2.5 px-3">Due Today</th>
                <th className="py-2.5 px-3">Health Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {subjectBreakdown.map(s => (
                <tr key={s.id} className="hover:bg-zinc-850/30">
                  <td className="py-3 px-3 font-medium text-zinc-200">{s.name}</td>
                  <td className="py-3 px-3 font-mono text-zinc-400">{s.concepts}</td>
                  <td className="py-3 px-3 font-mono text-zinc-400">{s.questions}</td>
                  <td className="py-3 px-3 font-mono">
                    {s.due > 0 ? (
                      <span className="text-rose-400 font-bold">{s.due} due</span>
                    ) : (
                      <span className="text-emerald-400">Current</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                    <span className="text-zinc-400 font-mono text-[11px]">Indexed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
