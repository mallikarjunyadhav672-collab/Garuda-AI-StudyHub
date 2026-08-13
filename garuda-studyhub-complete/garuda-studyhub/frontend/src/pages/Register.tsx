import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Alert, Button, Field, Input, Select } from '../components/ui';
import { handleError } from '../lib/api';
import logo from '../assets/garuda-logo.jpeg';

const examOptions = [
  'SSC CGL', 'SSC CHSL', 'UPSC CSE', 'IBPS PO', 'SBI Clerk', 'RRB NTPC',
  'TSPSC Group 1', 'APPSC Group 2', 'Police / Defence', 'CTET / Teaching', 'Other',
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', examTarget: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [terms, setTerms] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    if (!terms) return setError('Please accept the terms to continue.');
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        examTarget: form.examTarget || undefined,
      });
      navigate('/login', {
        state: {
          info: 'Account created. Please verify your email before signing in.',
          email: form.email,
        },
      });
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-brand-50 via-white to-sky-50">
      <div className="w-full max-w-2xl">
        <div className="card !shadow-2xl !shadow-brand-600/10 overflow-hidden border-ink-200/40">
          <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-blue-600 px-8 sm:px-12 py-10 sm:py-12 text-white">
            <div className="flex items-center gap-4 mb-6">
              <img src={logo} alt="Garuda AI StudyHub" className="h-16 w-16 rounded-2xl border border-white/20 shadow-xl shadow-black/20 object-cover" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-100 font-semibold">Get Started</p>
                <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">Join Garuda</h1>
              </div>
            </div>
            <p className="max-w-md text-sm text-blue-50">
              Create your free account and start your journey to exam success with AI-powered learning.
            </p>
          </div>

          <div className="p-8 sm:p-12">
            <h2 className="text-2xl font-bold text-ink-900 mb-2">Create your account</h2>
            <p className="text-sm text-ink-500 mb-8">Free forever. Start your preparation journey today.</p>

            {error && <div className="mb-6"><Alert tone="red">{error}</Alert></div>}

            <form onSubmit={submit} className="space-y-5">
              <Field label="Full Name">
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <Input required placeholder="e.g. Rahul Sharma" className="!pl-11" autoComplete="name" value={form.name} onChange={set('name')} />
                </div>
              </Field>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Email Address">
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <Input type="email" required placeholder="you@example.com" className="!pl-11" autoComplete="email" value={form.email} onChange={set('email')} />
                  </div>
                </Field>
                <Field label="Mobile">
                  <div className="relative">
                    <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <Input placeholder="9876543210" className="!pl-11" autoComplete="tel" value={form.phone} onChange={set('phone')} />
                  </div>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <Field label="Password">
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <Input type={show ? 'text' : 'password'} required placeholder="Min 8 characters" className="!pl-11 !pr-11" autoComplete="new-password" value={form.password} onChange={set('password')} />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition">
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm Password">
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                    <Input type={show ? 'text' : 'password'} required placeholder="Repeat password" className="!pl-11" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
                  </div>
                </Field>
              </div>
              <Field label="Target Exam (Optional)">
                <Select value={form.examTarget} onChange={set('examTarget')}>
                  <option value="">Select your target exam…</option>
                  {examOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Field>
              <label className="flex items-start gap-3 text-sm text-ink-600 cursor-pointer group">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 rounded border-ink-300 w-4 h-4 group-hover:border-brand-500 transition" />
                <span className="leading-relaxed">I agree to the <Link to="/terms" onClick={(e) => e.stopPropagation()} className="text-brand-600 font-semibold hover:text-brand-700">Terms of Service</Link> and <Link to="/privacy" onClick={(e) => e.stopPropagation()} className="text-brand-600 font-semibold hover:text-brand-700">Privacy Policy</Link>.</span>
              </label>
              <Button type="submit" className="w-full !py-3 !text-base" loading={loading}>
                {loading ? 'Creating account…' : 'Create Free Account'}
              </Button>
            </form>

            <p className="text-center text-sm text-ink-600 mt-8">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700 transition">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
