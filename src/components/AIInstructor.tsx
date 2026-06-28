import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Send,
  Sparkles,
  Undo,
  Activity,
  RefreshCw,
  Bookmark,
  Compass,
  Flame,
  Terminal,
  Clock,
  Music,
  Check,
  Zap,
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { BeatDivision } from '../types';
import { supabase } from '../lib/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AIInstructorProps {
  bpm: number;
  division: BeatDivision;
  beatsPerMeasure: number;
  setBpm: (bpm: number) => void;
  setDivision: (div: BeatDivision) => void;
  setBeatsPerMeasure: (beats: number) => void;
  recentTimingHistory?: { id: string; offset: number; type: 'kick' | 'snare' | 'hihat'; rating: 'Perfect' | 'Good' | 'Early' | 'Late' }[];
}

const STORAGE_KEY = 'metrome_drum_instructor_chat_v1';

interface WeeklyTrend {
  label: string;
  avgOffset: number;
  avgJitter: number;
  count: number;
}

const SUGGESTED_QUESTIONS = [
  "Suggest a 10-minute speed warm-up",
  "Explain Single Paradiddle hand counts",
  "How do I set up electronic MIDI drums?",
  "Give me tips for clean flams & drags"
];

export function AIInstructor({
  bpm,
  division,
  beatsPerMeasure,
  setBpm,
  setDivision,
  setBeatsPerMeasure,
  recentTimingHistory = []
}: AIInstructorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading instructor chat history:", e);
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: "Hey! I'm Coach Dave, your AI Drumming Companion. 🥁\n\nI can help you build speed-ramping practice routines, explain complex rudiments (like paradiddles and flams), teach you rock or trap grooves, or troubleshoot your physical MIDI e-drum triggers.\n\nWhat are we focusing on today?",
        timestamp: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })
      }
    ];
  });

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [showTrends, setShowTrends] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchWeeklyTrends = useCallback(async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('lesson_progress')
        .select('avg_offset_ms, jitter_ms, completed_at')
        .gte('completed_at', thirtyDaysAgo.toISOString())
        .order('completed_at', { ascending: true });

      if (error || !data || data.length === 0) return;

      // Group by ISO week
      const weekMap = new Map<string, { offsets: number[]; jitters: number[] }>();
      for (const row of data) {
        const d = new Date(row.completed_at);
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - d.getDay());
        const key = startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (!weekMap.has(key)) weekMap.set(key, { offsets: [], jitters: [] });
        const entry = weekMap.get(key)!;
        entry.offsets.push(row.avg_offset_ms);
        entry.jitters.push(row.jitter_ms);
      }

      const trends: WeeklyTrend[] = Array.from(weekMap.entries()).map(([label, { offsets, jitters }]) => ({
        label,
        avgOffset: Math.round(offsets.reduce((s, v) => s + v, 0) / offsets.length),
        avgJitter: Math.round(jitters.reduce((s, v) => s + v, 0) / jitters.length),
        count: offsets.length,
      }));

      setWeeklyTrends(trends);
    } catch {
      // silently ignore trend fetch errors
    }
  }, []);

  useEffect(() => { fetchWeeklyTrends(); }, [fetchWeeklyTrends]);

  // Compute timing performance analytics if history is available
  const timingSummary = useMemo(() => {
    if (!recentTimingHistory || recentTimingHistory.length === 0) {
      return null;
    }
    const offsets = recentTimingHistory.map(h => h.offset);
    const sum = offsets.reduce((acc, v) => acc + v, 0);
    const avg = sum / offsets.length;
    
    // Variance and Jitter/Deviation
    const variance = offsets.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / offsets.length;
    const jitter = Math.sqrt(variance);

    // Ratings breakdown
    const perfects = recentTimingHistory.filter(h => h.rating === 'Perfect').length;
    const goods = recentTimingHistory.filter(h => h.rating === 'Good').length;
    const earlys = recentTimingHistory.filter(h => h.rating === 'Early').length;
    const lates = recentTimingHistory.filter(h => h.rating === 'Late').length;

    let tendency = 'steady';
    if (avg < -8) tendency = 'rushing (early)';
    else if (avg > 8) tendency = 'dragging (late)';

    return {
      avg: Math.round(avg),
      jitter: Math.round(jitter),
      perfects,
      goods,
      earlys,
      lates,
      tendency,
      totalCount: recentTimingHistory.length
    };
  }, [recentTimingHistory]);

  const handleGenerateWarmup = async () => {
    if (isTyping) return;

    setApiError(null);
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });

    // Display a clean, concise request from the user in chat
    const userDisplayMsg = "Coach Dave, analyze my recent performance and generate a custom 5-minute warm-up!";
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: userDisplayMsg,
      timestamp
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Refresh 30-day trends before building the prompt
    await fetchWeeklyTrends();

    try {
      // Build a robust, highly detailed prompt payload for Coach Dave
      let contextPrompt = "";
      if (timingSummary) {
        const trendSection = weeklyTrends.length >= 2
          ? `\n\n30-Day Weekly Performance History:\n| Week | Avg Offset (ms) | Avg Jitter (ms) | Sessions |\n|------|----------------|----------------|----------|\n${
            weeklyTrends.map(t => `| ${t.label} | ${t.avgOffset > 0 ? '+' : ''}${t.avgOffset} | ${t.avgJitter} | ${t.count} |`).join('\n')
          }\nTrend direction: ${
            weeklyTrends.length >= 2
              ? (weeklyTrends[weeklyTrends.length - 1].avgJitter < weeklyTrends[0].avgJitter ? 'consistency IMPROVING' : 'consistency needs work')
              : 'insufficient data'
          }`
          : '';

        contextPrompt = `[System Context: Metronome is currently set to ${bpm} BPM, Subdivisions: ${division} hits per beat, and Beats per measure: ${beatsPerMeasure}].
The user wants a personalized 5-minute custom warm-up routine based on their recent timing performance.
Here are the user's detailed latency performance metrics:
- Total recorded notes: ${timingSummary.totalCount}
- Average offset: ${timingSummary.avg}ms (negative is early/rushing, positive is late/dragging)
- Timing consistency (Jitter/Standard Deviation): ${timingSummary.jitter}ms
- Rating breakdown: ${timingSummary.perfects} Perfects, ${timingSummary.goods} Goods, ${timingSummary.earlys} Early, ${timingSummary.lates} Late.
- General timing tendency: ${timingSummary.tendency}${trendSection}

If the user is rushing, suggest exercises to help them settle into the pocket (e.g., slow gap-clicks, space-grooves, alternating dynamics). If dragging, suggest exercises to help them stay on top of the beat. If they have high jitter (inconsistency), suggest exercises to stabilize their timing (like steady single-stroke roll endurance).
Please structure the 5-minute custom routine into 2-3 specific rudiment exercises with duration in minutes (totaling 5 minutes), clear physical instruction, and target counts. Provide highly encouraging feedback praising their effort. Use engaging, bulleted list markdown format with bolding.`;
      } else {
        contextPrompt = `[System Context: Metronome is currently set to ${bpm} BPM, Subdivisions: ${division} hits per beat, and Beats per measure: ${beatsPerMeasure}].
The user wants a personalized 5-minute custom warm-up routine. There is no latency performance history recorded yet.
Please suggest a standard, high-fidelity balanced warm-up routine of 5 minutes for a drummer playing at ${bpm} BPM.
Structure the routine into 2 or 3 exercises (totaling 5 minutes) using standard rudiments (e.g., Single-Stroke Rolls, Double-Stroke Rolls, or Paradiddles). Mention that once they start practicing on the scrolling timeline above, you can analyze their live hits to tailor the exercises specifically to their timing tendencies (rushing/dragging). Use engaging, bulleted list markdown format with bolding.`;
      }

      const response = await fetch("/api/instructor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextPrompt,
          history: messages.slice(-8).map(msg => ({
            sender: msg.sender,
            text: msg.text
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An API Error occurred during generation.");
      }

      const aiReplyText = data.reply;
      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("AI Warm-up generation failed:", err);
      setApiError(err.message || "Failed to generate warm-up. Please check if your system is starting.");
    } finally {
      setIsTyping(false);
    }
  };

  // Persist messages in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to store instructor chat history:", e);
    }
  }, [messages]);

  // Keep chat scrolled down
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Parse Coach Dave's message output to look for configuration recommendations
  const extractQuickActions = (text: string) => {
    const actions: { label: string; action: () => void; id: string }[] = [];

    // 1. Scan for BPM recommendations (e.g., "set your bpm to 85", "practice at 110 BPM", "try 90bpm")
    const bpmRegex = /(?:bpm\s+of\s+|tempo\s+of\s+|at\s+|to\s+)([4-9]\d|1\d\d|2[0-3]\d)(?:\s*bpm)?/i;
    const matchBpm = text.match(bpmRegex);
    if (matchBpm) {
      const parsedBpm = parseInt(matchBpm[1], 10);
      if (!isNaN(parsedBpm) && parsedBpm >= 40 && parsedBpm <= 240) {
        actions.push({
          id: `bpm-${parsedBpm}`,
          label: `⚡ Set Tempo: ${parsedBpm} BPM`,
          action: () => setBpm(parsedBpm)
        });
      }
    }

    // 2. Scan for specific subdivisions in advice
    if (text.toLowerCase().includes("sixteenth") || text.toLowerCase().includes("16th")) {
      actions.push({
        id: 'div-4',
        label: '🎶 Set Subdivisions: Sixteenths',
        action: () => setDivision(4)
      });
    } else if (text.toLowerCase().includes("triplet") || text.toLowerCase().includes("12/8")) {
      actions.push({
        id: 'div-3',
        label: '🎶 Set Subdivisions: Triplets',
        action: () => setDivision(3)
      });
    } else if (text.toLowerCase().includes("eighth") || text.toLowerCase().includes("8th")) {
      actions.push({
        id: 'div-2',
        label: '🎶 Set Subdivisions: Eighths',
        action: () => setDivision(2)
      });
    }

    // 3. Scan for specific drum signatures
    if (text.toLowerCase().includes("waltz") || text.toLowerCase().includes("3/4")) {
      actions.push({
        id: 'signature-3',
        label: '📐 Load Waltz (3/4 time)',
        action: () => {
          setBeatsPerMeasure(3);
          setDivision(2);
        }
      });
    } else if (text.toLowerCase().includes("4/4") || text.toLowerCase().includes("common time")) {
      actions.push({
        id: 'signature-4',
        label: '📐 Load 4/4 time',
        action: () => {
          setBeatsPerMeasure(4);
        }
      });
    }

    return actions;
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isTyping) return;

    setApiError(null);
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
    
    // Create new user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'user',
      text: textToSend,
      timestamp
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Gather relevant active configuration context to pass alongside message implicitly
      const contextPrompt = `[System Context: Metronome is currently set to ${bpm} BPM, Subdivisions: ${division} hits per beat, and Beats per measure: ${beatsPerMeasure}. Use this to customize suggestions].
User query: ${textToSend}`;

      // Call our secure Express API endpoint
      const response = await fetch("/api/instructor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: contextPrompt,
          // Extract last 8 messages for memory efficiency
          history: messages.slice(-8).map(msg => ({
            sender: msg.sender,
            text: msg.text
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An API Error occurred during generation.");
      }

      const aiReplyText = data.reply;
      const aiMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        sender: 'ai',
        text: aiReplyText,
        timestamp: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("Chat API Communication failed:", err);
      setApiError(err.message || "Failed to reach Coach Dave. Please check if your system is starting.");
    } finally {
      setIsTyping(false);
    }
  };

  const clearChatHistory = () => {
    if (confirm("Are you sure you want to clear your conversation with Coach Dave?")) {
      const initialWelcome: ChatMessage = {
        id: 'welcome',
        sender: 'ai',
        text: "History swept clean! Ready to dial in some fresh grooves. What drum rudiments or beats are we tearing into next?",
        timestamp: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })
      };
      setMessages([initialWelcome]);
      setApiError(null);
    }
  };

  // Safe and clean custom bullet/bold markdown highlighter list parser
  const renderMessageText = (msg: ChatMessage) => {
    return msg.text.split('\n').map((line, idx) => {
      let content = line;
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      if (isBullet) {
        content = line.trim().substring(2);
      }

      // Format bold tags (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="text-white font-semibold font-sans">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const formattedContent = parts.length > 0 ? parts : content;

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc pl-1 text-[11px] text-slate-350 my-0.5 leading-relaxed">
            {formattedContent}
          </li>
        );
      } else {
        return (
          <p key={idx} className="text-[11.5px] text-slate-300 leading-relaxed my-1 min-h-[0.4rem]">
            {formattedContent}
          </p>
        );
      }
    });
  };

  return (
    <div className="bg-[#0F0F11] rounded-3xl border border-slate-900 backdrop-blur-md w-full max-w-xl mx-auto shadow-2xl flex flex-col h-[520px] overflow-hidden">
      
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-900 px-6 py-4 bg-slate-950/30">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">Coach Dave AI</span>
            <h2 className="font-sans text-sm font-bold text-slate-100 tracking-tight flex items-center gap-1">
              Drumming Instructor Bot <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse mt-0.5 ml-1" />
            </h2>
          </div>
        </div>
        
        <button
          onClick={clearChatHistory}
          className="text-[9px] uppercase tracking-wider font-mono font-bold text-slate-500 hover:text-rose-400 px-2 py-1 rounded bg-[#141417] border border-slate-900 transition-colors cursor-pointer"
          title="Reset conversation"
        >
          Reset Session
        </button>
      </div>

      {/* AI Warm-up Generator Banner */}
      <div className="bg-indigo-950/20 border-b border-slate-900 px-6 py-2.5 flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-950/10 via-indigo-950/20 to-slate-950/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-sans text-slate-350 tracking-wide font-medium">
            {recentTimingHistory && recentTimingHistory.length > 0 ? (
              <>Analyze timing & generate a custom warm-up</>
            ) : (
              <>Generate a custom 5-minute drumming warm-up</>
            )}
          </span>
        </div>
        <button
          id="btn-generate-warmup"
          onClick={handleGenerateWarmup}
          disabled={isTyping}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-sans font-bold text-[9px] sm:text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0 shadow-md hover:shadow-indigo-550/20"
        >
          <Zap className="h-3 w-3 fill-white" /> AI Warm-up
        </button>
      </div>

      {/* 30-Day Performance Trend Panel */}
      {weeklyTrends.length >= 2 && (
        <div className="border-b border-slate-900">
          <button
            onClick={() => setShowTrends(p => !p)}
            className="w-full flex items-center justify-between px-6 py-2.5 bg-slate-950/20 hover:bg-slate-950/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] font-bold font-sans text-slate-400 uppercase tracking-wider">
                30-Day Performance Trend
              </span>
              <span className="text-[9px] font-mono text-slate-600">{weeklyTrends.length} weeks</span>
            </div>
            <motion.div animate={{ rotate: showTrends ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showTrends && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 space-y-3">
                  <div className="h-28">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyTrends} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="offsetGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="jitterGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" tick={{ fontSize: 8, fill: '#475569' }} />
                        <YAxis tick={{ fontSize: 8, fill: '#475569' }} />
                        <Tooltip
                          contentStyle={{ background: '#0F0F11', border: '1px solid #1e293b', borderRadius: 8, fontSize: 10 }}
                          labelStyle={{ color: '#94a3b8' }}
                          formatter={(val: number, name: string) => [`${val}ms`, name === 'avgOffset' ? 'Offset' : 'Jitter']}
                        />
                        <Area type="monotone" dataKey="avgOffset" stroke="#10b981" strokeWidth={1.5} fill="url(#offsetGrad)" dot={{ r: 2, fill: '#10b981' }} />
                        <Area type="monotone" dataKey="avgJitter" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 2" fill="url(#jitterGrad)" dot={{ r: 2, fill: '#f59e0b' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-4 text-[9px] font-mono text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500 inline-block" /> Avg Offset (ms)</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-amber-500 inline-block border-dashed" /> Jitter (ms)</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Chat messages viewport */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar custom-chat-scroller bg-gradient-to-b from-transparent to-[#0e0e11]/30"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const actions = msg.sender === 'ai' ? extractQuickActions(msg.text) : [];
            const isWelcome = msg.id === 'welcome';
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 border ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600/15 border-indigo-500/20 rounded-tr-none text-slate-150'
                    : 'bg-[#141417] border-slate-900/90 rounded-tl-none'
                }`}>
                  {/* Sender title */}
                  <div className="flex items-center justify-between gap-4 mb-1 border-b border-white/[0.03] pb-1">
                    <span className={`text-[9px] font-bold tracking-wider uppercase font-mono ${
                      msg.sender === 'user' ? 'text-indigo-400' : 'text-slate-500 flex items-center gap-1'
                    }`}>
                      {msg.sender === 'user' ? 'You' : (
                        <>
                          <Terminal className="h-3 w-3 text-indigo-400" /> INSTRUCTOR COACH
                        </>
                      )}
                    </span>
                    <span className="text-[8px] font-bold text-slate-600 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Body Text */}
                  <div className="space-y-0.5 max-w-full overflow-hidden break-words text-left">
                    {renderMessageText(msg)}
                  </div>
                </div>

                {/* Interactive parsed actions (if any) */}
                {actions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 justify-start pl-2">
                    {actions.map((act) => (
                      <button
                        key={act.id}
                        onClick={() => {
                          act.action();
                          // Display a mini floating notice effect on click
                          const notificationMsg: ChatMessage = {
                            id: Math.random().toString(36).substring(2, 9),
                            sender: 'ai',
                            text: `✨ Setup updated successfully: ${act.label.substring(2)}`,
                            timestamp: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })
                          };
                          setMessages(prev => [...prev, notificationMsg]);
                        }}
                        className="py-1 px-3 rounded-lg text-[10px] font-bold bg-[#141417] hover:bg-[#1C1C21] border border-indigo-500/25 text-indigo-300 hover:text-indigo-200 shadow-sm transition-all hover:scale-102 flex items-center gap-1 cursor-pointer select-none"
                      >
                        <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" /> {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Prompt Typings Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start items-center"
            >
              <div className="bg-[#141417]/85 border border-slate-900 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase font-mono text-slate-500 flex items-center gap-1.5 mr-1">
                  <RefreshCw className="h-3.5 w-3.5 text-indigo-400 animate-spin" /> Dave is typing
                </span>
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" />
                </div>
              </div>
            </motion.div>
          )}

          {/* API Failures */}
          {apiError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-300 rounded-xl text-[10.5px] leading-relaxed text-center font-medium"
            >
              ⚠️ {apiError}
              <button 
                onClick={() => handleSendMessage(messages[messages.length - 1]?.text || "Retry advice")}
                className="block mx-auto mt-2 text-[10px] font-bold underline hover:text-rose-200 cursor-pointer"
              >
                Retry Request
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suggested Quick Questions footer */}
      {messages.length < 5 && (
        <div className="px-6 py-2 border-t border-slate-900 bg-slate-950/10 flex items-center gap-2 overflow-x-auto no-scrollbar select-none">
          <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider flex items-center gap-1 shrink-0">
            <Compass className="h-3.5 w-3.5 text-indigo-400" /> Ask Coach:
          </span>
          <div className="flex gap-1.5 shrink-0 pr-4">
            {SUGGESTED_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q)}
                className="py-1 px-2.5 rounded-full text-[10px] font-medium bg-[#141417] hover:bg-[#1C1C21] border border-slate-900 hover:border-slate-800 text-slate-350 hover:text-slate-200 transition-all cursor-pointer whitespace-nowrap"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text Send Form Input Footer */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputValue);
        }}
        className="px-6 py-4 border-t border-slate-900 bg-slate-950/35 flex gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask about double strokes, trap grooves, or MIDI setups..."
          disabled={isTyping}
          className="flex-1 bg-slate-950 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500/50 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isTyping}
          className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-550 disabled:bg-slate-900/60 disabled:text-slate-650 transition-all text-white rounded-xl flex items-center justify-center cursor-pointer disabled:cursor-not-allowed active:scale-95"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
