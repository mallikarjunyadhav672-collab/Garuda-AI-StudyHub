import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Alert, Card, Spinner } from '../components/ui';

export default function VerifyEmail() {
  const { token } = useParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Verification token was not provided.');
      setLoading(false);
      return;
    }

    api.get(`/auth/verify-email/${encodeURIComponent(token)}`)
      .then((res) => {
        setMessage(res.data.data.message || 'Email verified successfully. You can now sign in.');
      })
      .catch((err) => {
        setError(handleError(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><Spinner /></div>;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-brand-50 via-white to-sky-50">
      <div className="w-full max-w-xl">
        <Card className="p-8 sm:p-12 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-extrabold text-ink-900 mb-3">Email Verification</h1>
          {message ? (
            <>
              <Alert tone="green">{message}</Alert>
              <div className="mt-6">
                <Link to="/login" className="btn-primary inline-flex w-full justify-center py-3 text-sm">Go to login</Link>
              </div>
            </>
          ) : (
            <>
              <Alert tone="red">{error}</Alert>
              <div className="mt-6">
                <Link to="/register" className="btn-primary inline-flex w-full justify-center py-3 text-sm">Return to sign up</Link>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
