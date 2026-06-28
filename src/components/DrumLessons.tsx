import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, CircleCheck as CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Circle as HelpCircle, Info, Lock, Sparkles, Trophy, Zap, Gauge, MessageSquare, CircleAlert as AlertCircle, Brain, TrendingUp } from 'lucide-react';
import { BeatDivision, Lesson } from '../types';
import { CURRICULUM } from '../data/curriculum';
import { RhythmQuiz } from './RhythmQuiz';
import { LessonProgressChart } from './LessonProgressChart';
import { supabase, LessonProgressRecord } from '../lib/supabaseClient';

interface DrumLessonsProps {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  currentSubdivision: number;
  division: BeatDivision;
  beatsPerMeasure: number;
  recentTimingHistory: {
    id: string;
    offset: number;
    type: 'kick' | 'snare' | 'hihat';
    rating: 'Perfect' | 'Good' | 'Early' | 'Late';
  }[];
  setBpm: (bpm: number) => void;
  setDivision: (div: BeatDivision) => void;
  setBeatsPerMeasure: (beats: number) => void;
  togglePlayback: () => void;
  onCompletedLessonsChange?: (ids: string[]) => void;
}

const LS_UNLOCKED = 'metrome_drum_coach_unlocked_v2';
const LS_COMPLETED = 'metrome_drum_coach_completed_v2';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function DrumLessons({
  isPlaying,
  bpm,
  currentBeat,
  recentTimingHistory,
  setBpm,
  setDivision,
  setBeatsPerMeasure,
  togglePlayback: _togglePlayback,
  onCompletedLessonsChange,
}: DrumLessonsProps) {
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>(() =>
    loadFromStorage<string[]>(LS_UNLOCKED, ['lesson-1-pulse'])
  );
  const [completedLessons, setCompletedLessons] = useState<string[]>(() =>
    loadFromStorage<string[]>(LS_COMPLETED, [])
  );

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [lessonStreak, setLessonStreak] = useState(0);
  const [verifiedHitsCount, setVerifiedHitsCount] = useState(0);
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [averageOffset, setAverageOffset] = useState<number[]>([]);
  const [daveAdvice, setDaveAdvice] = useState("Dave says: 'Click Setup & Play to start the lesson!'");

  const [aiCritique, setAiCritique] = useState<string | null>(null);
  const [isGeneratingCritique, setIsGeneratingCritique] = useState(false);
  const [critiqueError, setCritiqueError] = useState<string | null>(null);

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizScore, setQuizScore] = useState<{ score: number; total: number } | null>(null);

  const [showProgressChart, setShowProgressChart] = useState(false);
  const [progressRecords, setProgressRecords] = useState<LessonProgressRecord[]>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  const activeLesson = useMemo(
    () => CURRICULUM.find((l) => l.id === activeLessonId) ?? null,
    [activeLessonId]
  );

  useEffect(() => {
    localStorage.setItem(LS_UNLOCKED, JSON.stringify(unlockedLessons));
  }, [unlockedLessons]);

  useEffect(() => {
    localStorage.setItem(LS_COMPLETED, JSON.stringify(completedLessons));
    onCompletedLessonsChange?.(completedLessons);
  }, [completedLessons, onCompletedLessonsChange]);

  useEffect(() => {
    if (!showProgressChart) return;
    loadProgressRecords();
  }, [showProgressChart]);

  const loadProgressRecords = async () => {
    setIsLoadingChart(true);
    const { data, error } = await supabase
      .from('lesson_progress')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(20);
    if (!error && data) {
      setProgressRecords(data as LessonProgressRecord[]);
    }
    setIsLoadingChart(false);
  };

  const loadLessonSetup = () => {
    if (!activeLesson) return;
    setBpm(activeLesson.bpm);
    setDivision(activeLesson.division);
    setBeatsPerMeasure(activeLesson.beatsPerMeasure);
    setLessonStreak(0);
    setVerifiedHitsCount(0);
    setIsLessonCompleted(false);
    setAverageOffset([]);
    setAiCritique(null);
    setShowQuiz(false);
    setQuizCompleted(false);
    setQuizScore(null);
    setDaveAdvice("Dave says: 'Excellent! Metronome parameters are calibrated. Tap the pads in rhythm!'");
  };

  useEffect(() => {
    if (!isPlaying || !activeLesson || isLessonCompleted) return;
    if (recentTimingHistory.length === 0) return;

    const latestHit = recentTimingHistory[0];
    if (latestHit.type !== activeLesson.focusInstrument) return;

    let isValidHit = false;
    if (activeLesson.id === 'lesson-1-pulse') {
      isValidHit = currentBeat === 0;
    } else if (activeLesson.id === 'lesson-3-backbeat') {
      isValidHit = currentBeat === 1 || currentBeat === 3;
    } else {
      isValidHit = true;
    }

    if (!isValidHit) return;

    const isPerfectOrGood = latestHit.rating === 'Perfect' || latestHit.rating === 'Good';
    setAverageOffset((prev) => [...prev, latestHit.offset].slice(-20));

    if (isPerfectOrGood) {
      setLessonStreak((prev) => {
        const next = prev + 1;
        setVerifiedHitsCount((c) => c + 1);
        setDaveAdvice(
          latestHit.rating === 'Perfect'
            ? "Dave says: 'BOOM! Absolutely perfect timing. You are totally locked in!'"
            : "Dave says: 'Good hit! Keep that steady hand and let the bounce carry you.'"
        );
        if (next >= activeLesson.targetStreak) {
          handleCompleteLesson();
        }
        return next;
      });
    } else {
      setLessonStreak(0);
      setDaveAdvice(
        latestHit.rating === 'Early'
          ? "Dave says: 'Whoops, a little early! You are rushing. Breathe, sit back in the pocket.'"
          : "Dave says: 'A bit late! Anticipate the beat just a tiny fraction of a millisecond.'"
      );
    }
  }, [recentTimingHistory, activeLesson, isPlaying, isLessonCompleted, currentBeat]);

  const handleCompleteLesson = async () => {
    if (!activeLesson) return;
    setIsLessonCompleted(true);
    setDaveAdvice("Dave says: 'STUNNING! Goal met! You have complete control of this lesson!'");

    const wasAlreadyCompleted = completedLessons.includes(activeLesson.id);
    if (!wasAlreadyCompleted) {
      const nextCompleted = [...completedLessons, activeLesson.id];
      setCompletedLessons(nextCompleted);

      const sum = averageOffset.reduce((acc, v) => acc + v, 0);
      const avg = averageOffset.length > 0 ? Math.round(sum / averageOffset.length) : 0;
      const absOffsets = averageOffset.map(Math.abs);
      const absAvg = Math.abs(avg);
      const jitter =
        averageOffset.length > 1
          ? Math.round(
              Math.sqrt(
                absOffsets.reduce((acc, v) => acc + Math.pow(v - absAvg, 2), 0) /
                  averageOffset.length
              )
            )
          : 0;

      await supabase.from('lesson_progress').insert({
        lesson_id: activeLesson.id,
        lesson_title: activeLesson.title,
        avg_offset_ms: avg,
        jitter_ms: jitter,
        streak_achieved: activeLesson.targetStreak,
        session_bpm: bpm,
      });

      setProgressRecords([]);

      CURRICULUM.forEach((lesson) => {
        if (
          !unlockedLessons.includes(lesson.id) &&
          lesson.prerequisites.every((prereq) => nextCompleted.includes(prereq))
        ) {
          setUnlockedLessons((prev) => [...prev, lesson.id]);
        }
      });
    }
  };

  const handleGetAiCritique = async () => {
    if (!activeLesson || isGeneratingCritique) return;
    setIsGeneratingCritique(true);
    setCritiqueError(null);

    const sum = averageOffset.reduce((acc, v) => acc + v, 0);
    const avg = averageOffset.length > 0 ? sum / averageOffset.length : 0;
    const absOffsets = averageOffset.map(Math.abs);
    const jitter =
      averageOffset.length > 1
        ? Math.sqrt(
            absOffsets.reduce((acc, v) => acc + Math.pow(v - Math.abs(avg), 2), 0) /
              averageOffset.length
          )
        : 0;

    try {
      const response = await fetch('/api/instructor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `As Coach Dave, analyze my detailed student lesson run for "${activeLesson.title}" (Difficulty: ${activeLesson.difficulty}).
Session statistics:
- Total successful hits: ${verifiedHitsCount}
- Average offset: ${Math.round(avg)}ms (negative means rushing, positive means dragging)
- Accuracy stability (jitter): ${Math.round(jitter)}ms
- Lesson Objective: "${activeLesson.objective}"
- Target Streak Required: ${activeLesson.targetStreak}

Provide a supportive, high-fidelity critique. Tell me exactly what physical adjustment to make (e.g., finger control, posture, stick height) to improve or master this. Format with clean bullet points and professional terms.`,
          history: [],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch critique.');
      setAiCritique(data.reply);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setCritiqueError(msg);
    } finally {
      setIsGeneratingCritique(false);
    }
  };

  const isLessonUnlocked = (lesson: Lesson) => unlockedLessons.includes(lesson.id);
  const isLessonCompletedCheck = (lesson: Lesson) => completedLessons.includes(lesson.id);

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900/60 backdrop-blur-md space-y-6 w-full mx-auto shadow-2xl">

      <div className="flex items-center justify-between border-b border-slate-900 pb-4">
        <div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Dave's Academy</span>
          <h2 className="font-sans text-lg font-bold text-slate-100 tracking-tight flex items-center gap-1.5 mt-0.5">
            <BookOpen className="h-4.5 w-4.5 text-indigo-400" /> Virtual Lesson Center
          </h2>
        </div>
        <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
          <Trophy className="h-3.5 w-3.5 text-amber-500 animate-bounce" />
          <span className="text-[10px] font-bold font-sans text-indigo-300">
            {completedLessons.length} / {CURRICULUM.length} Completed
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeLessonId ? (
          <motion.div
            key="syllabus"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-900/60 flex items-start gap-2.5">
              <Sparkles className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Unlock progressive lessons to master tempo stability, dynamic accent control, and limb coordination. Each lesson includes a rhythm theory quiz. Complete objectives to earn badges and unlock the next stage!
              </p>
            </div>

            <div className="space-y-3">
              {CURRICULUM.map((lesson) => {
                const unlocked = isLessonUnlocked(lesson);
                const completed = isLessonCompletedCheck(lesson);

                return (
                  <div
                    key={lesson.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      completed
                        ? 'bg-emerald-950/5 border-emerald-900/40'
                        : unlocked
                        ? 'bg-slate-950/60 border-slate-900 hover:border-slate-800'
                        : 'bg-slate-950/20 border-slate-950/50 opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          completed
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : unlocked
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-slate-900 text-slate-600 border border-slate-950'
                        }`}
                      >
                        {lesson.number}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-200 font-sans tracking-tight">{lesson.title}</h4>
                          {completed && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded uppercase">
                              Passed
                            </span>
                          )}
                          {lesson.quizId && (
                            <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded uppercase flex items-center gap-0.5">
                              <Brain className="h-2.5 w-2.5" /> Quiz
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{lesson.objective}</p>
                        <div className="flex items-center gap-2.5 mt-2 font-sans text-[10px] font-semibold">
                          <span
                            className={`px-1.5 py-0.2 rounded uppercase text-[8px] ${
                              lesson.difficulty === 'Beginner'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : lesson.difficulty === 'Intermediate'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {lesson.difficulty}
                          </span>
                          <span className="text-slate-500">Recommended: {lesson.bpm} BPM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      {unlocked ? (
                        <button
                          id={`btn-start-lesson-${lesson.number}`}
                          onClick={() => {
                            setActiveLessonId(lesson.id);
                            setTimeout(() => {
                              const b = document.getElementById('btn-load-lesson-setup');
                              if (b) b.click();
                            }, 50);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-sans font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 border ${
                            completed
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15'
                              : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white shadow-md'
                          }`}
                        >
                          {completed ? 'Review' : 'Start'} <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-600 text-[11px] font-sans">
                          <Lock className="h-3 w-3" /> Locked
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Chart */}
            <div className="border border-slate-900 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowProgressChart((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/60 hover:bg-slate-950 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-400" />
                  <span className="font-sans text-xs font-bold text-slate-300 uppercase tracking-wide">
                    View Session Progress Chart
                  </span>
                </div>
                {showProgressChart ? (
                  <ChevronUp className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                )}
              </button>

              <AnimatePresence>
                {showProgressChart && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 border-t border-slate-900">
                      <LessonProgressChart records={progressRecords} isLoading={isLoadingChart} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <button
                onClick={() => {
                  setActiveLessonId(null);
                  setIsLessonCompleted(false);
                  loadProgressRecords();
                }}
                className="text-xs font-sans text-slate-450 hover:text-slate-200 cursor-pointer flex items-center gap-1 transition-colors"
              >
                ← Back to Syllabus
              </button>
              <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider">
                Lesson {activeLesson?.number} Studio
              </span>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-900 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-indigo-400 animate-pulse" /> {activeLesson?.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">{activeLesson?.instructions}</p>
              </div>

              {activeLesson?.theoryModule && (
                <div className="p-3.5 bg-indigo-950/10 rounded-xl border border-indigo-900/25 flex items-start gap-2.5">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] text-slate-450 leading-relaxed italic">{activeLesson.theoryModule}</p>
                </div>
              )}

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900/80 flex flex-col items-center gap-1">
                <span className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">Pattern schematic</span>
                <span className="font-mono text-xs text-indigo-400 font-extrabold select-none tracking-widest bg-indigo-950/10 px-3 py-1 rounded border border-indigo-950/35">
                  {activeLesson?.schematic}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 p-3 bg-indigo-950/10 border border-indigo-900/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="text-[11px] text-slate-350">
                    Auto-align to{' '}
                    <strong className="text-white font-bold">{activeLesson?.bpm} BPM</strong>,{' '}
                    <strong className="text-white font-bold">
                      {activeLesson?.division === 1
                        ? 'Quarter'
                        : activeLesson?.division === 2
                        ? 'Eighth'
                        : activeLesson?.division === 3
                        ? 'Triplet'
                        : 'Sixteenth'}
                    </strong>{' '}
                    notes.
                  </span>
                </div>
                <button
                  id="btn-load-lesson-setup"
                  onClick={loadLessonSetup}
                  className="bg-indigo-650 hover:bg-indigo-500 text-white font-sans font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg shrink-0 cursor-pointer transition-all active:scale-95"
                >
                  Sync Setup
                </button>
              </div>
            </div>

            {activeLesson?.quizId && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowQuiz((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-950/60 border border-slate-900 hover:border-indigo-900/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-indigo-400" />
                    <span className="font-sans text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                      Theory Quiz
                    </span>
                    {quizCompleted && quizScore && (
                      <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
                        {quizScore.score}/{quizScore.total}
                      </span>
                    )}
                  </div>
                  {showQuiz ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>

                <AnimatePresence>
                  {showQuiz && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <RhythmQuiz
                        quizId={activeLesson.quizId}
                        lessonTitle={activeLesson.title}
                        onComplete={(score, total) => {
                          setQuizCompleted(true);
                          setQuizScore({ score, total });
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold font-sans uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5 text-emerald-400" /> Student Live Evaluator
                </h4>
                <div className="text-[11px] font-mono text-slate-500">
                  Target: <span className="text-emerald-400 font-bold uppercase">{activeLesson?.focusInstrument}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Streak</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-mono font-black text-indigo-400">{lessonStreak}</span>
                    <span className="text-[10px] text-slate-500 font-bold font-sans uppercase">/ {activeLesson?.targetStreak}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, (lessonStreak / (activeLesson?.targetStreak ?? 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Hits</span>
                  <span className="text-2xl font-mono font-black text-emerald-400 mt-1">{verifiedHitsCount}</span>
                  <span className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mt-1">On-Grid Matches</span>
                </div>
              </div>

              <div className="bg-[#0A0A0C] border border-slate-900 p-4 rounded-xl flex items-start gap-3 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-transparent opacity-40" />
                <div className="h-7 w-7 rounded-full bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center shrink-0">
                  <span className="font-sans text-[10px] font-black text-indigo-400">D</span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Coach Dave Advice</div>
                  <p className="text-xs text-slate-350 italic mt-1 leading-relaxed">{daveAdvice}</p>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {isLessonCompleted && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-emerald-950/10 to-slate-950 border border-emerald-900/30 space-y-4"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-sans font-extrabold text-emerald-300">Lesson Mastered!</h4>
                      <p className="text-[11px] text-slate-450 mt-0.5">
                        Excellent job! You maintained a timing streak of {activeLesson?.targetStreak} hits.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      onClick={handleGetAiCritique}
                      disabled={isGeneratingCritique}
                      className="bg-indigo-650 hover:bg-indigo-500 disabled:opacity-50 text-white font-sans font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                      {isGeneratingCritique ? 'Generating...' : "Get Dave's AI Critique"}
                    </button>
                    <button
                      onClick={() => {
                        setActiveLessonId(null);
                        setIsLessonCompleted(false);
                        loadProgressRecords();
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
                    >
                      Continue →
                    </button>
                  </div>

                  {aiCritique && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-[10px] font-sans font-bold uppercase text-indigo-400 flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5" /> Dave's Personalized AI Report
                        </span>
                        <span className="text-[9px] font-mono text-slate-650">Gemini Live Coach</span>
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line pt-1">
                        {aiCritique}
                      </div>
                    </motion.div>
                  )}

                  {critiqueError && (
                    <div className="bg-rose-950/15 border border-rose-900/30 p-3.5 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      {critiqueError}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
