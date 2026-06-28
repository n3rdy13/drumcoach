import { motion } from 'motion/react';
import { TrendingUp, ChartBar as BarChart2, Info } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { LessonProgressRecord } from '../lib/supabaseClient';

interface LessonProgressChartProps {
  records: LessonProgressRecord[];
  isLoading: boolean;
}

interface TooltipPayload {
  color: string;
  name: string;
  value: number;
  dataKey: string;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-[#0F0F11] border border-slate-800 rounded-xl p-3 shadow-2xl min-w-[160px]">
      <p className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-900 pb-1.5 truncate max-w-[180px]">
        {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 mt-1">
          <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono text-[11px] font-bold text-slate-200">
            {entry.value > 0 ? '+' : ''}{entry.value}<span className="text-slate-500 text-[9px]">ms</span>
          </span>
        </div>
      ))}
    </div>
  );
};

export function LessonProgressChart({ records, isLoading }: LessonProgressChartProps) {
  const chartData = records
    .slice()
    .reverse()
    .map((r) => ({
      name: r.lesson_title.length > 16 ? r.lesson_title.substring(0, 14) + '…' : r.lesson_title,
      fullTitle: r.lesson_title,
      offset: r.avg_offset_ms,
      jitter: r.jitter_ms,
      bpm: r.session_bpm,
    }));

  return (
    <div className="bg-[#0F0F11] p-5 rounded-2xl border border-slate-900 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
          <h4 className="font-sans text-xs font-bold text-slate-200 uppercase tracking-wide">
            Session Progress History
          </h4>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono text-slate-500">
          <Info className="h-3 w-3" />
          <span>Last {records.length} sessions</span>
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="flex gap-1.5">
            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" />
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="h-40 flex flex-col items-center justify-center gap-3 border border-dashed border-slate-900 rounded-xl"
        >
          <BarChart2 className="h-8 w-8 text-slate-700" />
          <div className="text-center space-y-1">
            <p className="text-xs font-sans font-semibold text-slate-500">No sessions recorded yet</p>
            <p className="text-[10px] text-slate-600">Complete a lesson to start tracking your timing progress.</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1a1a1f"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#475569', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}ms`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '9px', fontFamily: 'Inter, sans-serif', color: '#64748b', paddingTop: '8px' }}
                iconType="circle"
                iconSize={6}
              />
              <ReferenceLine
                y={0}
                stroke="#334155"
                strokeDasharray="4 2"
                label={{ value: 'Perfect', fill: '#334155', fontSize: 8, fontFamily: 'JetBrains Mono' }}
              />
              <Line
                type="monotone"
                dataKey="offset"
                name="Avg Offset"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#34d399', stroke: '#0F0F11', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="jitter"
                name="Jitter (SD)"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#0F0F11', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="flex items-center justify-center gap-5 pt-1 text-[9px] font-mono text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-emerald-400 rounded" /> Offset: 0ms = perfect timing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-0.5 bg-amber-400 rounded opacity-70" style={{ borderTop: '1px dashed' }} /> Lower jitter = more consistent
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
