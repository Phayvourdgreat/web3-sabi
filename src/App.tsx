import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Lesson } from '@/types';
import { FullScreenLoader } from '@/components/ui';
import AuthScreen from '@/screens/AuthScreen';
import Dashboard from '@/screens/Dashboard';
import LessonScreen from '@/screens/LessonScreen';
import AITutor from '@/screens/AITutor';
import ProgressPage from '@/screens/ProgressPage';
import BottomNav from '@/components/BottomNav';
import type { Screen } from '@/types';

function AppContent() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState<Screen>({ name: 'dashboard' });
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  if (loading) return <FullScreenLoader />;
  if (!user) return <AuthScreen />;

  const showBottomNav =
    screen.name === 'dashboard' || screen.name === 'progress' || screen.name === 'ai-tutor';

  function navigate(s: Screen) {
    setScreen(s);
  }

  function openLesson(lessonId: string) {
    setScreen({ name: 'lesson', lessonId });
  }

  async function openTutorWithLesson(lesson: Lesson) {
    setActiveLesson(lesson);
    setScreen({ name: 'ai-tutor' });
  }

  let content;
  if (screen.name === 'dashboard') {
    content = (
      <Dashboard
        onOpenLesson={openLesson}
        onNavigateProgress={() => navigate({ name: 'progress' })}
        onNavigateTutor={() => { setActiveLesson(null); navigate({ name: 'ai-tutor' }); }}
      />
    );
  } else if (screen.name === 'lesson') {
    content = (
      <LessonScreen
        lessonId={screen.lessonId}
        onBack={() => navigate({ name: 'dashboard' })}
        onNavigateTutor={async (lessonId: string) => {
          const { data } = await supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle();
          if (data) openTutorWithLesson(data as Lesson);
          else navigate({ name: 'ai-tutor' });
        }}
        onComplete={() => navigate({ name: 'dashboard' })}
      />
    );
  } else if (screen.name === 'progress') {
    content = (
      <ProgressPage
        onBack={() => navigate({ name: 'dashboard' })}
        onOpenLesson={openLesson}
      />
    );
  } else if (screen.name === 'ai-tutor') {
    content = <AITutor onBack={() => navigate({ name: 'dashboard' })} lesson={activeLesson} />;
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <div className="max-w-md mx-auto min-h-screen relative">
        {content}
        {showBottomNav && <BottomNav current={screen.name} onNavigate={navigate} />}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
