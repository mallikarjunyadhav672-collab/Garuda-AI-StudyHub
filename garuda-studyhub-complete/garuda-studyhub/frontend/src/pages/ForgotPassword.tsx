import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Alert, Button, Card, Field, Input } from '../components/ui';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setInfo('If the account exists, a reset token has been generated.');
      // In development the token is returned in the response for testing.
      if (data.data.resetToken) {
        setToken(data.data.resetToken);
        setInfo(`Reset token generated (dev mode): ${data.data.resetToken}`);
      }
      setStep(2);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      navigate('/login');
    } catch (err) {
      setError(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-brand-50 via-white to-ink-50">
      <div className="w-full max-w-md">
        <Card className="!shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center"><KeyRound size={24} /></div>
            <h1 className="text-2xl font-extrabold text-ink-900 mt-3">Reset your password</h1>
            <p className="text-sm text-ink-500 mt-1">{step === 1 ? 'Enter your account email to get a reset token.' : 'Enter the token and your new password.'}</p>
          </div>

          {error && <div className="mb-4"><Alert>{error}</Alert></div>}
          {info && <div className="mb-4"><Alert tone="blue">{info}</Alert></div>}

          {step === 1 ? (
            <form onSubmit={requestReset} className="space-y-4">
              <Field label="Email">
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <Input type="email" required placeholder="you@example.com" className="!pl-10" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </Field>
              <Button type="submit" className="w-full !py-3" loading={loading}>Send reset token</Button>
            </form>
          ) : (
            <form onSubmit={doReset} className="space-y-4">
              <Field label="Reset token">
                <div className="relative">
                  <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <Input required placeholder="Paste the token from your email" className="!pl-10 font-mono text-xs" value={token} onChange={(e) => setToken(e.target.value)} />
                </div>
              </Field>
              <Field label="New password">
                <Input type="password" required placeholder="Min 8 chars, 1 upper, 1 number, 1 special" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              <Field label="Confirm new password">
                <Input type="password" required placeholder="Repeat password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
              <Button type="submit" className="w-full !py-3" loading={loading}>Reset password</Button>
            </form>
          )}

          <p className="text-center text-sm text-ink-500 mt-6">
            Remembered it? <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700">Back to login</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
