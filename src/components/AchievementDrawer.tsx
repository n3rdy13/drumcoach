import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  Star,
  Award,
  Flame,
  Zap,
  Music,
  Target,
  Crown,
  Shield,
  Lock,
  X,
  ChevronRight,
} from 'lucide-react';
import { BADGE_DEFINITIONS, BadgeDefinition, getProfileTitle } from '../types';
import { supabase, UserAchievementRecord } from '../lib/supabaseClient';

interface AchievementDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  completedLessonIds: string[];
}

const ICON_MAP: Record<BadgeDefinition['iconName'], React.ElementType> = {
  Star,
  Award,
  Trophy,
  Flame,
  Zap,
  Music,
  Target,
  Crown,
  Shield,
};

export function AchievementDrawer({ isOpen, onClose, completedLessonIds }: AchievementDrawerProps) {
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    loadEarnedBadges();
  }, [isOpen]);

  useEffect(() => {
    checkAndAwardBadges();
  }, [completedLessonIds]);

  const loadEarnedBadges = async () => {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('badge_id');
    if (!error && data) {
      setEarnedBadgeIds(data.map((r: { badge_id: string }) => r.badge_id));
    }
  };

  const checkAndAwardBadges = async () => {
    for (const badge of BADGE_DEFINITIONS) {
      if (badge.requirement(completedLessonIds)) {
        const { error } = await supabase
          .from('user_achievements')
          .upsert({ badge_id: badge.id }, { onConflict: 'badge_id', ignoreDuplicates: true });
        if (!error) {
          setEarnedBadgeIds((prev) =>
            prev.includes(badge.id) ? prev : [...prev, badge.id]
          );
        }
      }
    }
  };

  const profileTitle = getProfileTitle(completedLessonIds.length);
  const earnedCount = earnedBadgeIds.length;
  const totalCount = BADGE_DEFINITIONS.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer Panel */}
          <motion.div
            key="drawer-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 35 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0A0A0C] border-l border-slate-900 z-50 flex flex-col shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-900 bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Trophy className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-sans text-sm font-bold text-slate-100 tracking-tight">Achievements</h3>
                  <p className="text-[10px] font-mono text-slate-500">{earnedCount}/{totalCount} badges earned</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Profile Title Banner */}
            <div className="mx-5 mt-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-950/30 via-slate-950/30 to-amber-950/10 border border-indigo-900/30">
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500">Your Profile Title</p>
              <p className="text-xl font-sans font-black text-white mt-1 tracking-tight">{profileTitle}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (completedLessonIds.length / 10) * 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full"
                  />
                </div>
                <span className="font-mono text-[9px] font-bold text-slate-500 shrink-0">
                  {completedLessonIds.length}/10
                </span>
              </div>
            </div>

            {/* Badge Grid */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
              <p className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest">
                Badges
              </p>

              <div className="grid grid-cols-1 gap-3">
                {BADGE_DEFINITIONS.map((badge) => {
                  const isEarned = earnedBadgeIds.includes(badge.id);
                  const IconComponent = ICON_MAP[badge.iconName];

                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                        isEarned
                          ? `bg-slate-950 border-slate-800 shadow-lg ${badge.glowClass}`
                          : 'bg-slate-950/30 border-slate-900/50 opacity-40'
                      }`}
                    >
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isEarned
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-slate-950 border-slate-900'
                      }`}>
                        {isEarned ? (
                          <IconComponent className={`h-5 w-5 ${badge.colorClass}`} />
                        ) : (
                          <Lock className="h-4 w-4 text-slate-700" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`font-sans text-xs font-bold tracking-tight truncate ${
                            isEarned ? 'text-slate-100' : 'text-slate-600'
                          }`}>
                            {badge.title}
                          </p>
                          {isEarned && (
                            <span className="text-[8px] font-bold font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase shrink-0">
                              Earned
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
                          {badge.description}
                        </p>
                      </div>

                      {isEarned && (
                        <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${badge.colorClass} opacity-50`} />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-900 bg-slate-950/50">
              <p className="text-[9px] font-mono text-slate-600 text-center">
                Complete lessons to earn badges and unlock new profile titles.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
