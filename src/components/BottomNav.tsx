import { Home, BookOpen, TrendingUp, MessageCircle, Target } from 'lucide-react';
import type { Screen } from '@/types';

interface NavProps {
  current: string;
  onNavigate: (screen: Screen) => void;
}

const items = [
  { key: 'dashboard', label: 'Home', icon: Home },
  { key: 'lesson', label: 'Learn', icon: BookOpen },
  { key: 'quests', label: 'Quests', icon: Target },
  { key: 'progress', label: 'Progress', icon: TrendingUp },
  { key: 'ai-tutor', label: 'AI Tutor', icon: MessageCircle },
];

export default function BottomNav({ current, onNavigate }: NavProps) {
  const activeKey =
    current === 'lesson' ? 'lesson' : current === 'ai-tutor' ? 'ai-tutor' : current;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-ink-900/95 backdrop-blur-md border-t border-ink-700 px-2 py-2 z-40">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeKey === item.key;
          const screen: Screen =
            item.key === 'lesson'
              ? { name: 'dashboard' }
              : item.key === 'quests'
                ? { name: 'quests' }
                : item.key === 'progress'
                  ? { name: 'progress' }
                  : item.key === 'ai-tutor'
                    ? { name: 'ai-tutor' }
                    : { name: 'dashboard' };
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(screen)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? 'text-lime-500' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}