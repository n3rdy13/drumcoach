import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleCheck as CheckCircle2, Circle as XCircle, Circle as HelpCircle, ChevronRight, RotateCcw, Brain } from 'lucide-react';
import { QuizQuestion, QuizAttempt } from '../types';
import { QUIZ_BANK } from '../data/quizBank';
import { supabase, SESSION_ID } from '../lib/supabaseClient';

interface RhythmQuizProps {
  quizId: string;
  lessonTitle: string;
  onComplete: (score: number, total: number) => void;
}

export function RhythmQuiz({ quizId, lessonTitle, onComplete }: RhythmQuizProps) {
  const questions: QuizQuestion[] = QUIZ_BANK[quizId] ?? [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  if (questions.length === 0) return null;

  const current = questions[currentIndex];
  const score = attempts.filter((a) => a.wasCorrect).length;

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelectedOption(index);
    setRevealed(true);

    const wasCorrect = index === current.correctIndex;
    const attempt: QuizAttempt = {
      questionId: current.id,
      selectedIndex: index,
      wasCorrect,
    };
    setAttempts((prev) => [...prev, attempt]);

    supabase.from('quiz_attempts').insert({
      quiz_id: quizId,
      question_id: current.id,
      was_correct: wasCorrect,
      session_id: SESSION_ID,
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setRevealed(false);
    } else {
      setIsComplete(true);
      onComplete(score + (selectedOption === current.correctIndex ? 1 : 0), questions.length);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setAttempts([]);
    setSelectedOption(null);
    setRevealed(false);
    setIsComplete(false);
  };

  const finalScore = attempts.filter((a) => a.wasCorrect).length;
  const pct = Math.round((finalScore / questions.length) * 100);

  return (
    <div className="bg-slate-950/70 rounded-2xl border border-slate-900 overflow-hidden">
      {/* Quiz Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-900 bg-indigo-950/10">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-400" />
          <span className="font-sans text-[11px] font-bold text-slate-200 uppercase tracking-wide">
            Rhythm Theory Quiz
          </span>
        </div>
        {!isComplete && (
          <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-900">
            {currentIndex + 1} / {questions.length}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isComplete ? (
          /* Completion Summary */
          <motion.div
            key="quiz-complete"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="p-5 space-y-4"
          >
            <div className="text-center space-y-2">
              <div className={`text-4xl font-mono font-black ${
                pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {pct}%
              </div>
              <p className="font-sans text-xs font-bold text-slate-300">
                {finalScore}/{questions.length} correct
              </p>
              <p className="text-[11px] text-slate-500 italic leading-relaxed">
                {pct === 100
                  ? `Perfect score! You have mastered the theory of "${lessonTitle}".`
                  : pct >= 80
                  ? 'Excellent work! You have a strong grasp of this concept.'
                  : pct >= 50
                  ? 'Good effort. Review the explanations below to solidify the concepts.'
                  : 'Keep studying! Coach Dave recommends revisiting the lesson theory before continuing.'}
              </p>
            </div>

            {/* Per-question review */}
            <div className="space-y-2">
              {questions.map((q, idx) => {
                const attempt = attempts[idx];
                if (!attempt) return null;
                return (
                  <div key={q.id} className={`p-3 rounded-xl border text-[10px] flex items-start gap-2 ${
                    attempt.wasCorrect
                      ? 'bg-emerald-950/10 border-emerald-900/30'
                      : 'bg-rose-950/10 border-rose-900/30'
                  }`}>
                    {attempt.wasCorrect ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-bold ${attempt.wasCorrect ? 'text-slate-300' : 'text-rose-300'}`}>
                        Q{idx + 1}: {q.prompt}
                      </p>
                      {!attempt.wasCorrect && (
                        <p className="text-slate-500 mt-0.5 leading-relaxed">
                          Correct: <span className="text-emerald-400 font-semibold">{q.options[q.correctIndex]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleRetry}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-98"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Retry Quiz
            </button>
          </motion.div>
        ) : (
          /* Question Card */
          <motion.div
            key={`question-${currentIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="p-5 space-y-4"
          >
            {/* Question progress bar */}
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
              />
            </div>

            <p className="font-sans text-xs font-semibold text-slate-100 leading-relaxed">
              {current.prompt}
            </p>

            {/* Options */}
            <div className="space-y-2">
              {current.options.map((option, idx) => {
                let stateClasses = 'bg-slate-950 border-slate-900 text-slate-300 hover:border-indigo-500/40 hover:text-slate-100 cursor-pointer';
                if (revealed) {
                  if (idx === current.correctIndex) {
                    stateClasses = 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300 cursor-default';
                  } else if (idx === selectedOption && idx !== current.correctIndex) {
                    stateClasses = 'bg-rose-950/20 border-rose-500/40 text-rose-300 cursor-default';
                  } else {
                    stateClasses = 'bg-slate-950 border-slate-900/50 text-slate-600 cursor-default opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={revealed}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-[11px] font-sans font-medium transition-all flex items-center justify-between gap-2 ${stateClasses}`}
                  >
                    <span>{option}</span>
                    {revealed && idx === current.correctIndex && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                    {revealed && idx === selectedOption && idx !== current.correctIndex && (
                      <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start gap-2 bg-slate-950 border border-slate-900 rounded-xl p-3"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] text-slate-400 leading-relaxed">{current.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next button */}
            {revealed && (
              <motion.button
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-98"
              >
                {currentIndex < questions.length - 1 ? (
                  <>Next Question <ChevronRight className="h-3.5 w-3.5" /></>
                ) : (
                  <>Finish Quiz <CheckCircle2 className="h-3.5 w-3.5" /></>
                )}
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
