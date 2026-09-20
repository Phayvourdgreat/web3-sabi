import { useState, useRef, useEffect } from 'react';
import { sabiRequest, getSessionId } from '@/lib/sabiApi';
import type { Lesson } from '@/types';
import type { ChatMessage } from '@/types';
import { Send, Sparkles, ArrowLeft, Bot } from 'lucide-react';

interface TutorMessage extends ChatMessage {
  debug?: string;
}

interface AITutorProps {
  onBack: () => void;
  lesson?: Lesson | null;
}

const SUGGESTED_QUESTIONS = [
  'What is Web3?',
  'What is a blockchain?',
  'What is a crypto wallet?',
  'What is a crypto wallet in simple terms?',
  'How do gas fees work?',
  'Explain blockchain like I am 5',
  'What is DeFi and why does it matter?',
];

export default function AITutor({ onBack, lesson }: AITutorProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'welcome',
      role: 'tutor',
      text: 'Hello! I am your AI Web3 Tutor. Ask me anything about Web3, blockchain, crypto, or any lesson you have been learning. No question is too simple!',
      audio: null,
      image: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  async function handleSend(text: string) {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      audio: null,
      image: null,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await sabiRequest({
        action: 'ask_tutor',
        lesson_id: lesson?.id ?? '',
        lesson_title: lesson?.title ?? '',
        lesson_content: lesson?.explanation ?? '',
        session_id: getSessionId(),
        question: text,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-r`,
          role: 'tutor',
          text: res.text ?? 'Sorry, I could not generate a response. Please try again.',
          audio: res.audio,
          image: res.image,
        },
      ]);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-r`,
          role: 'tutor',
          text: 'Sorry, I could not reach the AI tutor right now. Please check your connection and try again in a moment.',
          audio: null,
          image: null,
          debug: errMsg,
        },
      ]);
    }
    setIsTyping(false);
  }

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 bg-ink-950/95 backdrop-blur-md border-b border-ink-800 px-5 py-4 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-ink-850 border border-ink-700 flex items-center justify-center hover:border-ink-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-lime-500/10 border border-lime-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-lime-500" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">AI Tutor</h1>
              <p className="text-xs text-gray-500">
                {lesson ? `About: ${lesson.title}` : 'Ask anything about Web3'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 pb-32">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-lime-500 text-ink-950 rounded-br-sm'
                  : 'bg-ink-850 border border-ink-700 text-gray-200 rounded-bl-sm'
              }`}
            >
              {msg.role === 'tutor' && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-lime-500" />
                  <span className="text-[10px] font-bold text-lime-500 uppercase tracking-wider">
                    AI Tutor
                  </span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              {msg.debug && (
                <p className="mt-2 text-[10px] text-gray-600 leading-relaxed break-all">{msg.debug}</p>
              )}
              {msg.audio && (
                <div className="mt-3">
                  <audio controls src={msg.audio} className="w-full h-9">
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}
              {msg.image && (
                <div className="mt-3 w-full">
                  <img
                    src={msg.image}
                    alt="AI generated illustration"
                    className="rounded-xl w-full border border-ink-700"
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-ink-850 border border-ink-700 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-lime-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-lime-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-lime-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Ask input and suggested questions (only when no user messages yet) */}
        {messages.length === 1 && !isTyping && (
          <div className="animate-slide-up">
            <h2 className="text-lg font-bold text-white mb-3">Ask your AI Tutor</h2>
            <div className="flex items-center gap-2 mb-5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim()) handleSend(input.trim());
                }}
                placeholder="Type your question here..."
                className="flex-1 bg-ink-850 border border-ink-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors"
              />
              <button
                onClick={() => input.trim() && handleSend(input.trim())}
                disabled={!input.trim() || isTyping}
                className="px-4 h-12 rounded-xl bg-lime-500 text-ink-950 font-bold text-sm flex items-center justify-center hover:bg-lime-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                Ask Tutor
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">Try asking:</p>
            <div className="space-y-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="w-full text-left bg-ink-850 border border-ink-700 rounded-xl px-4 py-3 text-sm text-gray-300 hover:border-lime-500/50 hover:text-white transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar (visible after first message) */}
      {messages.length > 1 && (
        <div className="fixed bottom-0 left-0 right-0 bg-ink-900/95 backdrop-blur-md border-t border-ink-700 px-5 py-3 z-40">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && input.trim()) handleSend(input.trim());
              }}
              placeholder="Type your question here..."
              className="flex-1 bg-ink-850 border border-ink-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-lime-500 focus:ring-1 focus:ring-lime-500 transition-colors"
            />
            <button
              onClick={() => input.trim() && handleSend(input.trim())}
              disabled={!input.trim() || isTyping}
              className="w-12 h-12 rounded-xl bg-lime-500 text-ink-950 flex items-center justify-center hover:bg-lime-400 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
