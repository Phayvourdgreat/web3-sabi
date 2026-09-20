import { useState, useRef } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggle() {
    if (error) return;

    if (!audioRef.current) {
      try {
        audioRef.current = new Audio(src);
        audioRef.current.onended = () => setPlaying(false);
        audioRef.current.onerror = () => {
          setPlaying(false);
          setError(true);
        };
      } catch {
        setError(true);
        return;
      }
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          setPlaying(false);
          setError(true);
        });
    }
  }

  if (error) {
    return (
      <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-ink-700/50 border border-ink-600 text-gray-500 text-xs">
        <Volume2 className="w-3.5 h-3.5" />
        Audio unavailable
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-lime-500/10 border border-lime-500/30 text-lime-500 text-xs font-medium hover:bg-lime-500/20 active:scale-95 transition-all"
    >
      {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      {playing ? 'Pause audio' : 'Play audio'}
    </button>
  );
}
