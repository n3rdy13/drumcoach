import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target, TrendingUp, Zap, HelpCircle, Activity, Award } from 'lucide-react';

interface AnalyticsHit {
  id: string;
  offset: number; // ms offset
  type: 'kick' | 'snare' | 'hihat';
  rating: 'Perfect' | 'Good' | 'Early' | 'Late';
}

interface LatencyAnalyticsProps {
  offsetHistory: AnalyticsHit[];
}

export function LatencyAnalytics({ offsetHistory }: LatencyAnalyticsProps) {
  
  // Create mock demo data if there is no active practice history, so the user can immediately see the rich scatter chart
  const activeData = useMemo(() => {
    if (offsetHistory.length > 0) {
      // Re-map with sequential horizontal X index for plotting
      return offsetHistory.map((h, i) => ({
        index: offsetHistory.length - i,
        offset: h.offset,
        instrument: h.type.toUpperCase(),
        rating: h.rating,
        displayLabel: `${h.type.toUpperCase()}: ${h.offset > 0 ? '+' : ''}${Math.round(h.offset)}ms`
      })).reverse(); // Render oldest to newest
    }

    // Default high-fidelity sample practice routine logs
    return [
      { index: 1, offset: -12, instrument: 'HI-HAT', rating: 'Good', displayLabel: 'HI-HAT: -12ms' },
      { index: 2, offset: 8, instrument: 'KICK', rating: 'Perfect', displayLabel: 'KICK: +8ms' },
      { index: 3, offset: -24, instrument: 'SNARE', rating: 'Good', displayLabel: 'SNARE: -24ms' },
      { index: 4, offset: -4, instrument: 'HI-HAT', rating: 'Perfect', displayLabel: 'HI-HAT: -4ms' },
      { index: 5, offset: 15, instrument: 'HI-HAT', rating: 'Perfect', displayLabel: 'HI-HAT: +15ms' },
      { index: 6, offset: -35, instrument: 'KICK', rating: 'Good', displayLabel: 'KICK: -35ms' },
      { index: 7, offset: 10, instrument: 'SNARE', rating: 'Perfect', displayLabel: 'SNARE: +10ms' },
      { index: 8, offset: -18, instrument: 'HI-HAT', rating: 'Good', displayLabel: 'HI-HAT: -18ms' },
      { index: 9, offset: 5, instrument: 'HI-HAT', rating: 'Perfect', displayLabel: 'HI-HAT: +5ms' },
      { index: 10, offset: -42, instrument: 'KICK', rating: 'Good', displayLabel: 'KICK: -42ms' },
      { index: 11, offset: -15, instrument: 'SNARE', rating: 'Perfect', displayLabel: 'SNARE: -15ms' },
      { index: 12, offset: 2, instrument: 'HI-HAT', rating: 'Perfect', displayLabel: 'HI-HAT: +2ms' }
    ];
  }, [offsetHistory]);

  // Compute stats metrics
  const stats = useMemo(() => {
    if (activeData.length === 0) return null;
    
    const offsets = activeData.map(d => d.offset);
    const sum = offsets.reduce((acc, v) => acc + v, 0);
    const avg = sum / offsets.length;
    
    // Variance and Standard Deviation (Jitter)
    const variance = offsets.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / offsets.length;
    const jitter = Math.sqrt(variance);

    // Accuracy breakdowns
    const perfectCount = activeData.filter(d => Math.abs(d.offset) <= 20).length;
    const perfectPercent = Math.round((perfectCount / activeData.length) * 100);

    // Tendency text analysis
    let tendencyScore = '';
    let description = '';
    const roundedAvg = Math.round(avg);

    if (roundedAvg < -8) {
      tendencyScore = `Rushing (early) by ${Math.abs(roundedAvg)}ms`;
      description = "Your hits consistently trigger slightly before the beat. Relax into the pocket, focus on breathing, and let the metronome guide you.";
    } else if (roundedAvg > 8) {
      tendencyScore = `Dragging (late) by ${roundedAvg}ms`;
      description = "You consistently trigger slightly behind the metronome beat grid. Try leaning 'on top' of the stick hits and anticipating transients.";
    } else {
      tendencyScore = "Locked In-The-Pocket (steady)";
      description = "Outstanding timing consistency! Your average deviation is incredibly centered near 0ms. You have professional-grade solid timing.";
    }

    return {
      average: roundedAvg,
      jitter: Math.round(jitter),
      perfectPercent,
      tendencyScore,
      description,
      isDemo: offsetHistory.length === 0
    };
  }, [activeData, offsetHistory]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#141417] p-2.5 rounded-lg border border-slate-900 text-[10px] font-mono space-y-0.5 shadow-xl">
          <p className="text-slate-350 font-bold">{data.instrument}</p>
          <p className="text-slate-500">
            Timing:{" "}
            <span className={data.offset > 0 ? 'text-amber-400' : 'text-sky-400'}>
              {data.offset > 0 ? '+' : ''}{Math.round(data.offset)}ms
            </span>
          </p>
          <p className="text-[9px] uppercase font-bold text-slate-600">Rating: {data.rating}</p>
        </div>
      );
    };
    return null;
  };

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900 shadow-2xl space-y-6 relative overflow-hidden w-full max-w-xl mx-auto">
      
      {/* Upper absolute background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Timing Analytics</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-1.5 mt-0.5">
            <TrendingUp className="h-4.5 w-4.5 text-indigo-400" />
            Micro-Timing Scatter Analysis
          </h2>
        </div>
        {stats?.isDemo && (
          <span className="text-[8.5px] uppercase font-bold tracking-widest text-amber-500 bg-amber-950/15 px-2 py-0.5 rounded-md border border-amber-900/40">
            Preview Demo Data
          </span>
        )}
      </div>

      {/* Scatter Chart viewport container */}
      <div className="bg-[#070709] rounded-2xl p-4 border border-slate-900 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
          <span className="flex items-center gap-1"><Activity className="h-3.5 w-3.5 text-indigo-400" /> Hit Timeline Grid</span>
          <span>Early (-) / Late (+) ms</span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 15, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#16161C" />
              <XAxis 
                type="number" 
                dataKey="index" 
                name="Hit Number" 
                stroke="#334155" 
                tickLine={false}
                tickFormatter={(val) => `#${val}`}
                domain={['auto', 'auto']}
                fontSize={9}
              />
              <YAxis 
                type="number" 
                dataKey="offset" 
                name="Offset" 
                unit="ms" 
                stroke="#334155"
                tickLine={false}
                domain={[-100, 100]}
                fontSize={9}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              {/* Reference line showing perfect beat 0ms alignment */}
              <ReferenceLine y={0} stroke="#4f46e5" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="5 5" />
              {/* Highlight safe pocket margins of ±20ms */}
              <ReferenceLine y={20} stroke="#10b981" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="2 2" />
              <ReferenceLine y={-20} stroke="#10b981" strokeOpacity={0.15} strokeWidth={1} strokeDasharray="2 2" />

              <Scatter 
                name="MIDI Hits" 
                data={activeData} 
                fill="#4f46e5"
                shape={(props: any) => {
                  const { cx, cy, payload } = props;
                  // Color codes based on target perfect bounds
                  const offset = Math.abs(payload.offset);
                  const fillColor = offset <= 20 
                    ? '#10b981' // emerald-500
                    : offset <= 55
                    ? '#f59e0b' // amber-500
                    : '#ef4444'; // red-500
                  return (
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={5} 
                      fill={fillColor} 
                      stroke="#070709" 
                      strokeWidth={1} 
                      className="transition-all hover:scale-125"
                    />
                  );
                }}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 px-1 pt-1">
          <span>Older hits</span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Perfect (±20ms)
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 ml-1.5" /> Good (±55ms)
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 ml-1.5" /> Poor (&gt;55ms)
          </span>
          <span>Latest hit</span>
        </div>
      </div>

      {/* Numerical Metrics Dashboard */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          
          {/* Average offset */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-900 text-center">
            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-550 block mb-1">Average Latency</span>
            <div className={`text-sm font-extrabold font-sans leading-none ${
              Math.abs(stats.average) <= 15 ? 'text-emerald-400' : 'text-slate-200'
            }`}>
              {stats.average > 0 ? '+' : ''}{stats.average}ms
            </div>
            <span className="text-[8px] font-mono text-slate-600 block mt-1">Center alignment</span>
          </div>

          {/* Jitter (consistency deviation) */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-900 text-center">
            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-550 block mb-1">Grid Jitter</span>
            <div className="text-sm font-extrabold font-sans text-indigo-400 leading-none">
              ±{stats.jitter}ms
            </div>
            <span className="text-[8px] font-mono text-slate-600 block mt-1">Consistency spread</span>
          </div>

          {/* Pocket Percentage */}
          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-900 text-center">
            <span className="text-[8px] uppercase tracking-wider font-bold text-slate-550 block mb-1">In-The-Pocket</span>
            <div className={`text-sm font-extrabold font-sans leading-none ${
              stats.perfectPercent >= 75 ? 'text-emerald-400' : stats.perfectPercent >= 45 ? 'text-amber-400' : 'text-rose-400'
            }`}>
              {stats.perfectPercent}%
            </div>
            <span className="text-[8px] font-mono text-slate-600 block mt-1">Hits &le; 20ms deviation</span>
          </div>

        </div>
      )}

      {/* Tendency Score Report Banner */}
      {stats && (
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-900 space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-900/60 pb-1.5">
            <Award className="h-4 w-4 text-emerald-450" />
            <span className="font-sans text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Rhythmic Tendency Score
            </span>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200 font-sans">
              Timing Tendency: <span className="text-emerald-450 font-mono underline decoration-emerald-500/30 decoration-2">{stats.tendencyScore}</span>
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
              {stats.description}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
