import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'metronome-play-btn',
    title: 'Metronome Playback',
    description: 'Start and stop the precision metronome here. The Web Audio API clock ensures rock-solid timing accuracy down to the millisecond.',
    placement: 'bottom',
  },
  {
    targetId: 'drum-pad-kick',
    title: 'Drum Pads',
    description: 'Click the pads or press keyboard shortcuts (Space/F for kick, S/J for snare, D/K for hi-hat) to practice in real time against the metronome.',
    placement: 'top',
  },
  {
    targetId: 'btn-right-tab-lessons',
    title: 'Virtual Lesson Center',
    description: 'Open the Lesson Center to access a full structured curriculum — from beginner downbeats to advanced syncopated grooves. Complete lessons to unlock the next ones.',
    placement: 'bottom',
  },
  {
    targetId: 'btn-right-tab-rudiments',
    title: 'Rudiment Coach',
    description: 'The Stick Training Engine walks you through all 40 standard rudiments with animated hand patterns. Use the Speed Ramp trainer to build tempo gradually.',
    placement: 'bottom',
  },
  {
    targetId: 'btn-generate-warmup',
    title: 'AI Warm-up Generator',
    description: 'Coach Dave analyzes your recent timing data and generates a personalized 5-minute warm-up routine targeting your specific weaknesses — rushing, dragging, or inconsistency.',
    placement: 'top',
  },
  {
    targetId: 'achievements-header-btn',
    title: 'Achievements & Badges',
    description: 'Earn badges and unlock profile titles as you complete lessons. Track your journey from Recruit all the way to Rhythm Master.',
    placement: 'bottom',
  },
];

const STORAGE_KEY = 'metrome_onboarding_tour_seen_v1';

interface OnboardingTourProps {
  onFinish: () => void;
}

export function OnboardingTour({ onFinish }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];

  useEffect(() => {
    positionTooltip();
    window.addEventListener('resize', positionTooltip);
    return () => window.removeEventListener('resize', positionTooltip);
  }, [currentStep]);

  const positionTooltip = () => {
    const target = document.getElementById(step.targetId);
    if (!target) {
      setSpotlightStyle({ display: 'none' });
      setTooltipStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
      return;
    }

    const rect = target.getBoundingClientRect();
    const padding = 8;

    setSpotlightStyle({
      position: 'fixed',
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      borderRadius: '12px',
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
      zIndex: 50,
      pointerEvents: 'none',
      outline: '2px solid rgba(99,102,241,0.5)',
    });

    const tooltipWidth = 280;
    const tooltipHeight = 160;
    const margin = 12;

    let top = 0;
    let left = 0;

    switch (step.placement) {
      case 'bottom':
        top = rect.bottom + margin;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'top':
        top = rect.top - tooltipHeight - margin;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + margin;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - margin;
        break;
    }

    // Clamp to viewport
    left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, left));
    top = Math.max(12, Math.min(window.innerHeight - tooltipHeight - 12, top));

    setTooltipStyle({
      position: 'fixed',
      top,
      left,
      width: tooltipWidth,
      zIndex: 51,
    });
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((i) => i + 1);
    } else {
      finish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((i) => i - 1);
  };

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onFinish();
  };

  return (
    <>
      {/* Spotlight overlay */}
      <div style={spotlightStyle} />

      {/* Tooltip callout card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`tour-step-${currentStep}`}
          ref={tooltipRef}
          style={tooltipStyle}
          initial={{ opacity: 0, scale: 0.94, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -4 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="bg-[#0F0F11] border border-indigo-900/50 rounded-2xl p-4 shadow-2xl"
        >
          {/* Step indicator + close */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'w-4 bg-indigo-400'
                      : i < currentStep
                      ? 'w-2 bg-slate-600'
                      : 'w-2 bg-slate-800'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={finish}
              className="h-6 w-6 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          <h4 className="font-sans text-sm font-bold text-slate-100 mb-1.5">{step.title}</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">{step.description}</p>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-900">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>

            <span className="text-[9px] font-mono text-slate-600">
              {currentStep + 1} of {TOUR_STEPS.length}
            </span>

            <button
              onClick={handleNext}
              className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

export function shouldShowTour(): boolean {
  try {
    return !localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}
