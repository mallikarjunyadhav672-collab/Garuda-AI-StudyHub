import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Share2, Tag } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Card, ErrorState, LinkButton, Spinner } from '../components/ui';
import { formatDate } from '../lib/format';

export default function AffairDetail() {
  const { id } = useParams();
  const [a, setA] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/affairs/${id}`).then(({ data }) => setA(data.data.affair)).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="overflow-hidden">
        <div className="h-3" style={{ background: a.imageColor || '#4f46e5' }} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="slate">{a.category || 'General'}</Badge>
            <span className="chip bg-ink-100 text-ink-500">{formatDate(a.date)}</span>
            {a.isFeatured && <Badge tone="red">Featured</Badge>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mt-3 leading-tight">{a.title}</h1>
          <p className="text-ink-500 mt-2 leading-relaxed">{a.summary}</p>
          <div className="mt-6 space-y-4 text-ink-700 leading-relaxed text-[15px]">
            {a.content.split('\n').filter(Boolean).map((p: string, i: number) => <p key={i}>{p}</p>)}
          </div>

          {a.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-ink-100">
              {a.tags.map((t: string) => <span key={t} className="chip bg-brand-50 text-brand-700"><Tag size={11} /> {t}</span>)}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <LinkButton to="/affairs" variant="secondary">← All affairs</LinkButton>
            <Link to="/quiz/today" className="btn-primary">Test yourself on today's quiz</Link>
            {a.sourceUrl && (
              <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                Source: {a.source || 'Original'} <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
