import { useEffect, useState } from 'react';
import { Bell, Globe, KeyRound, Moon, Sun } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Spinner } from '../components/ui';

export default function Settings() {
  const { user, logout } = useAuth();
  const [prefs, setPrefs] = useState<any>(null);
  const [form, setForm] = useState({ language: 'en', theme: 'light', notifyEmail: true, notifyPush: true });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/me').then(({ data }) => {
      setPrefs(data.data.preferences);
      setForm(data.data.preferences);
    }).catch((e) => setError(handleError(e)));
  }, []);

  const savePrefs = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.put('/users/me/preferences', form);
      setPrefs(data.data.preferences);
      setMessage('Preferences saved ✓');
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwSaving(true);
    setPwMessage('');
    setError('');
    if (pw.newPassword !== pw.confirm) {
      setError('New passwords do not match.');
      setPwSaving(false);
      return;
    }
    try {
      await api.post('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPwMessage('Password updated. Please sign in again.');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      await logout();
    } catch (err) {
      setError(handleError(err));
    } finally {
      setPwSaving(false);
    }
  };

  if (!prefs) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Settings" title="Account Settings" description="Manage preferences, notifications and security." />

      {message && <div className="mb-4"><Alert tone="green">{message}</Alert></div>}
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><Globe size={17} className="text-brand-600" /> Preferences</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Language">
              <Select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
              </Select>
            </Field>
            <Field label="Theme">
              <div className="flex gap-2">
                <button onClick={() => setForm({ ...form, theme: 'light' })} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${form.theme === 'light' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'}`}>
                  <Sun size={15} /> Light
                </button>
                <button onClick={() => setForm({ ...form, theme: 'dark' })} className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 text-sm font-semibold transition ${form.theme === 'dark' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-500'}`}>
                  <Moon size={15} /> Dark
                </button>
              </div>
            </Field>
          </div>
          <h4 className="font-bold text-ink-800 text-sm mt-6 mb-3 flex items-center gap-2"><Bell size={15} className="text-brand-600" /> Notifications</h4>
          <div className="space-y-2.5">
            {[
              { key: 'notifyEmail', label: 'Email notifications', desc: 'Job alerts, exam reminders & quiz results by email' },
              { key: 'notifyPush', label: 'Push notifications', desc: 'In-app alerts for new jobs, quizzes and results' },
            ].map((n) => (
              <label key={n.key} className="flex items-center justify-between gap-3 rounded-xl border border-ink-200 p-3.5 cursor-pointer hover:border-brand-300">
                <div>
                  <p className="text-sm font-semibold text-ink-800">{n.label}</p>
                  <p className="text-xs text-ink-400 mt-0.5">{n.desc}</p>
                </div>
                <input
                  type="checkbox"
                  checked={form[n.key as keyof typeof form] as boolean}
                  onChange={(e) => setForm({ ...form, [n.key]: e.target.checked })}
                  className="h-5 w-5 rounded accent-brand-600"
                />
              </label>
            ))}
          </div>
          <Button onClick={savePrefs} loading={saving} className="mt-5">Save preferences</Button>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><KeyRound size={17} className="text-brand-600" /> Change password</h3>
          {pwMessage && <div className="mb-4"><Alert tone="green">{pwMessage}</Alert></div>}
          <form onSubmit={changePassword} className="space-y-4">
            <Field label="Current password">
              <Input type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="New password">
                <Input type="password" required value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder="Min 8 chars, 1 upper, 1 number, 1 special" />
              </Field>
              <Field label="Confirm new password">
                <Input type="password" required value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
              </Field>
            </div>
            <Button type="submit" loading={pwSaving}>Update password</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
