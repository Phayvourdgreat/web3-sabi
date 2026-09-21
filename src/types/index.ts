export interface Profile {
  id: string;
  name: string;
  email: string;
  xp: number;
  streak: number;
  last_lesson_date: string | null;
  created_at: string;
}

export interface Lesson {
  id: string;
  title: string;
  explanation: string;
  analogy: string;
  example: string;
  quiz_question: string;
  quiz_answer: string;
  quiz_wrong_answers: string[] | null;
  alternative_explanation: string | null;
  lesson_order: number;
  created_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  xp_earned: number;
  completed_at: string | null;
  created_at: string;
}

export type Screen =
  | { name: 'dashboard' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'progress' }
  | { name: 'ai-tutor' }
  | { name: 'quests' };

export interface ChatMessage {
  id: string;
  role: 'user' | 'tutor';
  text: string;
  audio: string | null;
  image: string | null;
}