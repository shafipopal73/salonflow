import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const SPEEDS = [1, 1.5, 2];

export default function VoiceMessagePlayer({ src, isOwn }) {
  const audioRef = useRef(null);
  const progressBarRef = useRef(null);
  const isDraggingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else {
        // Workaround for webm files that report Infinity duration
        audio.currentTime = 1e101;
        const onSeeked = () => {
          if (audio.duration && isFinite(audio.duration)) {
            setDuration(audio.duration);
          }
          audio.currentTime = 0;
          audio.removeEventListener('seeked', onSeeked);
        };
        audio.addEventListener('seeked', onSeeked);
      }
    };
    const handleTimeUpdate = () => {
      if (!isDraggingRef.current) setCurrentTime(audio.currentTime);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const cycleSpeed = () => {
    const audio = audioRef.current;
    const nextSpeed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(nextSpeed);
    if (audio) audio.playbackRate = nextSpeed;
  };

  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const seekToPointer = (clientX) => {
    const bar = progressBarRef.current;
    const audio = audioRef.current;
    if (!bar || !audio || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    setCurrentTime(newTime);
    audio.currentTime = newTime;
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    const bar = progressBarRef.current;
    if (bar) bar.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    seekToPointer(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    seekToPointer(e.clientX);
  };

  const handlePointerUp = (e) => {
    const bar = progressBarRef.current;
    if (bar && bar.hasPointerCapture(e.pointerId)) {
      bar.releasePointerCapture(e.pointerId);
    }
    isDraggingRef.current = false;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const displayTime = isPlaying ? currentTime : (duration || 0);

  return (
    <div className="flex items-center gap-2 min-w-[200px] py-0.5">
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      <button
        onClick={togglePlay}
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${isOwn ? 'bg-white/20 hover:bg-white/30' : 'bg-black/10 hover:bg-black/20'}`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          ref={progressBarRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`relative h-1.5 rounded-full cursor-pointer touch-none ${isOwn ? 'bg-white/25' : 'bg-black/15'}`}
        >
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${isOwn ? 'bg-white/90' : 'bg-black/70'}`}
            style={{ width: `${progress}%` }}
          >
            <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2.5 h-2.5 rounded-full ${isOwn ? 'bg-white' : 'bg-black'}`} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] tabular-nums opacity-80">{formatTime(displayTime)}</span>
          <button
            onClick={cycleSpeed}
            className={`text-[11px] font-semibold px-1.5 py-0.5 rounded transition-colors ${isOwn ? 'bg-white/15 hover:bg-white/25' : 'bg-black/10 hover:bg-black/20'}`}
          >
            {speed}x
          </button>
        </div>
      </div>
    </div>
  );
}