import { useEffect, useState } from 'react';
import { MessageSquareQuote, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { api, handleError } from '../../lib/api';
import { Alert, Button, Card } from '../../components/ui';

type Testimonial = {
  id: number;
  name: string;
  rating: number;
  feedback: string;
  examDetails?: string | null;
  status: 'approved' | 'rejected';
  createdAt: string;
};

export default function AdminTestimonials() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadItems = async () => {
    try {
      const { data } = await api.get('/admin/testimonials');
      setItems(data.data?.testimonials || []);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const updateStatus = async (id: number, status: 'approved' | 'rejected') => {
    setNotice('');
    setError('');
    try {
      await api.patch(`/admin/testimonials/${id}`, { status });
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
      setNotice(`Testimonial ${status === 'approved' ? 'approved' : 'marked as rejected'}.`);
    } catch (err) {
      setError(handleError(err));
    }
  };

  const remove = async (id: number) => {
    setNotice('');
    setError('');
    try {
      await api.delete(`/admin/testimonials/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setNotice('Testimonial removed.');
    } catch (err) {
      setError(handleError(err));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-ink-900 mb-1">User Testimonials</h1>
      <p className="text-sm text-ink-500 mb-6">Review and manage feedback submitted from the website.</p>

      {notice && <div className="mb-4"><Alert tone="green">{notice}</Alert></div>}
      {error && <div className="mb-4"><Alert tone="red">{error}</Alert></div>}

      {loading ? (
        <Card className="p-6 text-sm text-ink-500">Loading testimonials…</Card>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-ink-500">No testimonials have been submitted yet.</Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <MessageSquareQuote size={16} className="text-brand-600" />
                    <h2 className="font-bold text-ink-900">{item.name}</h2>
                  </div>
                  <p className="text-sm text-ink-500 mt-1">{new Date(item.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">{item.rating}/5 rating</span>
                    <span className={`rounded-full px-2.5 py-1 ${item.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {item.status}
                    </span>
                    {item.examDetails && <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-700">{item.examDetails}</span>}
                  </div>
                  <p className="mt-4 text-sm text-ink-600 leading-relaxed">“{item.feedback}”</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.status !== 'approved' ? (
                    <Button variant="success" className="!px-4" onClick={() => updateStatus(item.id, 'approved')}>
                      <CheckCircle2 size={15} /> Approve
                    </Button>
                  ) : (
                    <Button variant="secondary" className="!px-4" onClick={() => updateStatus(item.id, 'rejected')}>
                      <XCircle size={15} /> Hide
                    </Button>
                  )}
                  <Button variant="danger" className="!px-4" onClick={() => remove(item.id)}>
                    <Trash2 size={15} /> Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
