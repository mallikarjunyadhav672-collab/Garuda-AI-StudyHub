import { useEffect, useState } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import { api, handleError } from '../../lib/api';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Spinner } from '../../components/ui';
import { timeAgo } from '../../lib/format';

export default function AdminContact() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/contact/messages');
      setMessages(data.data.messages);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: number) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/contact/messages/${id}`);
      setNotice('Message deleted ✓');
      load();
      setTimeout(() => setNotice(''), 2500);
    } catch (err) {
      setError(handleError(err));
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink-900 mb-1">Contact Messages</h1>
      <p className="text-sm text-ink-500 mb-5">Messages submitted through the public contact form.</p>
      {notice && <div className="mb-4"><Alert tone="green">{notice}</Alert></div>}
      {messages.length === 0 ? (
        <Card><EmptyState icon="📬" title="No messages yet" description="Contact form submissions will appear here." /></Card>
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-ink-900 text-sm">{m.name}</p>
                    <Badge tone="blue"><Mail size={11} /> {m.email}</Badge>
                    <span className="text-xs text-ink-400">{timeAgo(m.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-brand-700 mt-1.5">{m.subject}</p>
                  <p className="text-sm text-ink-600 mt-1 leading-relaxed">{m.message}</p>
                </div>
                <button onClick={() => remove(m.id)} className="p-2 rounded-lg text-ink-400 hover:text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={15} /></button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
