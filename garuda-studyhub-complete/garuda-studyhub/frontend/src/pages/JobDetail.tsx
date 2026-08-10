import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bookmark, Briefcase, Building2, Calendar, CheckCircle2, ExternalLink, MapPin, Phone, Share2, Users } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Badge, Button, Card, ErrorState, LinkButton, Spinner } from '../components/ui';
import { deadlineLabel, deadlineTone, formatDate } from '../lib/format';

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [applied, setApplied] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/jobs/${id}`);
      setJob(data.data.job);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const toggleSave = async () => {
    try {
      if (job.saved) await api.delete(`/jobs/${job.id}/save`);
      else await api.post(`/jobs/${job.id}/save`);
      load();
    } catch { /* ignore */ }
  };

  const checkApplied = async () => {
    try {
      const { data } = await api.get(`/users/me/stats`);
      // applications are tracked via notifications; simplest check is by re-attempt apply
      void data;
    } catch { /* ignore */ }
  };
  useEffect(() => { checkApplied(); }, []);

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} retry={load} />;

  return (
    <div className="max-w-5xl">
      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-8 text-white">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="green">{job.status}</Badge>
            {job.featured && <span className="chip bg-amber-400/20 text-amber-200 border border-amber-300/30">★ Featured</span>}
            {job.trend && <span className="chip bg-white/10 text-brand-100 border border-white/20">🔥 Trending</span>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-3">{job.role}</h1>
          <p className="text-brand-100 mt-1 flex items-center gap-2"><Building2 size={16} /> {job.org} {job.exam ? `· ${job.exam}` : ''}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton to={`/jobs/${job.id}/apply`} variant="secondary" className="!bg-white !text-brand-700 hover:!bg-brand-50 !font-bold">Apply Now →</LinkButton>
            <button onClick={toggleSave} className={`btn ${job.saved ? 'bg-amber-400/20 text-amber-200 border border-amber-300/40' : 'border border-white/30 text-white hover:bg-white/10'}`}>
              <Bookmark size={16} fill={job.saved ? 'currentColor' : 'none'} /> {job.saved ? 'Saved' : 'Save'}
            </button>
            <button className="btn border border-white/30 text-white hover:bg-white/10"><Share2 size={16} /> Share</button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-ink-100">
          {[
            { icon: Users, label: 'Total posts', value: job.posts ? job.posts.toLocaleString('en-IN') : '—' },
            { icon: Calendar, label: 'Last date', value: formatDate(job.lastDate) },
            { icon: MapPin, label: 'Location', value: job.location || '—' },
            { icon: Briefcase, label: 'Job type', value: job.jobType || '—' },
          ].map((s, i) => (
            <div key={i} className="p-4 text-center">
              <s.icon size={18} className="mx-auto text-brand-500" />
              <p className="text-sm font-bold text-ink-900 mt-1.5">{s.value}</p>
              <p className="text-[11px] text-ink-400">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="font-bold text-ink-900 px-5 pt-5">About the recruitment</h2>
            <p className="text-sm text-ink-600 leading-relaxed px-5 py-4">{job.description || 'No description provided.'}</p>
            {job.salary && (
              <div className="mx-5 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm">
                <span className="font-bold text-emerald-700">Salary:</span> <span className="text-emerald-700">{job.salary}</span>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-bold text-ink-900 px-5 pt-5">Eligibility</h2>
            <ul className="p-5 space-y-2.5">
              {job.eligibility?.length ? job.eligibility.map((e: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-600"><CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" /> {e}</li>
              )) : <li className="text-sm text-ink-500">{job.qualification || '—'}</li>}
              {job.ageLimit && <li className="flex items-start gap-2.5 text-sm text-ink-600"><CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" /> Age limit: {job.ageLimit}</li>}
              {job.applicationFee && <li className="flex items-start gap-2.5 text-sm text-ink-600"><CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" /> Application fee: {job.applicationFee}</li>}
            </ul>
          </Card>

          {job.selectionProcess?.length > 0 && (
            <Card>
              <h2 className="font-bold text-ink-900 px-5 pt-5">Selection process</h2>
              <ol className="p-5 space-y-3">
                {job.selectionProcess.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <span className="text-sm text-ink-600 pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-bold text-ink-900 mb-3">Quick facts</h3>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-400">Deadline</dt><dd className="font-semibold text-ink-800"><Badge tone={deadlineTone(job.lastDate)}>{deadlineLabel(job.lastDate)}</Badge></dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Department</dt><dd className="font-semibold text-ink-800">{job.department || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-400">Qualification</dt><dd className="font-semibold text-ink-800 text-right max-w-[60%]">{job.qualification || '—'}</dd></div>
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="font-bold text-ink-900 mb-3">Ready to apply?</h3>
            <p className="text-sm text-ink-500 mb-4">Keep your documents ready and submit before the deadline.</p>
            <LinkButton to={`/jobs/${job.id}/apply`} className="w-full">Apply Now</LinkButton>
            {job.noticeUrl && (
              <a href={job.noticeUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 py-2">
                Official notification <ExternalLink size={14} />
              </a>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
