import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getLevel, TOTAL_LESSONS } from '@/lib/constants';
import { ProgressBar } from '@/components/ui';
import type { Lesson, LessonProgress } from '@/types';
import {
  ArrowLeft,
  Flame,
  Star,
  Trophy,
  CheckCircle2,
  Lock,
  BookOpen,
  Target,
  TrendingUp,
} from 'lucide-react';

interface ProgressPageProps {
  onBack: () => void;
  onOpenLesson: (lessonId: string) => void;
}

export default function ProgressPage({ onBack, onOpenLesson }: ProgressPageProps) {
  const { profile, user } = useAuth();
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
      <div className="flex items-center justify-center min-h-screen bg-ink-950">
        <div className="w-6 h-6 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.lesson_id));
  const completedCount = completedIds.size;
  const nextLesson = lessons.find((l) => !completedIds.has(l.id));
  const overallProgress = Math.round((completedCount / TOTAL_LESSONS) * 100);
  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;
  const levelInfo = getLevel(xp);

  const stats = [
    { icon: Star, label: 'Total XP', value: xp, color: 'text-lime-500' },
    { icon: Flame, label: 'Day Streak', value: streak, color: 'text-orange-400' },
    { icon: CheckCircle2, label: 'Lessons Done', value: `${completedCount}/${TOTAL_LESSONS}`, color: 'text-cyan-400' },
    { icon: TrendingUp, label: 'Progress', value: `${overallProgress}%`, color: 'text-lime-500' },
  ];

  return (
    <div className="min-h-screen bg-ink-950 pb-24 animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 bg-ink-950/95 backdrop-blur-md border-b border-ink-800 px-5 py-4 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-ink-850 border border-ink-700 flex items-center justify-center hover:border-ink-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <h1 className="text-lg font-bold text-white">My Progress</h1>
        </div>
      </div>

      <div className="px-5 mt-6">
        {/* Level Card */}
        <div className="bg-gradient-to-br from-lime-500/10 to-cyan-500/5 border border-lime-500/30 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-lime-500/20 border border-lime-500/40 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-lime-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Current Level</p>
              <p className="text-lg font-bold text-white">
                Level {levelInfo.level} {levelInfo.name}
              </p>
            </div>
          </div>
          {levelInfo.nextName && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">
                  Next: {levelInfo.nextName}
                </span>
                <span className="text-xs font-semibold text-lime-500">
                  {levelInfo.progressIntoLevel}%
                </span>
              </div>
              <ProgressBar value={levelInfo.progressIntoLevel} />
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-ink-850 border border-ink-700 rounded-2xl p-4"
              >
                <Icon className={`w-5 h-5 mb-2 ${stat.color}`} />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            );
          })}
        </div>

        {/* Overall Progress Bar */}
        <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-lime-500" />
            <h2 className="text-sm font-semibold text-white">Overall Progress</h2>
          </div>
          <ProgressBar value={overallProgress} className="h-3" />
          <p className="text-xs text-gray-500 mt-2">
            {completedCount} of {TOTAL_LESSONS} lessons completed
          </p>
        </div>

        {/* Lessons Breakdown */}
        <h2 className="text-sm font-semibold text-gray-400 mb-3">Lesson Details</h2>
        <div className="space-y-2.5">
          {lessons.map((lesson) => {
            const isCompleted = completedIds.has(lesson.id);
            const isCurrent = nextLesson?.id === lesson.id;
            const isLocked = !isCompleted && !isCurrent;
            return (
              <div
                key={lesson.id}
                className={`flex items-center gap-3 p-4 rounded-2xl border ${
                  isCompleted
                    ? 'bg-ink-850 border-lime-500/30'
                    : isCurrent
                      ? 'bg-ink-850 border-lime-500/50'
                      : 'bg-ink-900 border-ink-700 opacity-60'
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
                    <BookOpen className="w-5 h-5 text-lime-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {String(lesson.lesson_order).padStart(2, '0')}. {lesson.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isCompleted
                      ? 'Completed'
                      : isCurrent
                        ? 'In progress, ready to start'
                        : 'Locked'}
                  </p>
                </div>
                {!isLocked && (
                  <button
                    onClick={() => onOpenLesson(lesson.id)}
                    className="text-xs font-medium text-lime-500 hover:text-lime-400 transition-colors px-3 py-1.5 rounded-lg bg-lime-500/10 border border-lime-500/20"
                  >
                    {isCompleted ? 'Review' : 'Start'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
