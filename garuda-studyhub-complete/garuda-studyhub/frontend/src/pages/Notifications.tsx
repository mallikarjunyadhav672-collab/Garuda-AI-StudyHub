import { useEffect, useState } from 'react';
import { Bell, BellOff, Briefcase, CheckCheck, Flame, Newspaper, Timer, Trophy } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner } from '../components/ui';
import { timeAgo } from '../lib/format';

const icons: Record<string, any> = {
  job_alert: { icon: Briefcase, tone: 'bg-blue-50 text-blue-600' },
  exam_reminder: { icon: Timer, tone: 'bg-amber-50 text-amber-600' },
  quiz: { icon: Flame, tone: 'bg-orange-50 text-orange-500' },
  mock_result: { icon: Trophy, tone: 'bg-violet-50 text-violet-600' },
  achievement: { icon: Trophy, tone: 'bg-emerald-50 text-emerald-600' },
  system: { icon: Newspaper, tone: 'bg-brand-50 text-brand-600' },
};

export default function Notifications() {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications');
      setItems(data.data.notifications);
      setUnread(data.data.unread);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: number) => {
    await api.put(`/notifications/${id}/read`);
    load();
  };

  const markAll = async () => {
    await api.put('/notifications/read-all');
    load();
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        eyebrow="Notifications"
        title="Notifications"
        description={`${unread} unread notification${unread === 1 ? '' : 's'}`}
        actions={unread > 0 ? <Button variant="secondary" onClick={markAll}><CheckCheck size={16} /> Mark all read</Button> : undefined}
      />

      {items.length === 0 ? (
        <Card><EmptyState icon="🔔" title="All caught up!" description="You have no notifications right now." /></Card>
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => {
            const meta = icons[n.type] || icons.system;
            const Icon = meta.icon;
            return (
              <Card key={n.id} className={`p-4 flex items-start gap-3.5 ${!n.isRead ? 'border-brand-200 bg-brand-50/40' : ''}`}>
                <div className={`rounded-xl p-2.5 shrink-0 ${meta.tone}`}><Icon size={18} /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-bold text-ink-900 text-sm ${!n.isRead ? '' : 'font-semibold'}`}>{n.title}</p>
                    <span className="text-[11px] text-ink-400 shrink-0">{timeAgo(n.createdAt)}</span>
                  </div>
                  {n.body && <p className="text-sm text-ink-500 mt-0.5">{n.body}</p>}
                </div>
                {!n.isRead && (
                  <button onClick={() => markRead(n.id)} className="text-xs font-bold text-brand-600 hover:text-brand-700 shrink-0 mt-1">
                    Mark read
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
