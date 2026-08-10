import { useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { api, handleError } from '../lib/api';
import { Alert, Button, Card, Field, Input } from '../components/ui';

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/contact', form);
      setSent(true);
    } catch (err) {
      setError(handleError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Contact us</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-900 mt-2">We'd love to hear from you</h1>
        <p className="text-ink-500 mt-2">Questions, feedback or feature requests — drop us a line.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-6 space-y-5">
          {[
            { icon: Mail, title: 'Email', text: 'support@garudastudyhub.ai' },
            { icon: Phone, title: 'Phone', text: '+91 90000 00000 (Mon–Sat, 9am–7pm)' },
            { icon: MapPin, title: 'Office', text: 'Hyderabad, Telangana, India' },
            { icon: MessageCircle, title: 'Response time', text: 'We reply within 24 hours' },
          ].map((c) => (
            <div key={c.title} className="flex items-start gap-3">
              <div className="rounded-xl bg-brand-50 text-brand-600 p-2.5 shrink-0"><c.icon size={18} /></div>
              <div>
                <p className="font-bold text-ink-900 text-sm">{c.title}</p>
                <p className="text-sm text-ink-500 mt-0.5">{c.text}</p>
              </div>
            </div>
          ))}
        </Card>

        <Card className="lg:col-span-2 p-6">
          {sent ? (
            <div className="text-center py-14">
              <div className="text-5xl mb-3">📨</div>
              <h3 className="text-xl font-extrabold text-ink-900">Message sent!</h3>
              <p className="text-ink-500 mt-1 text-sm">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Name"><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              </div>
              <Field label="Subject"><Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
              <Field label="Message">
                <textarea required className="input min-h-32" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </Field>
              {error && <Alert>{error}</Alert>}
              <Button type="submit" className="!px-6" loading={sending}><Send size={16} /> Send message</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
