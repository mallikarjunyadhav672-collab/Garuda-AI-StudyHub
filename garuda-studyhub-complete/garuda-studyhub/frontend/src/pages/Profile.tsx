import { useEffect, useState } from 'react';
import { Award, BookOpen, Camera, Flame, Target, Trophy, User as UserIcon, Zap } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Alert, Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, Input, LinkButton, PageHeader, Spinner } from '../components/ui';
import { formatDate } from '../lib/format';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>({});
  const [form, setForm] = useState({ name: '', phone: '', examTarget: '', avatar: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/users/me'), api.get('/users/me/achievements')])
      .then(([p, a]) => {
        setProfile(p.data.data);
        setAchievements(a.data.data.achievements);
        setUserStats(a.data.data.stats || {});
        setForm({ name: p.data.data.user.name, phone: p.data.data.user.phone || '', examTarget: p.data.data.user.examTarget || '', avatar: p.data.data.user.avatar || '' });
      })
      .catch((e) => setError(handleError(e)))
      .finally(() => setLoading(false));
  }, []);

  const uploadAvatar = async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/upload?type=avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, avatar: data.data.url }));
    } catch (err) {
      setError(handleError(err));
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const { data } = await api.put('/users/me', {
        name: form.name, phone: form.phone, examTarget: form.examTarget, avatar: form.avatar,
      });
      updateUser({ ...user!, name: form.name, phone: form.phone, examTarget: form.examTarget, avatar: form.avatar });
      setMessage('Profile updated successfully ✓');
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (error && !profile) return <ErrorState message={error} retry={() => window.location.reload()} />;

  const p = profile;

  return (
    <div className="max-w-4xl">
      <PageHeader eyebrow="Your account" title="Profile" description="Manage your personal details and track your achievements." />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Identity card */}
          <Card className="p-6 text-center">
            <Avatar name={user?.name || 'U'} src={user?.avatar} size={84} />
            <h2 className="font-extrabold text-ink-900 text-lg mt-3">{user?.name}</h2>
            <p className="text-sm text-ink-500">{user?.email}</p>
            {user?.examTarget && <div className="mt-2"><Badge tone="violet">{user.examTarget}</Badge></div>}
            <div className="mt-4 flex justify-center gap-2">
              <Badge tone={user?.isPremium ? 'green' : 'slate'}>{user?.isPremium ? '⭐ Premium' : 'Free plan'}</Badge>
              <Badge tone="blue">{user?.role === 'admin' ? 'Admin' : 'Aspirant'}</Badge>
            </div>
            <p className="text-xs text-ink-400 mt-3">Member since {formatDate(p.user.createdAt)}</p>
          </Card>

          {/* Achievements */}
          <Card>
            <h3 className="font-bold text-ink-900 px-5 pt-5 flex items-center gap-2"><Award size={17} className="text-amber-500" /> Achievements</h3>
            <div className="p-4 space-y-2">
              {achievements.map((a: any) => (
                <div key={a.id} className={`flex items-center gap-3 rounded-xl border p-3 ${a.earned ? 'border-emerald-200 bg-emerald-50/50' : 'border-ink-200 bg-ink-50 opacity-60'}`}>
                  <span className="text-xl">{a.earned ? '🏅' : '🔒'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-800">{a.title}</p>
                    <p className="text-xs text-ink-500">{a.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><UserIcon size={17} className="text-brand-600" /> Personal details</h3>
            {message && <div className="mb-4"><Alert tone="green">{message}</Alert></div>}
            {error && <div className="mb-4"><Alert>{error}</Alert></div>}
            <form onSubmit={save} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Full name">
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Mobile">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="98765 43210" />
                </Field>
              </div>
              <Field label="Target exam">
                <Input value={form.examTarget} onChange={(e) => setForm({ ...form, examTarget: e.target.value })} placeholder="e.g. SSC CGL 2026" />
              </Field>
              <Field label="Profile photo" hint="Upload a JPG/PNG (max 5 MB) or paste an image URL below.">
                <div className="flex items-center gap-3">
                  <Avatar name={form.name || 'U'} src={form.avatar || undefined} size={52} />
                  <label className="btn-secondary !py-2 cursor-pointer">
                    <Camera size={15} /> Upload photo
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                  </label>
                </div>
                <Input className="mt-2" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="or paste image URL" />
              </Field>
              <div className="flex gap-3">
                <Button type="submit" loading={saving}>Save changes</Button>
                <LinkButton to="/settings" variant="secondary">Settings</LinkButton>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-ink-900 mb-4 flex items-center gap-2"><Zap size={17} className="text-brand-600" /> Quick stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Flame, label: 'Streak', value: userStats.studyStreak ?? 0 },
                { icon: Target, label: 'Avg accuracy', value: `${userStats.avgAccuracy ?? 0}%` },
                { icon: BookOpen, label: 'Mocks', value: userStats.totalMocksTaken ?? 0 },
                { icon: Trophy, label: 'Rank', value: `#${userStats.rank ?? 1}` },
              ].map((s, i) => (
                <div key={i} className="rounded-xl bg-ink-50 border border-ink-200 p-4 text-center">
                  <s.icon size={18} className="mx-auto text-brand-600" />
                  <p className="font-extrabold text-ink-900 mt-1.5">{s.value}</p>
                  <p className="text-[11px] text-ink-500">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
