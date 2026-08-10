import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, BookmarkCheck, Clock, Eye, Heart, ThumbsUp } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, ErrorState, LinkButton, Spinner } from '../components/ui';
import { formatDuration, timeAgo } from '../lib/format';

export default function VideoDetail() {
  const { id } = useParams();
  const [v, setV] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const savedProgress = useRef(false);

  useEffect(() => {
    api.get(`/videos/${id}`).then(({ data }) => setV(data.data.video)).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, [id]);

  const reportProgress = () => {
    if (!videoRef.current || savedProgress.current) return;
    savedProgress.current = true;
    api.post(`/videos/${id}/progress`, { seconds: Math.floor(videoRef.current.currentTime) }).catch(() => {});
  };

  const toggleSave = async () => {
    try {
      if (v.saved) await api.delete(`/videos/${v.id}/save`);
      else await api.post(`/videos/${v.id}/save`);
      setV({ ...v, saved: !v.saved });
    } catch { /* ignore */ }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="overflow-hidden">
        {/* Player placeholder (self-contained, no external CDN) */}
        <div className="relative aspect-video bg-ink-900 flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            poster={undefined}
            onPause={reportProgress}
            onEnded={reportProgress}
          >
            <source src={v.videoUrl || ''} />
          </video>
          {!v.videoUrl && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80" style={{ background: `linear-gradient(135deg, ${v.thumbnailColor || '#4f46e5'}, #0f172a)` }}>
              <PlayCircleBig />
              <p className="text-sm mt-3 font-semibold">Demo lecture player</p>
              <p className="text-xs text-white/60 mt-1">Video stream will be connected in production</p>
            </div>
          )}
        </div>
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">{v.category}</Badge>
            {v.exam && <Badge tone="slate">{v.exam}</Badge>}
            {v.playlist && <Badge tone="blue">▶ {v.playlist}</Badge>}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-ink-900 mt-3">{v.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-ink-500">
            <span className="font-semibold text-ink-700">{v.educator}</span>
            <span className="flex items-center gap-1"><Eye size={15} /> {v.views.toLocaleString('en-IN')} views</span>
            <span className="flex items-center gap-1"><Clock size={15} /> {formatDuration(v.duration)}</span>
            <span className="flex items-center gap-1"><ThumbsUp size={15} /> {v.likes.toLocaleString('en-IN')}</span>
          </div>
          <p className="text-ink-600 mt-4 leading-relaxed text-sm sm:text-base">{v.description}</p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant={v.saved ? 'primary' : 'secondary'} onClick={toggleSave}>
              {v.saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {v.saved ? 'Saved' : 'Save for later'}
            </Button>
            <Button variant="ghost"><Heart size={16} /> Like</Button>
          </div>

          <div className="mt-6 pt-4 border-t border-ink-100 flex flex-wrap gap-3">
            <LinkButton to="/videos" variant="secondary">← Back to library</LinkButton>
            <LinkButton to="/quiz/today">Try daily quiz</LinkButton>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PlayCircleBig() {
  return (
    <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor" className="opacity-80">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-2 14.5v-9l8 4.5-8 4.5z" />
    </svg>
  );
}
