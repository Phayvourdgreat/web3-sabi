import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getLevel, TOTAL_LESSONS } from '@/lib/constants';
import { ProgressBar } from '@/components/ui';
import type { Lesson, LessonProgress } from '@/types';
import {
  Flame,
  Star,
  Lock,
  CheckCircle2,
  PlayCircle,
  ChevronRight,
  Sparkles,
  TrendingUp,
  MessageCircle,
} from 'lucide-react';

interface DashboardProps {
  onOpenLesson: (lessonId: string) => void;
  onNavigateProgress: () => void;
  onNavigateTutor: () => void;
}

export default function Dashboard({ onOpenLesson, onNavigateProgress, onNavigateTutor }: DashboardProps) {
  const { profile, user, signOut } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [{ data: lessonData }, { data: progressData }] = await Promise.all([
        supabase.from('lessons').select('*').order('lesson_order'),
        supabase.from('lesson_progress').select('*').eq('user_id', user!.id),
      ]);
      setLessons((lessonData as Lesson[]) ?? []);
      setProgress((progressData as LessonProgress[]) ?? []);
      setLoading(false);
    }
    if (user) loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));
  const nextLesson = lessons.find((l) => !completedIds.has(l.id));
  const completedCount = completedIds.size;
  const overallProgress = Math.round((completedCount / TOTAL_LESSONS) * 100);
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const levelInfo = getLevel(xp);

  return (
    <div className="pb-24 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-b from-ink-900 to-ink-950 px-5 pt-10 pb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-lime-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold text-white">Web3 Sabi</span>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Log out
          </button>
        </div>

        <h1 className="text-2xl font-bold text-white text-balance leading-tight">
          Learn Web3, one concept at a time.
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Welcome back, {profile?.name?.split(' ')[0] ?? 'there'}.
        </p>

        {/* Stats Row */}
        <div className="flex items-center gap-3 mt-5">
          <div className="flex items-center gap-1.5 bg-ink-850 border border-ink-700 rounded-xl px-3 py-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-white">{streak}</span>
            <span className="text-xs text-gray-500">day streak</span>
          </div>
          <div className="flex items-center gap-1.5 bg-ink-850 border border-ink-700 rounded-xl px-3 py-2">
            <Star className="w-4 h-4 text-lime-500" />
            <span className="text-sm font-semibold text-white">{xp}</span>
            <span className="text-xs text-gray-500">XP</span>
          </div>
          <div className="flex items-center gap-1.5 bg-ink-850 border border-ink-700 rounded-xl px-3 py-2 ml-auto">
            <span className="text-xs font-semibold text-lime-500">
              Level {levelInfo.level}
            </span>
            <span className="text-xs text-gray-500 hidden sm:inline">{levelInfo.name}</span>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Overall Progress</span>
            <span className="text-xs font-semibold text-white">{overallProgress}%</span>
          </div>
          <ProgressBar value={overallProgress} />
        </div>
      </div>

      {/* Continue Learning */}
      {nextLesson && (
        <div className="px-5 mt-6">
          <h2 className="text-sm font-semibold text-gray-400 mb-3">Continue Learning</h2>
          <button
            onClick={() => onOpenLesson(nextLesson.id)}
            className="w-full bg-ink-850 border border-ink-700 rounded-2xl p-5 text-left hover:border-lime-500/50 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-lime-500 font-semibold mb-1">
                  Lesson {String(nextLesson.lesson_order).padStart(2, '0')}
                </p>
                <h3 className="text-lg font-bold text-white mb-2">{nextLesson.title}</h3>
                <p className="text-sm text-gray-400 line-clamp-2">{nextLesson.explanation}</p>
              </div>
              <div className="ml-3 flex-shrink-0">
                <div className="w-12 h-12 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center group-hover:bg-lime-500/20 transition-colors">
                  <PlayCircle className="w-6 h-6 text-lime-500" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <span className="bg-lime-500 text-ink-950 text-xs font-bold px-4 py-2 rounded-lg group-hover:bg-lime-400 transition-colors">
                Continue
              </span>
              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-lime-500 transition-colors" />
            </div>
          </button>
        </div>
      )}

      {/* Learning Path */}
      <div className="px-5 mt-6">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Your Learning Path</h2>
        <div className="space-y-2.5">
          {lessons.map((lesson) => {
            const isCompleted = completedIds.has(lesson.id);
            const isCurrent = nextLesson?.id === lesson.id;
            const isLocked = !isCompleted && !isCurrent;
            return (
              <button
                key={lesson.id}
                onClick={() => !isLocked && onOpenLesson(lesson.id)}
                disabled={isLocked}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all text-left ${
                  isCompleted
                    ? 'bg-ink-850 border-lime-500/30'
                    : isCurrent
                      ? 'bg-ink-850 border-lime-500/50 hover:border-lime-500'
                      : 'bg-ink-900 border-ink-700 opacity-60 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? 'bg-lime-500/20 border border-lime-500/40'
                      : isCurrent
                        ? 'bg-lime-500/10 border border-lime-500/30'
                        : 'bg-ink-800 border border-ink-700'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-lime-500" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-gray-600" />
                  ) : (
                    <span className="text-xs font-bold text-lime-500">
                      {String(lesson.lesson_order).padStart(2, '0')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{lesson.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isCompleted
                      ? 'Completed'
                      : isCurrent
                        ? 'Ready to start'
                        : 'Coming next'}
                  </p>
                </div>
                {!isLocked && (
                  <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-5 mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={onNavigateProgress}
          className="flex items-center gap-3 bg-ink-850 border border-ink-700 rounded-2xl p-4 hover:border-ink-600 transition-all"
        >
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <span className="text-sm font-medium text-white">My Progress</span>
        </button>
        <button
          onClick={onNavigateTutor}
          className="flex items-center gap-3 bg-ink-850 border border-ink-700 rounded-2xl p-4 hover:border-ink-600 transition-all"
        >
          <MessageCircle className="w-5 h-5 text-lime-500" />
          <span className="text-sm font-medium text-white">Ask AI Tutor</span>
        </button>
      </div>
    </div>
  );
}
