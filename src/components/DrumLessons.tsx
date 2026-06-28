import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  HelpCircle, 
  Info, 
  Lock, 
  Play, 
  RotateCcw, 
  Sparkles, 
  Trophy, 
  Zap, 
  Gauge, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { BeatDivision } from '../types';

interface Lesson {
  id: string;
  number: number;
  title: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  bpm: number;
  division: BeatDivision;
  beatsPerMeasure: number;
  objective: string;
  targetStreak: number;
  instructions: string;
  focusInstrument: 'kick' | 'snare' | 'hihat';
  schematic: string;
}

const SYLLABUS: Lesson[] = [
  {
    id: 'lesson-1-pulse',
    number: 1,
    title: 'The Symmetrical Downbeat',
    difficulty: 'Beginner',
    duration: '1m',
    bpm: 80,
    division: 1, // Quarter notes
    beatsPerMeasure: 4,
    objective: 'Hit the KICK pad exactly on Beat 1 of every bar. Reach a 10-hit streak!',
    targetStreak: 10,
    instructions: 'Welcome to the Academy! Before doing complex rolls, we must find the "One". In 4/4 time, Beat 1 is the downbeat where the song anchors. Practice waiting for the Golden Flash of the first beat and hitting the Bass Kick pad right on time.',
    focusInstrument: 'kick',
    schematic: 'K - - - | K - - - | K - - -'
  },
  {
    id: 'lesson-2-eighths',
    number: 2,
    title: 'Steady Eighth-Note Ride',
    difficulty: 'Beginner',
    duration: '2m',
    bpm: 95,
    division: 2, // Eighth notes
    beatsPerMeasure: 4,
    objective: 'Keep a continuous stream of HI-HAT eighth notes. Maintain a 16-hit streak!',
    targetStreak: 16,
    instructions: 'Time to add subdivision! Eighth notes count as "1 & 2 & 3 & 4 &". You play twice as fast as the quarter-note pulse. Focus on keeping your wrist steady, using standard match grip, and keeping the volume uniform.',
    focusInstrument: 'hihat',
    schematic: 'H H H H H H H H | H H H H H H H H'
  },
  {
    id: 'lesson-3-backbeat',
    number: 3,
    title: 'The Snare Backbeat Pocket',
    difficulty: 'Intermediate',
    duration: '3m',
    bpm: 100,
    division: 2, // Eighth notes
    beatsPerMeasure: 4,
    objective: 'Snap the SNARE exactly on Beats 2 and 4. Reach a 12-hit streak!',
    targetStreak: 12,
    instructions: 'The backbeat is the heartbeat of rock, pop, and blues. The snare on beats 2 and 4 gives the rhythm its forward momentum. Learn to stay relaxed so that you hit precisely on the grid instead of rushing.',
    focusInstrument: 'snare',
    schematic: '- S - S | - S - S'
  },
  {
    id: 'lesson-4-ghosts',
    number: 4,
    title: 'Ghost Note Alternation',
    difficulty: 'Intermediate',
    duration: '4m',
    bpm: 85,
    division: 4, // Sixteenth notes
    beatsPerMeasure: 4,
    objective: 'Strike the SNARE precisely on sixteenth-note divisions. Get a 15-hit streak!',
    targetStreak: 15,
    instructions: 'Ghost notes are faint snare strokes placed between main beats. They add rich groove texture. Keep your hands highly relaxed, use low stick-height (1-2 inches) for ghost taps and standard height (6-8 inches) for accented hits.',
    focusInstrument: 'snare',
    schematic: 'S s s s S s s s | S s s s S s s s'
  },
  {
    id: 'lesson-5-triplets',
    number: 5,
    title: 'Triplet Roll Control',
    difficulty: 'Advanced',
    duration: '5m',
    bpm: 90,
    division: 3, // Triplets
    beatsPerMeasure: 4,
    objective: 'Execute a steady triplet roll (3 hits per beat). Achieve a 24-hit streak!',
    targetStreak: 24,
    instructions: 'Triplets split each beat into three equal divisions: "1-and-a 2-and-a". Since it is an odd subdivision, the leading hand alternates every single beat (Right on Beat 1, Left on Beat 2). Focus on precise, symmetrical spacing.',
    focusInstrument: 'snare',
    schematic: 'R L R L R L | R L R L R L'
  }
];

interface DrumLessonsProps {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  currentSubdivision: number;
  division: BeatDivision;
  beatsPerMeasure: number;
  recentTimingHistory: { id: string; offset: number; type: 'kick' | 'snare' | 'hihat'; rating: 'Perfect' | 'Good' | 'Early' | 'Late' }[];
  setBpm: (bpm: number) => void;
  setDivision: (div: BeatDivision) => void;
  setBeatsPerMeasure: (beats: number) => void;
  togglePlayback: () => void;
}

export function DrumLessons({
  isPlaying,
  bpm,
  currentBeat,
  currentSubdivision,
  division,
  beatsPerMeasure,
  recentTimingHistory,
  setBpm,
  setDivision,
  setBeatsPerMeasure,
  togglePlayback
}: DrumLessonsProps) {
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('metrome_drum_coach_unlocked_lessons');
      return saved ? JSON.parse(saved) : ['lesson-1-pulse'];
    } catch {
      return ['lesson-1-pulse'];
    }
  });

  const [completedLessons, setCompletedLessons] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('metrome_drum_coach_completed_lessons');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  
  // Lesson progression/live tracking
  const [lessonStreak, setLessonStreak] = useState(0);
  const [verifiedHitsCount, setVerifiedHitsCount] = useState(0);
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [averageOffset, setAverageOffset] = useState<number[]>([]);
  const [daveAdvice, setDaveAdvice] = useState<string>("Dave says: 'Click Setup & Play to start the lesson!'");
  
  // AI Feedback Modal / state
  const [aiCritique, setAiCritique] = useState<string | null>(null);
  const [isGeneratingCritique, setIsGeneratingCritique] = useState(false);
  const [critiqueError, setCritiqueError] = useState<string | null>(null);

  const activeLesson = useMemo(() => {
    return SYLLABUS.find(l => l.id === activeLessonId) || null;
  }, [activeLessonId]);

  // Sync unlocked lessons to localStorage
  useEffect(() => {
    localStorage.setItem('metrome_drum_coach_unlocked_lessons', JSON.stringify(unlockedLessons));
  }, [unlockedLessons]);

  // Sync completed lessons to localStorage
  useEffect(() => {
    localStorage.setItem('metrome_drum_coach_completed_lessons', JSON.stringify(completedLessons));
  }, [completedLessons]);

  // Sync metronome settings to active lesson recommendation
  const loadLessonSetup = () => {
    if (!activeLesson) return;
    setBpm(activeLesson.bpm);
    setDivision(activeLesson.division);
    setBeatsPerMeasure(activeLesson.beatsPerMeasure);
    // Reset live stats
    setLessonStreak(0);
    setVerifiedHitsCount(0);
    setIsLessonCompleted(false);
    setAverageOffset([]);
    setAiCritique(null);
    setDaveAdvice("Dave says: 'Excellent! Metronome parameters are calibrated. Tap the pads in rhythm!'");
  };

  // Monitor live history of hits for lesson objective checks
  useEffect(() => {
    if (!isPlaying || !activeLesson || isLessonCompleted) return;
    if (recentTimingHistory.length === 0) return;

    const latestHit = recentTimingHistory[0];

    // Verify if hit belongs to the focused instrument of the lesson
    if (latestHit.type !== activeLesson.focusInstrument) return;

    // Lesson-specific validations
    let isValidHit = false;

    if (activeLesson.id === 'lesson-1-pulse') {
      // Must be Beat 1 (currentBeat === 0)
      if (currentBeat === 0) {
        isValidHit = true;
      }
    } else if (activeLesson.id === 'lesson-3-backbeat') {
      // Snare on Beat 2 (currentBeat === 1) or Beat 4 (currentBeat === 3)
      if (currentBeat === 1 || currentBeat === 3) {
        isValidHit = true;
      }
    } else {
      // Other lessons evaluate standard hits on focus instrument
      isValidHit = true;
    }

    if (isValidHit) {
      const isPerfectOrGood = latestHit.rating === 'Perfect' || latestHit.rating === 'Good';
      
      setAverageOffset(prev => [...prev, latestHit.offset].slice(-20));

      if (isPerfectOrGood) {
        setLessonStreak(prev => {
          const next = prev + 1;
          setVerifiedHitsCount(c => c + 1);

          // Update Dave's Dynamic Advice
          if (latestHit.rating === 'Perfect') {
            setDaveAdvice("Dave says: 'BOOM! Absolutely perfect timing. You are totally locked in!'");
          } else {
            setDaveAdvice("Dave says: 'Good hit! Keep that steady hand and let the bounce carry you.'");
          }

          // Check for lesson completion
          if (next >= activeLesson.targetStreak) {
            handleCompleteLesson();
          }

          return next;
        });
      } else {
        setLessonStreak(0);
        if (latestHit.rating === 'Early') {
          setDaveAdvice("Dave says: 'Whoops, a little early! You are rushing. Breathe, sit back in the pocket.'");
        } else if (latestHit.rating === 'Late') {
          setDaveAdvice("Dave says: 'A bit late! Anticipate the beat just a tiny fraction of a millisecond.'");
        }
      }
    }
  }, [recentTimingHistory, activeLesson, isPlaying, isLessonCompleted, currentBeat]);

  const handleCompleteLesson = () => {
    if (!activeLesson) return;
    setIsLessonCompleted(true);
    setDaveAdvice("Dave says: 'STUNNING! Goal met! You have complete control of this lesson!'");
    
    // Add to completed list
    if (!completedLessons.includes(activeLesson.id)) {
      setCompletedLessons(prev => [...prev, activeLesson.id]);
    }

    // Unlock next lesson
    const currentIdx = SYLLABUS.findIndex(l => l.id === activeLesson.id);
    if (currentIdx < SYLLABUS.length - 1) {
      const nextLesson = SYLLABUS[currentIdx + 1];
      if (!unlockedLessons.includes(nextLesson.id)) {
        setUnlockedLessons(prev => [...prev, nextLesson.id]);
      }
    }
  };

  const handleGetAiCritique = async () => {
    if (!activeLesson || isGeneratingCritique) return;
    
    setIsGeneratingCritique(true);
    setCritiqueError(null);

    const sum = averageOffset.reduce((acc, v) => acc + v, 0);
    const avg = averageOffset.length > 0 ? sum / averageOffset.length : 0;
    const absOffsets = averageOffset.map(Math.abs);
    const jitter = averageOffset.length > 1 
      ? Math.sqrt(absOffsets.reduce((acc, v) => acc + Math.pow(v - Math.abs(avg), 2), 0) / averageOffset.length)
      : 0;

    const requestBody = {
      message: `As Coach Dave, analyze my detailed student lesson run for "${activeLesson.title}" (Difficulty: ${activeLesson.difficulty}).
Session statistics:
- Total successful hits: ${verifiedHitsCount}
- Average offset: ${Math.round(avg)}ms (negative means rushing, positive means dragging)
- Accuracy stability (jitter): ${Math.round(jitter)}ms
- Lesson Objective: "${activeLesson.objective}"
- Target Streak Required: ${activeLesson.targetStreak}

Provide a supportive, high-fidelity critique. Tell me exactly what physical adjustment to make (e.g., finger control, posture, stick height) to improve or master this. Format with clean bullet points and professional terms.`,
      history: []
    };

    try {
      const response = await fetch('/api/instructor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch critique.");
      setAiCritique(data.reply);
    } catch (err: any) {
      console.error(err);
      setCritiqueError(err.message || "Something went wrong.");
    } finally {
      setIsGeneratingCritique(false);
    }
  };

  return (
    <div className="bg-[#0F0F11] p-6 rounded-3xl border border-slate-900/60 backdrop-blur-md space-y-6 w-full mx-auto shadow-2xl">
      
      {/* Academy Header Banner */}
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
            {completedLessons.length} / {SYLLABUS.length} Completed
          </span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!activeLessonId ? (
          /* View 1: Syllabus Timeline */
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
                Unlock progressive lessons to master tempo stability, dynamic accent control, and limb coordination. Complete lesson objectives to gain badges and unlock advanced courses!
              </p>
            </div>

            <div className="space-y-3">
              {SYLLABUS.map((lesson, idx) => {
                const isUnlocked = unlockedLessons.includes(lesson.id);
                const isCompleted = completedLessons.includes(lesson.id);
                
                return (
                  <div 
                    key={lesson.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      isCompleted 
                        ? 'bg-emerald-950/5 border-emerald-900/40' 
                        : isUnlocked 
                        ? 'bg-slate-950/60 border-slate-900 hover:border-slate-800' 
                        : 'bg-slate-950/20 border-slate-950/50 opacity-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isCompleted 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : isUnlocked 
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                          : 'bg-slate-900 text-slate-600 border border-slate-950'
                      }`}>
                        {lesson.number}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-200 font-sans tracking-tight">
                            {lesson.title}
                          </h4>
                          {isCompleted && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded uppercase">
                              Passed
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                          {lesson.objective}
                        </p>
                        <div className="flex items-center gap-2.5 mt-2 font-sans text-[10px] font-semibold text-slate-550">
                          <span className={`px-1.5 py-0.2 rounded uppercase text-[8px] ${
                            lesson.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400' :
                            lesson.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {lesson.difficulty}
                          </span>
                          <span>• Recommended: {lesson.bpm} BPM</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      {isUnlocked ? (
                        <button
                          id={`btn-start-lesson-${lesson.number}`}
                          onClick={() => {
                            setActiveLessonId(lesson.id);
                            // Auto select lesson details on entering
                            setTimeout(() => {
                              const b = document.getElementById('btn-load-lesson-setup');
                              if (b) b.click();
                            }, 50);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-sans font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95 border ${
                            isCompleted
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15'
                              : 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white shadow-md'
                          }`}
                        >
                          {isCompleted ? 'Review' : 'Start'} <ChevronRight className="h-3.5 w-3.5" />
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
          </motion.div>
        ) : (
          /* View 2: Active Lesson Studio */
          <motion.div
            key="studio"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Header / Back navigation */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-3">
              <button
                id="btn-lesson-back"
                onClick={() => {
                  setActiveLessonId(null);
                  setIsLessonCompleted(false);
                }}
                className="text-xs font-sans text-slate-450 hover:text-slate-200 cursor-pointer flex items-center gap-1 transition-colors"
              >
                ← Back to Syllabus
              </button>
              <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-wider">
                Lesson {activeLesson?.number} Studio
              </span>
            </div>

            {/* Lesson Prompt & Schematic */}
            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-900 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-indigo-400 animate-pulse" /> {activeLesson?.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  {activeLesson?.instructions}
                </p>
              </div>

              {/* Focus pattern schematic display */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900/80 flex flex-col items-center justify-center gap-1">
                <span className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">Pattern schematic</span>
                <span className="font-mono text-xs text-indigo-400 font-extrabold select-none tracking-widest bg-indigo-950/10 px-3 py-1 rounded border border-indigo-950/35">
                  {activeLesson?.schematic}
                </span>
              </div>

              {/* Sync Metronome Button */}
              <div className="flex items-center justify-between gap-4 p-3 bg-indigo-950/10 border border-indigo-900/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-indigo-400 shrink-0" />
                  <span className="text-[11px] text-slate-350">
                    Auto-align metronome to <strong className="text-white font-bold">{activeLesson?.bpm} BPM</strong>, <strong className="text-white font-bold">{activeLesson?.division === 1 ? 'Quarter' : activeLesson?.division === 2 ? 'Eighth' : activeLesson?.division === 3 ? 'Triplet' : 'Sixteenth'}</strong> subdivisions.
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

            {/* Student Live Evaluator Panel */}
            <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold font-sans uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5 text-emerald-400" /> Student Live Evaluator
                </h4>
                <div className="text-[11px] font-mono text-slate-500">
                  Target Instrument: <span className="text-emerald-400 font-bold uppercase">{activeLesson?.focusInstrument}</span>
                </div>
              </div>

              {/* Live Metric Stats Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Streak</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-mono font-black text-indigo-400">
                      {lessonStreak}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold font-sans uppercase">
                      / {activeLesson?.targetStreak}
                    </span>
                  </div>
                  {/* Streak progress bar */}
                  <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-300" 
                      style={{ width: `${Math.min(100, (lessonStreak / (activeLesson?.targetStreak || 1)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex flex-col items-center text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Hits</span>
                  <span className="text-2xl font-mono font-black text-emerald-400 mt-1">
                    {verifiedHitsCount}
                  </span>
                  <span className="text-[9px] text-slate-600 uppercase font-bold tracking-widest mt-1">
                    On-Grid Matches
                  </span>
                </div>
              </div>

              {/* Dave Coach Live Feedback Bubble */}
              <div className="bg-[#0A0A0C] border border-slate-900 p-4 rounded-xl flex items-start gap-3 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-transparent opacity-40" />
                <div className="h-7 w-7 rounded-full bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center shrink-0">
                  <span className="font-sans text-[10px] font-black text-indigo-400">D</span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Coach Dave Advice</div>
                  <p className="text-xs text-slate-350 italic mt-1 leading-relaxed">
                    {daveAdvice}
                  </p>
                </div>
              </div>
            </div>

            {/* Lesson Completion Alert / Custom AI Critique Area */}
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
                      <h4 className="text-sm font-sans font-extrabold text-emerald-300">
                        Lesson Mastered!
                      </h4>
                      <p className="text-[11px] text-slate-450 mt-0.5">
                        Excellent job! You successfully maintained a perfect timing streak of {activeLesson?.targetStreak} hits.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      id="btn-get-ai-critique"
                      onClick={handleGetAiCritique}
                      disabled={isGeneratingCritique}
                      className="bg-indigo-650 hover:bg-indigo-500 disabled:opacity-50 text-white font-sans font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-indigo-950/30 shrink-0"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                      {isGeneratingCritique ? 'Generating Critique...' : "Get Dave's AI Critique"}
                    </button>

                    <button
                      id="btn-unlock-next-lesson"
                      onClick={() => {
                        setActiveLessonId(null);
                        setIsLessonCompleted(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-950/30"
                    >
                      Unlock Next Lesson →
                    </button>
                  </div>

                  {/* AI Critique Box */}
                  {aiCritique && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-950/90 border border-slate-900 p-4 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                        <span className="text-[10px] font-sans font-bold uppercase text-indigo-400 flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-indigo-400" /> Dave's Personalized AI Report
                        </span>
                        <span className="text-[9px] font-mono text-slate-650">Gemini Live Coach</span>
                      </div>
                      <div className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line prose prose-invert max-w-none pt-1">
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
