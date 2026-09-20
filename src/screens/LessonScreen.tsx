import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { generateQuizOptions } from '@/lib/quiz';
import { visualSteps } from '@/lib/visualSteps';
import { askTutor, type TutorResponse } from '@/lib/tutor';
import { sabiRequest, getSessionId } from '@/lib/sabiApi';
import { XP_PER_QUIZ } from '@/lib/constants';
import AudioPlayer from '@/components/AudioPlayer';
import BrowserAudioPlayer from '@/components/BrowserAudioPlayer';
import type { Lesson, LessonProgress } from '@/types';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Sparkles,
  HelpCircle,
  MessageCircle,
  Star,
  ArrowRight,
  BookOpen,
  MapPin,
  Target,
  Check,
  ImageIcon,
  Volume2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface LessonScreenProps {
  lessonId: string;
  onBack: () => void;
  onNavigateTutor: (lessonId: string) => void;
  onComplete: () => void;
}

const STEPS = ['Explanation', 'Visual', 'Analogy', 'Takeaway'] as const;

export default function LessonScreen({ lessonId, onBack, onNavigateTutor, onComplete }: LessonScreenProps) {
  const { user, refreshProfile } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<LessonProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0-3 lesson content, 4 = quiz
  const [showAlt, setShowAlt] = useState(false);
  const [altText, setAltText] = useState<string | null>(null);
  const [altAudio, setAltAudio] = useState<string | null>(null);
  const [altImage, setAltImage] = useState<string | null>(null);
  const [altLoading, setAltLoading] = useState(false);

  // Image and Audio generation state (cached per lesson)
  const [genImage, setGenImage] = useState<string | null>(null);
  const [genImageLoading, setGenImageLoading] = useState(false);
  const [genImageError, setGenImageError] = useState<string | null>(null);
  const [genAudio, setGenAudio] = useState<string | null>(null);
  const [genAudioLoading, setGenAudioLoading] = useState(false);
  const [genAudioError, setGenAudioError] = useState<string | null>(null);
  const [hasGeneratedImage, setHasGeneratedImage] = useState(false);
  const [hasGeneratedAudio, setHasGeneratedAudio] = useState(false);
  const [genImageDebug, setGenImageDebug] = useState<string | null>(null);
  const [genAudioDebug, setGenAudioDebug] = useState<string | null>(null);
  const [audioSource, setAudioSource] = useState<'orbio' | 'browser' | null>(null);

  // Quiz state
  const [quizOptions, setQuizOptions] = useState<{ text: string; isCorrect: boolean }[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [xpPopup, setXpPopup] = useState(false);

  useEffect(() => {
    async function loadLesson() {
      const [{ data: lessonData }, { data: progressData }] = await Promise.all([
        supabase.from('lessons').select('*').eq('id', lessonId).maybeSingle(),
        supabase
          .from('lesson_progress')
          .select('*')
          .eq('user_id', user!.id)
          .eq('lesson_id', lessonId)
          .maybeSingle(),
      ]);
      setLesson(lessonData as Lesson | null);
      setProgress(progressData as LessonProgress | null);
      if (lessonData) {
        setQuizOptions(generateQuizOptions((lessonData as Lesson).quiz_answer, (lessonData as Lesson).quiz_wrong_answers));
      }
      setLoading(false);
    }
    if (user && lessonId) loadLesson();
  }, [user, lessonId]);

  async function handleAnswer(index: number) {
    if (answered) return;
    setSelectedAnswer(index);
    setAnswered(true);
    const correct = quizOptions[index].isCorrect;

    if (correct && !xpAwarded && lesson && user) {
      setXpAwarded(true);
      setXpPopup(true);
      setTimeout(() => setXpPopup(false), 2000);

      // Upsert lesson_progress
      const { data: existing } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('lesson_id', lesson.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('lesson_progress')
          .update({
            completed: true,
            xp_earned: XP_PER_QUIZ,
            completed_at: new Date().toISOString(),
          })
          .eq('id', (existing as LessonProgress).id);
      } else {
        await supabase.from('lesson_progress').insert({
          user_id: user.id,
          lesson_id: lesson.id,
          completed: true,
          xp_earned: XP_PER_QUIZ,
          completed_at: new Date().toISOString(),
        });
      }

      // Update profile XP and streak
      const today = new Date().toISOString().split('T')[0];
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        const p = profile as { xp: number; streak: number; last_lesson_date: string | null };
        let newStreak = p.streak;
        if (p.last_lesson_date !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          newStreak = p.last_lesson_date === yesterday ? p.streak + 1 : 1;
        }
        await supabase
          .from('profiles')
          .update({
            xp: p.xp + XP_PER_QUIZ,
            streak: newStreak,
            last_lesson_date: today,
          })
          .eq('id', user.id);
      }

      await refreshProfile();
    }
  }

  async function handleGenerateImage(force: boolean) {
    if (genImageLoading || !lesson) return;
    if (!force && genImage) return;
    setGenImageLoading(true);
    setGenImageError(null);
    setGenImageDebug(null);
    try {
      const res = await sabiRequest({
        action: 'generate_image',
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        lesson_content: lesson.explanation,
        session_id: getSessionId(),
      });
      if (res.image) {
        setGenImage(res.image);
        setHasGeneratedImage(true);
      } else {
        setGenImageError('No image was returned. Please try again.');
      }
    } catch (err) {
      const fullMsg = err instanceof Error ? err.message : String(err);
      const friendly = 'Could not generate image. Please try again.';
      setGenImageError(friendly);
      setGenImageDebug(fullMsg);
    }
    setGenImageLoading(false);
  }

  async function handleGenerateAudio(force: boolean) {
    if (genAudioLoading || !lesson) return;
    if (!force && genAudio) return;
    setGenAudioLoading(true);
    setGenAudioError(null);
    setGenAudioDebug(null);
    setAudioSource(null);
    let gotAudio = false;
    try {
      const res = await sabiRequest({
        action: 'generate_audio',
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        lesson_content: lesson.explanation,
        session_id: getSessionId(),
      });
      if (res.audio) {
        setGenAudio(res.audio);
        setHasGeneratedAudio(true);
        setAudioSource('orbio');
        gotAudio = true;
      }
    } catch (err) {
      const fullMsg = err instanceof Error ? err.message : String(err);
      console.warn('[Lesson Audio] n8n audio failed, using browser fallback. Error:', fullMsg);
    }
    if (!gotAudio) {
      setGenAudio(null);
      setHasGeneratedAudio(true);
      setAudioSource('browser');
    }
    setGenAudioLoading(false);
  }

  async function handleStillDontUnderstand() {
    if (showAlt || !lesson) return;
    setShowAlt(true);

    // If we already have a DB alternate explanation, show it immediately
    if (lesson.alternative_explanation) {
      setAltText(lesson.alternative_explanation);
      setAltAudio(null);
      setAltImage(null);
      return;
    }

    // Otherwise, call the AI tutor webhook for a fresh explanation
    if (!user) return;
    setAltLoading(true);
    const concept = `I don't understand the lesson: ${lesson.title}. Can you explain it in a different way?`;
    const response: TutorResponse = await askTutor(concept, user.id);
    setAltText(response.text);
    setAltAudio(response.audio);
    setAltImage(response.image);
    setAltLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-ink-950">
        <div className="w-6 h-6 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ink-950 px-5">
        <p className="text-gray-400 mb-4">Lesson not found.</p>
        <button onClick={onBack} className="text-lime-500 font-medium">Go back</button>
      </div>
    );
  }

  const isQuiz = step >= 4;
  const currentStep = isQuiz ? 4 : step;
  const stepsTotal = 5; // 4 content + 1 quiz
  const stepsArr = [...STEPS, 'Quiz'];
  const isAlreadyCompleted = progress?.completed ?? false;

  return (
    <div className="min-h-screen bg-ink-950 pb-24 animate-fade-in">
      {/* XP Popup */}
      {xpPopup && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-xp-pop">
          <div className="bg-lime-500 text-ink-950 font-bold px-5 py-3 rounded-xl shadow-lg shadow-lime-500/30 flex items-center gap-2">
            <Star className="w-5 h-5 fill-ink-950" />
            +{XP_PER_QUIZ} XP!
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 bg-ink-950/95 backdrop-blur-md border-b border-ink-800 px-5 py-4 z-30">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-ink-850 border border-ink-700 flex items-center justify-center hover:border-ink-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-lime-500 font-semibold">
              Lesson {String(lesson.lesson_order).padStart(2, '0')}
            </p>
            <h1 className="text-base font-bold text-white leading-tight">{lesson.title}</h1>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center gap-1.5">
          {stepsArr.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i <= currentStep ? 'bg-lime-500' : 'bg-ink-700'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          Step {currentStep + 1} of {stepsTotal}  {stepsArr[currentStep]}
        </p>
      </div>

      {/* Content */}
      <div className="px-5 mt-6">
        {/* Step 1: Explanation */}
        {step === 0 && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-lime-500" />
              <h2 className="text-lg font-bold text-white">Simple Explanation</h2>
            </div>
            <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
              <p className="text-sm text-gray-200 leading-relaxed">{lesson.explanation}</p>
            </div>
            <div className="flex items-start gap-2 mt-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
              <Lightbulb className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Think of this as a simple way to understand the idea. The analogy isn't exactly how blockchain works.
              </p>
            </div>

            {/* Use Image and Use Audio buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => handleGenerateImage(!hasGeneratedImage)}
                disabled={genImageLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ink-850 border border-ink-700 text-sm font-medium text-gray-200 hover:border-lime-500/50 transition-all disabled:opacity-50"
              >
                {genImageLoading ? (
                  <span className="w-4 h-4 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
                ) : hasGeneratedImage ? (
                  <RefreshCw className="w-4 h-4 text-lime-500" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-lime-500" />
                )}
                {genImageLoading ? 'Generating...' : hasGeneratedImage ? 'Regenerate' : 'Use Image'}
              </button>
              <button
                onClick={() => handleGenerateAudio(!hasGeneratedAudio)}
                disabled={genAudioLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ink-850 border border-ink-700 text-sm font-medium text-gray-200 hover:border-lime-500/50 transition-all disabled:opacity-50"
              >
                {genAudioLoading ? (
                  <span className="w-4 h-4 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
                ) : hasGeneratedAudio ? (
                  <RefreshCw className="w-4 h-4 text-lime-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-lime-500" />
                )}
                {genAudioLoading ? 'Generating...' : hasGeneratedAudio ? 'Regenerate' : 'Use Audio'}
              </button>
            </div>

            {/* Image result */}
            {genImageError && (
              <div className="mt-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-xs text-red-400">{genImageError}</p>
                </div>
                <button
                  onClick={() => handleGenerateImage(true)}
                  disabled={genImageLoading}
                  className="text-xs font-medium text-lime-500 hover:text-lime-400 flex-shrink-0"
                >
                  Try again
                </button>
              </div>
            )}
            {genImageError && genImageDebug && (
              <p className="mt-1.5 text-[10px] text-gray-600 leading-relaxed break-all">{genImageDebug}</p>
            )}
            {genImage && (
              <div className="mt-3 rounded-xl overflow-hidden border border-ink-700">
                <img src={genImage} alt="AI generated illustration for this lesson" className="w-full" />
              </div>
            )}

            {/* Audio result */}
            {audioSource && (
              <div className="mt-3 bg-ink-850 border border-ink-700 rounded-xl p-4">
                {audioSource === 'orbio' && genAudio ? (
                  <audio controls src={genAudio} className="w-full">
                    Your browser does not support audio playback.
                  </audio>
                ) : (
                  <BrowserAudioPlayer text={lesson.explanation} />
                )}
                <p className="mt-2 text-[10px] text-gray-500">
                  Voice: {audioSource === 'orbio' ? 'Orbio' : 'browser fallback'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Visual Flow */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-lime-500" />
              <h2 className="text-lg font-bold text-white">Visual Flow</h2>
            </div>
            <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5">
              <div className="flex flex-col items-center gap-3">
                {visualSteps[lesson.lesson_order]?.map((vs, i) => {
                  const Icon = vs.icon;
                  return (
                    <div key={i} className="flex flex-col items-center gap-3 w-full">
                      <div className="flex items-center gap-3 bg-ink-900 border border-ink-700 rounded-xl px-4 py-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-lime-500/10 border border-lime-500/30 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-lime-500" />
                        </div>
                        <span className="text-sm font-medium text-white text-center flex-1">{vs.label}</span>
                      </div>
                      {i < (visualSteps[lesson.lesson_order]?.length ?? 0) - 1 && (
                        <ArrowRight className="w-5 h-5 text-gray-600 rotate-90" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 bg-ink-850 border border-ink-700 rounded-xl p-4">
              <p className="text-xs text-gray-400 leading-relaxed">{lesson.example}</p>
            </div>
          </div>
        )}

        {/* Step 3: Analogy */}
        {step === 2 && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-lime-500" />
              <h2 className="text-lg font-bold text-white">Local Analogy</h2>
            </div>
            <div className="bg-gradient-to-br from-lime-500/10 to-cyan-500/5 border border-lime-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-lime-500 uppercase tracking-wider">
                  Lagos Life
                </span>
              </div>
              <p className="text-sm text-gray-100 leading-relaxed">{lesson.analogy}</p>
            </div>
          </div>
        )}

        {/* Step 4: Key Takeaway */}
        {step === 3 && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-lime-500" />
              <h2 className="text-lg font-bold text-white">Key Takeaway</h2>
            </div>
            <div className="bg-ink-850 border border-lime-500/30 rounded-2xl p-5">
              <p className="text-sm text-white leading-relaxed font-medium">
                {lesson.quiz_answer}
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Quiz */}
        {isQuiz && (
          <div className="animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-lime-500" />
              <h2 className="text-lg font-bold text-white">Quick Check</h2>
            </div>
            <div className="bg-ink-850 border border-ink-700 rounded-2xl p-5 mb-4">
              <p className="text-sm font-medium text-white leading-relaxed">
                {lesson.quiz_question}
              </p>
            </div>

            <div className="space-y-2.5">
              {quizOptions.map((opt, i) => {
                const isSelected = selectedAnswer === i;
                const showCorrect = answered && opt.isCorrect;
                const showWrong = answered && isSelected && !opt.isCorrect;
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center gap-3 ${
                      showCorrect
                        ? 'bg-lime-500/10 border-lime-500'
                        : showWrong
                          ? 'bg-red-500/10 border-red-500'
                          : isSelected
                            ? 'bg-lime-500/5 border-lime-500/50'
                            : 'bg-ink-850 border-ink-700 hover:border-ink-600'
                    } ${answered ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className="text-sm text-gray-200 flex-1">{opt.text}</span>
                    {showCorrect && <CheckCircle2 className="w-5 h-5 text-lime-500 flex-shrink-0" />}
                    {showWrong && <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Answer Feedback */}
            {answered && (
              <div className="mt-4 animate-slide-up">
                {quizOptions[selectedAnswer!].isCorrect ? (
                  <div className="bg-lime-500/10 border border-lime-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-lime-500" />
                      <p className="text-sm font-bold text-lime-500">Correct! +{XP_PER_QUIZ} XP</p>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      {lesson.quiz_answer}. You got it! This is the core idea of this lesson.
                    </p>
                  </div>
                ) : (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-400" />
                      <p className="text-sm font-bold text-red-400">Not quite right</p>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      The correct answer is: <span className="font-semibold text-lime-500">{lesson.quiz_answer}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* I Still Don't Understand */}
            <div className="mt-6">
              <button
                onClick={handleStillDontUnderstand}
                className="w-full bg-ink-850 border border-ink-700 rounded-2xl p-4 hover:border-lime-500/50 transition-all group"
              >
                <div className="flex items-center justify-center gap-2">
                  <HelpCircle className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-sm font-semibold text-white">
                    I still don't understand 🤔
                  </span>
                </div>
              </button>

              {showAlt && (
                <div className="mt-4 animate-slide-up bg-cyan-500/5 border border-cyan-500/30 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <p className="text-sm font-bold text-cyan-400">
                      That's okay. Let's explain it another way.
                    </p>
                  </div>
                  {altLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-xs text-gray-500 ml-1">The AI is thinking of a new way to explain this...</span>
                    </div>
                  ) : altText ? (
                    <>
                      <p className="text-sm text-gray-200 leading-relaxed">{altText}</p>
                      {altAudio && <AudioPlayer src={altAudio} />}
                      {altImage && (
                        <div className="mt-3 w-full">
                          <img
                            src={altImage}
                            alt="AI generated illustration"
                            className="rounded-xl w-full border border-ink-700"
                          />
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-3 italic">
                        The AI is giving you a genuinely different explanation, not repeating the same text.
                      </p>
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {/* AI Tutor Link */}
            <button
              onClick={() => onNavigateTutor(lesson.id)}
              className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-lime-500 transition-colors py-2"
            >
              <MessageCircle className="w-4 h-4" />
              Ask the AI Tutor a question
            </button>

            {/* Finish Button */}
            {answered && (
              <button
                onClick={onComplete}
                className="w-full mt-4 bg-lime-500 text-ink-950 font-bold py-3.5 rounded-xl text-sm hover:bg-lime-400 hover:shadow-lg hover:shadow-lime-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 animate-slide-up"
              >
                <Check className="w-4 h-4" />
                {isAlreadyCompleted ? 'Back to Dashboard' : 'Complete Lesson'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons (content steps only) */}
      {!isQuiz && (
        <div className="px-5 mt-8 flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-5 py-3 rounded-xl bg-ink-850 border border-ink-700 text-sm font-medium text-gray-300 hover:border-ink-600 transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={() => setStep((s) => s + 1)}
            className="flex-1 bg-lime-500 text-ink-950 font-bold py-3 rounded-xl text-sm hover:bg-lime-400 hover:shadow-lg hover:shadow-lime-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {step < 3 ? 'Next' : 'Start Quiz'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
