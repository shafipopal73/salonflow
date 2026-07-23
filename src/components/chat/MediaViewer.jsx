import { useEffect } from 'react';
import { X, Download } from 'lucide-react';

export default function MediaViewer({ media, canDownload, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!media) return null;

  const handleDownload = async () => {
    const filename = media.type === 'image'
      ? `photo-${Date.now()}.jpg`
      : `video-${Date.now()}.mp4`;
    try {
      const response = await fetch(media.url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(media.url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={onClose}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        {canDownload && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {media.type === 'image' && (
          <img src={media.url} alt="Photo" className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg" />
        )}
        {media.type === 'video' && (
          <video src={media.url} controls autoPlay className="max-w-[90vw] max-h-[90vh] rounded-lg" />
        )}
      </div>
    </div>
  );
}