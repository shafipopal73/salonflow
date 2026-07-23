import { useState } from 'react';
import { Image } from '@/components/ui/image';
import { Play } from 'lucide-react';
import VoiceMessagePlayer from '@/components/chat/VoiceMessagePlayer';
import MediaViewer from '@/components/chat/MediaViewer';

const formatMessageTime = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr);
  // If ISO string without timezone designation, treat as UTC
  let normalized = s;
  if (s.includes('T') && !s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    normalized = s + 'Z';
  }
  return new Date(normalized).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function MessageBubble({ msg, isOwn, canDownload }) {
  const [viewerMedia, setViewerMedia] = useState(null);
  const hasMedia = msg.media_url && msg.media_type;
  const isAudio = hasMedia && msg.media_type === 'audio';

  const openViewer = () => {
    if (hasMedia && (msg.media_type === 'image' || msg.media_type === 'video')) {
      setViewerMedia({ url: msg.media_url, type: msg.media_type });
    }
  };

  return (
    <>
      <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
        {hasMedia && msg.media_type === 'image' && (
          <button onClick={openViewer} className="block mb-1 cursor-zoom-in">
            <Image
              src={msg.media_url}
              className="rounded-lg max-h-64"
              fittingType="fit"
            />
          </button>
        )}
        {hasMedia && msg.media_type === 'video' && (
          <button onClick={openViewer} className="relative block mb-1 group">
            <video
              src={`${msg.media_url}#t=0.1`}
              preload="metadata"
              className="rounded-lg max-w-full max-h-64 pointer-events-none"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 text-white ml-0.5" />
              </div>
            </div>
          </button>
        )}
        {isAudio && (
          <VoiceMessagePlayer src={msg.media_url} isOwn={isOwn} />
        )}
        {msg.body && !isAudio && <p className="text-sm whitespace-pre-wrap select-text">{msg.body}</p>}
        <p className="text-[10px] opacity-60 mt-1 text-right">{formatMessageTime(msg.created_date)}</p>
      </div>
      {viewerMedia && (
        <MediaViewer media={viewerMedia} canDownload={canDownload} onClose={() => setViewerMedia(null)} />
      )}
    </>
  );
}