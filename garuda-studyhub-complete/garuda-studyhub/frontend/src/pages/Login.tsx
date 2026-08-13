import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Alert, Button, Field, Input } from '../components/ui';
import { api, handleError } from '../lib/api';
import logo from '../assets/garuda-logo.jpeg';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { info?: string; email?: string; verificationUrl?: string } | null;
  const [email, setEmail] = useState(state?.email || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(state?.info || '');
  const [verificationUrl, setVerificationUrl] = useState(state?.verificationUrl || '');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setResendMessage('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin' || user.role === 'superadmin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async () => {
    setResendMessage('');
    setError('');
    setResendLoading(true);
    try {
      const { data } = await api.post('/auth/resend-verification', { email });
      setResendMessage(data.data.message || 'Verification email resent.');
    } catch (err) {
      setError(handleError(err));
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="w-full max-w-2xl">
        <div className="rounded-3xl border border-ink-200/40 bg-white shadow-2xl shadow-brand-600/10 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-950 via-brand-900 to-slate-950 px-8 sm:px-12 py-10 sm:py-12 text-white">
            <div className="flex items-center gap-4 mb-6">
              <img src={logo} alt="Garuda AI StudyHub" className="h-16 w-16 rounded-2xl border border-white/20 shadow-xl shadow-black/30 object-cover" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200 font-semibold">Welcome Back</p>
                <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">Sign in to Garuda</h1>
              </div>
            </div>
            <p className="max-w-md text-sm text-slate-300 leading-relaxed">
              Access your study materials, track progress, and achieve your exam goals with AI-powered guidance.
            </p>
          </div>
          <div className="p-8 sm:p-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-ink-900">Sign in to your account</h2>
              <p className="text-sm text-ink-500 mt-2">Enter your credentials to continue your learning journey.</p>
            </div>

            {infoMessage && <div className="mb-6"><Alert tone="green">{infoMessage}{verificationUrl ? (
                <>
                  <br />
                  <a href={verificationUrl} target="_blank" rel="noreferrer" className="font-semibold underline">Open verification link</a>
                </>
              ) : null}</Alert></div>}
            {error && <div className="mb-6"><Alert tone="red">{error}</Alert></div>}
            {resendMessage && <div className="mb-6"><Alert tone="green">{resendMessage}</Alert></div>}

            <form onSubmit={submit} className="space-y-5">
              <Field label="Email Address">
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <Input type="email" required placeholder="you@example.com" className="!pl-11" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </Field>
              <Field label="Password">
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <Input type={show ? 'text' : 'password'} required placeholder="••••••••" className="!pl-11 !pr-11" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <div className="flex flex-col gap-3 text-sm pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2.5 text-ink-600 cursor-pointer hover:text-ink-900 transition">
                  <input type="checkbox" className="rounded border-ink-300 w-4 h-4" /> Remember me
                </label>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <Link to="/forgot-password" className="text-brand-600 font-semibold hover:text-brand-700 transition">Forgot password?</Link>
                  {error.includes('Email not verified') && (
                    <button type="button" onClick={resendVerification} disabled={resendLoading || !email} className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition">
                      {resendLoading ? 'Resending verification…' : 'Resend verification email'}
                    </button>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full !py-3 !text-base" loading={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <div className="relative my-7">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-ink-500">New here?</span>
              </div>
            </div>

            <p className="text-center text-sm text-ink-600">
              <Link to="/register" className="font-bold text-brand-600 hover:text-brand-700 transition">Create a free account</Link>
            </p>
          </div>
        </div>
        <p className="text-center text-xs text-ink-400 mt-6">By signing in, you agree to our Terms of Service and Privacy Policy</p>
      </div>
    </div>
  );
}
