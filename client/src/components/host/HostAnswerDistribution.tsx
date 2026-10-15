import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ArrowRight, CheckCircle2, Trophy, Users } from 'lucide-react';
import { QuestionDistribution } from '../../types';

interface HostAnswerDistributionProps {
  distribution: QuestionDistribution[];
  correctOptionId: string;
  totalAnswers: number;
  onNext: () => void;
}

export const HostAnswerDistribution: React.FC<HostAnswerDistributionProps> = ({
  distribution,
  correctOptionId,
  totalAnswers,
  onNext
}) => {
  const kahootColors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
  const shapeLabels = ['Triangle', 'Diamond', 'Circle', 'Square'];

  // Prepare chart data
  const chartData = distribution.map((item, index) => ({
    name: `${shapeLabels[index % 4]} (${item.text.slice(0, 18)}${item.text.length > 18 ? '...' : ''})`,
    count: item.count,
    isCorrect: item.isCorrect,
    color: kahootColors[index % 4]
  }));

  const correctItem = distribution.find(d => d.isCorrect);
  const correctCount = correctItem ? correctItem.count : 0;
  const accuracy = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <span className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Question Review
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-heading">
            Answer Distribution
          </h1>
        </div>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-105 active:scale-95"
        >
          <span>Live Leaderboard</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 gap-4 my-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{accuracy}%</div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Correct Accuracy</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">{totalAnswers}</div>
            <div className="text-xs font-semibold text-slate-500 uppercase">Total Submissions</div>
          </div>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm my-6">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                interval={0}
              />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontWeight: 'bold'
                }}
              />
              <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Answer Cards Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {distribution.map((item, idx) => (
          <div
            key={item.optionId}
            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
              item.isCorrect
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: kahootColors[idx % 4] }}
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  {item.text}
                </div>
                {item.isCorrect && (
                  <div className="flex items-center gap-1 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Correct Answer</span>
                  </div>
                )}
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {item.count}
              </div>
              <div className="text-xs text-slate-500 font-semibold">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
