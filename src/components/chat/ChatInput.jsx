import { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Mic, Paperclip, Trash2, Play, Pause, Lock, Square, X, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { audioBufferToWav } from '@/utils/wavEncoder';

const LOCK_THRESHOLD = 60;
const MIN_DURATION = 1.5;

export default function ChatInput({ onSend }) {
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [voiceState, setVoiceState] = useState('idle');
  const [recordTime, setRecordTime] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const startYRef = useRef(0);
  const lockedRef = useRef(false);
  const cancelledRef = useRef(false);
  const previewAudioRef = useRef(null);
  const recordedBlobRef = useRef(null);
  const { toast } = useToast();

  // Stable document-level pointer handlers (survive re-renders)
  const handleDocPointerMoveRef = useRef((e) => {
    if (lockedRef.current) return;
    const deltaY = startYRef.current - e.clientY;
    if (deltaY > LOCK_THRESHOLD) {
      lockedRef.current = true;
      setVoiceState('locked');
    }
  });

  const handleDocPointerUpRef = useRef(() => {
    document.removeEventListener('pointermove', handleDocPointerMoveRef.current);
    document.removeEventListener('pointerup', handleDocPointerUpRef.current);
    document.removeEventListener('pointercancel', handleDocPointerUpRef.current);
    if (!lockedRef.current && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  });

  useEffect(() => {
    if (voiceState === 'recording' || voiceState === 'locked') {
      timerRef.current = setInterval(() => {
        setRecordTime((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    }
    return () => clearInterval(timerRef.current);
  }, [voiceState]);

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handleDocPointerMoveRef.current);
      document.removeEventListener('pointerup', handleDocPointerUpRef.current);
      document.removeEventListener('pointercancel', handleDocPointerUpRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
      clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4;codecs=mp4a.40.2',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const startRecording = async (clientY) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16,
        },
      });
      mediaStreamRef.current = stream;
      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const actualType = recorder.mimeType || mimeType || 'audio/webm';
      audioChunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(t => t.stop());
          mediaStreamRef.current = null;
        }
        clearInterval(timerRef.current);

        if (cancelledRef.current) {
          setVoiceState('idle');
          setRecordTime(0);
          return;
        }

        const duration = (Date.now() - startTimeRef.current) / 1000;
        if (duration < MIN_DURATION) {
          setVoiceState('idle');
          setRecordTime(0);
          return;
        }

        try {
          const rawBlob = new Blob(audioChunksRef.current, { type: actualType });
          if (rawBlob.size === 0) throw new Error('empty');

          const arrayBuffer = await rawBlob.arrayBuffer();
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioCtx();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          audioContext.close();

          const wavBlob = audioBufferToWav(audioBuffer);
          if (wavBlob.size === 0) throw new Error('encode failed');

          recordedBlobRef.current = wavBlob;
          setPreviewUrl(URL.createObjectURL(wavBlob));
          setRecordTime(duration);
          setVoiceState('preview');
        } catch {
          setVoiceState('idle');
          setRecordTime(0);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to process voice message.' });
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      startYRef.current = clientY;
      lockedRef.current = false;
      setRecordTime(0);
      setVoiceState('recording');

      document.addEventListener('pointermove', handleDocPointerMoveRef.current);
      document.addEventListener('pointerup', handleDocPointerUpRef.current);
      document.addEventListener('pointercancel', handleDocPointerUpRef.current);
    } catch {
      setVoiceState('idle');
      toast({ variant: 'destructive', title: 'Error', description: 'Could not access microphone.' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    document.removeEventListener('pointermove', handleDocPointerMoveRef.current);
    document.removeEventListener('pointerup', handleDocPointerUpRef.current);
    document.removeEventListener('pointercancel', handleDocPointerUpRef.current);
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    stopRecording();
  };

  const handleMicPointerDown = (e) => {
    e.preventDefault();
    startRecording(e.clientY);
  };

  const togglePlayPreview = () => {
    if (previewAudioRef.current) {
      if (isPlaying) {
        previewAudioRef.current.pause();
      } else {
        previewAudioRef.current.play();
      }
    }
  };

  const handleDeletePreview = () => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = '';
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    recordedBlobRef.current = null;
    setVoiceState('idle');
    setRecordTime(0);
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const handleSendVoice = async () => {
    if (!recordedBlobRef.current) return;
    if (previewAudioRef.current) previewAudioRef.current.pause();
    setUploading(true);
    try {
      const file = new File([recordedBlobRef.current], 'voice-message.wav', { type: 'audio/wav' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onSend({
        body: '🎤 Voice message',
        media_url: file_url,
        media_type: 'audio',
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      recordedBlobRef.current = null;
      setVoiceState('idle');
      setRecordTime(0);
      setIsPlaying(false);
      setPlaybackProgress(0);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload voice message.' });
    } finally {
      setUploading(false);
    }
  };

  const handleTextSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;
    const body = input.trim();
    setInput('');
    try {
      await onSend({ body });
    } catch {
      setInput(body);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select an image or video file.' });
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onSend({
        body: isImage ? '📷 Photo' : '🎥 Video',
        media_url: file_url,
        media_type: isImage ? 'image' : 'video',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to upload file.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-3 border-t safe-area-bottom">
      {uploading && (
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
          Uploading...
        </div>
      )}

      {voiceState === 'preview' ? (
        <div className="flex items-center gap-2">
          <audio
            ref={previewAudioRef}
            src={previewUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => { setIsPlaying(false); setPlaybackProgress(0); }}
            onTimeUpdate={(e) => {
              const audio = e.target;
              if (audio.duration) setPlaybackProgress(audio.currentTime / audio.duration);
            }}
            className="hidden"
          />
          <Button type="button" size="icon" variant="ghost" onClick={togglePlayPreview}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-sm text-muted-foreground tabular-nums">{formatTime(recordTime)}</span>
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${playbackProgress * 100}%` }} />
            </div>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={handleDeletePreview}>
            <Trash2 className="w-5 h-5 text-destructive" />
          </Button>
          <Button type="button" size="icon" onClick={handleSendVoice} disabled={uploading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      ) : voiceState === 'recording' ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm tabular-nums">{formatTime(recordTime)}</span>
            <span className="text-xs ml-2 flex items-center gap-0.5">
              <ChevronUp className="w-3 h-3" /> Slide up to lock
            </span>
          </div>
          <Button type="button" size="icon" variant="destructive" className="touch-none">
            <Mic className="w-5 h-5" />
          </Button>
        </div>
      ) : voiceState === 'locked' ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-600">
            <Lock className="w-4 h-4" />
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm tabular-nums">{formatTime(recordTime)}</span>
            <span className="text-xs ml-1">Locked</span>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={cancelRecording}>
            <X className="w-5 h-5 text-destructive" />
          </Button>
          <Button type="button" size="icon" variant="destructive" onClick={stopRecording}>
            <Square className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <form onSubmit={handleTextSend} className="flex gap-2 items-center">
          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
          <Button type="button" size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." disabled={uploading} />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onPointerDown={handleMicPointerDown}
            onContextMenu={(e) => e.preventDefault()}
            className="touch-none"
            disabled={uploading}
          >
            <Mic className="w-4 h-4" />
          </Button>
          <Button type="submit" size="icon" disabled={!input.trim() || uploading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      )}
    </div>
  );
}