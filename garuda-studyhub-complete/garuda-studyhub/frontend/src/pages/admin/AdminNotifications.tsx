import { useState } from 'react';
import { Megaphone } from 'lucide-react';
import { api, handleError } from '../../lib/api';
import { Alert, Button, Card, Field, Input, Select } from '../../components/ui';

export default function AdminNotifications() {
  const [form, setForm] = useState({ title: '', body: '', type: 'system', audience: 'all', userId: '' });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setNotice('');
    setError('');
    try {
      await api.post('/notifications', {
        title: form.title,
        body: form.body,
        type: form.type,
        userId: form.audience === 'user' && form.userId ? Number(form.userId) : undefined,
      });
      setNotice(`Notification sent to ${form.audience === 'all' ? 'all users' : 'selected user'} ✓`);
      setForm({ ...form, title: '', body: '' });
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold text-ink-900 mb-1">Broadcast Notifications</h1>
      <p className="text-sm text-ink-500 mb-6">Send announcements to all users or a specific user.</p>

      {notice && <div className="mb-4"><Alert tone="green">{notice}</Alert></div>}
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <Card className="p-6">
        <form onSubmit={send} className="space-y-4">
          <Field label="Title">
            <Input required placeholder="e.g. New SSC CGL notification out!" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Message body">
            <textarea required className="input min-h-24" placeholder="Details of the announcement…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="system">System</option>
                <option value="job_alert">Job alert</option>
                <option value="exam_reminder">Exam reminder</option>
                <option value="quiz">Quiz</option>
                <option value="promotion">Promotion</option>
              </Select>
            </Field>
            <Field label="Audience">
              <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="all">All users</option>
                <option value="user">Specific user</option>
              </Select>
            </Field>
          </div>
          {form.audience === 'user' && (
            <Field label="User ID">
              <Input type="number" placeholder="e.g. 2" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
            </Field>
          )}
          <Button type="submit" loading={sending} className="!px-6"><Megaphone size={16} /> Send notification</Button>
        </form>
      </Card>
    </div>
  );
}
