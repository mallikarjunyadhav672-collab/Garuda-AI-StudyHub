import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Upload } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Alert, Button, Card, Field, Input, Spinner } from '../components/ui';
import { formatDate } from '../lib/format';

export default function JobApply() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/jobs/${id}`).then(({ data }) => setJob(data.data.job)).catch((e) => setError(handleError(e))).finally(() => setLoading(false));
  }, [id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/jobs/${id}/apply`, { notes });
      setSuccess(true);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner />;
  if (success)
    return (
      <div className="max-w-lg mx-auto">
        <Card className="p-10 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 size={34} className="text-emerald-600" /></div>
          <h1 className="text-2xl font-extrabold text-ink-900 mt-4">Application submitted! 🎉</h1>
          <p className="text-ink-500 mt-2 text-sm">Your application for <span className="font-semibold text-ink-800">{job.role}</span> at {job.org} has been recorded. We'll notify you of any updates.</p>
          <div className="flex gap-3 justify-center mt-6">
            <Link to={`/jobs/${job.id}`} className="btn-secondary">Back to job</Link>
            <Link to="/jobs" className="btn-primary">Browse more jobs</Link>
          </div>
        </Card>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand-800 to-brand-600 px-6 py-6 text-white">
          <p className="text-xs text-brand-200 font-semibold uppercase tracking-widest">Job application</p>
          <h1 className="text-xl font-extrabold mt-1">{job?.role}</h1>
          <p className="text-brand-100 text-sm mt-0.5">{job?.org} · Apply by {formatDate(job?.lastDate)}</p>
        </div>
        <div className="p-6">
          {error && <div className="mb-4"><Alert>{error}</Alert></div>}
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name">
                <Input value={user?.name || ''} readOnly className="bg-ink-50" />
              </Field>
              <Field label="Email">
                <Input value={user?.email || ''} readOnly className="bg-ink-50" />
              </Field>
            </div>
            <Field label="Phone">
              <Input value={user?.phone || ''} readOnly className="bg-ink-50" placeholder="Add your phone in profile" />
            </Field>
            <Field label="Resume / documents">
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 hover:border-brand-400 bg-ink-50/50 px-4 py-8 cursor-pointer transition">
                <Upload size={22} className="text-ink-400" />
                <span className="text-sm font-semibold text-ink-600">Upload resume (PDF)</span>
                <span className="text-xs text-ink-400">Max 5 MB · Optional for now</span>
                <input type="file" className="hidden" accept=".pdf" />
              </label>
            </Field>
            <Field label="Cover note (optional)">
              <textarea className="input min-h-24" placeholder="Tell the recruiter why you're a good fit…" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button type="submit" className="w-full !py-3" loading={submitting}>
              {submitting ? 'Submitting…' : 'Submit Application'}
            </Button>
            <p className="text-xs text-ink-400 text-center">By applying you agree to receive job updates from Garuda StudyHub.</p>
          </form>
        </div>
      </Card>
    </div>
  );
}
