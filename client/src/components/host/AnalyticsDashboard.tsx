import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Users,
  CheckCircle2,
  Clock,
  HelpCircle,
  FileSpreadsheet,
  Download,
  ArrowLeft,
  Trophy
} from 'lucide-react';
import { SessionAnalytics } from '../../types';
import { fetchSessionAnalytics, getCSVExportUrl, getExcelExportUrl } from '../../services/api';

interface AnalyticsDashboardProps {
  sessionId: string;
  onBack: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ sessionId, onBack }) => {
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessionAnalytics(sessionId)
      .then(data => setAnalytics(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-indigo-600">
        <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-6 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200">
          {error || 'Failed to load session analytics.'}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Game</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            Session Analytics & Reports
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Quiz: <span className="font-bold text-slate-700 dark:text-slate-300">{analytics.quizTitle}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={getExcelExportUrl(sessionId)}
            download
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Report</span>
          </a>
          <a
            href={getCSVExportUrl(sessionId)}
            download
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition-all"
          >
            <Download className="w-4 h-4" />
            <span>CSV File</span>
          </a>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-4 h-4" />
            <span>Participants</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-heading">
            {analytics.totalParticipants}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Overall Accuracy</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-heading">
            {analytics.overallAccuracyPercent}%
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4" />
            <span>Avg Response</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-heading">
            {analytics.averageResponseTimeSec}s
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <HelpCircle className="w-4 h-4" />
            <span>Questions</span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-heading">
            {analytics.questionsCompleted}
          </div>
        </div>
      </div>

      {/* Score Distribution Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Score Distribution Histogram
        </h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.scoreDistribution}>
              <XAxis dataKey="range" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none'
                }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Question Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-hidden">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Question Accuracy & Timing Breakdown
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-black uppercase text-slate-400">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Question</th>
                <th className="py-3 px-4 text-center">Correct</th>
                <th className="py-3 px-4 text-center">Incorrect</th>
                <th className="py-3 px-4 text-center">Accuracy %</th>
                <th className="py-3 px-4 text-right">Avg Response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {analytics.questionStats.map(stat => (
                <tr key={stat.questionIndex} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-black text-indigo-600 dark:text-indigo-400">
                    Q{stat.questionIndex}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white max-w-xs truncate">
                    {stat.questionText}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {stat.correctCount}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-rose-500">
                    {stat.incorrectCount}
                  </td>
                  <td className="py-3 px-4 text-center font-black">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        stat.accuracyPercent >= 70
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : stat.accuracyPercent >= 40
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {stat.accuracyPercent}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-500">
                    {stat.averageTimeSec}s
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
