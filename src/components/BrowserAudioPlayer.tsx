import { useState, useEffect, useRef } from 'react';
import { Play, Square } from 'lucide-react';

interface BrowserAudioPlayerProps {
  text: string;
  label?: string;
}

export default function BrowserAudioPlayer({ text }: BrowserAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setIsSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function handlePlay() {
    if (!isSupported || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  }

  function handleStop() {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  }

  if (!isSupported) {
    return (
      <p className="text-xs text-gray-500">Your browser does not support speech synthesis.</p>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={isPlaying ? handleStop : handlePlay}
        className="w-9 h-9 rounded-lg bg-lime-500/10 border border-lime-500/30 flex items-center justify-center hover:bg-lime-500/20 transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <Square className="w-4 h-4 text-lime-500 fill-lime-500" />
        ) : (
          <Play className="w-4 h-4 text-lime-500 fill-lime-500" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-lime-500 rounded-full transition-all duration-300 ${isPlaying ? 'w-full' : 'w-0'}`}
          />
        </div>
      </div>
    </div>
  );
}
