import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Bot, BookOpen, Briefcase, CalendarCheck, ChevronDown, Flame, LineChart,
  Newspaper, PlayCircle, Shield, Sparkles, Star, Target, Timer, Trophy, Users, Zap,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api, handleError } from '../lib/api';
import { Logo } from '../components/layout';
import { Badge, Button, Input } from '../components/ui';

const channelHighlights = [
   { value: 'Live', label: 'Exam-focused videos' },
   { value: 'Free', label: 'Study guidance' },
   { value: 'Weekly', label: 'Fresh content' },
];

const exams = [
  { name: 'SSC CGL / CHSL', icon: '📋', desc: 'Group B & C central posts', to: '/mock' },
  { name: 'UPSC CSE', icon: '🏛️', desc: 'IAS, IPS, IFS & central services', to: '/mock' },
  { name: 'IBPS / SBI', icon: '🏦', desc: 'PO, Clerk & specialist officers', to: '/mock' },
  { name: 'RRB NTPC', icon: '🚆', desc: 'Railway group posts', to: '/mock' },
  { name: 'TSPSC / APPSC', icon: '🏢', desc: 'State group services', to: '/mock' },
  { name: 'Police / Defence', icon: '🎖️', desc: 'Constable, SI & armed forces', to: '/mock' },
  { name: 'Teaching (CTET/TET)', icon: '🍎', desc: 'School teacher eligibility', to: '/mock' },
  { name: 'Banking (RBI)', icon: '💹', desc: 'Grade B & assistant', to: '/mock' },
];

const features = [
  { icon: Timer, title: 'Realistic Mock Tests', desc: 'Full-length, sectional & topic tests with auto-scoring, negative marking and All-India ranking.' },
  { icon: CalendarCheck, title: 'Daily Quiz & Streaks', desc: '10 questions every day with streak tracking to build a consistent practice habit.' },
  { icon: Bot, title: 'AI Study Mentor', desc: 'Ask anything — strategies, syllabus, routines. Personalized answers in seconds.' },
  { icon: CalendarCheck, title: 'AI Study Planner', desc: 'Generate a week-by-week schedule from your exam date and daily hours.' },
  { icon: Briefcase, title: 'Job Notifications', desc: 'Latest government job alerts with deadlines, eligibility and one-click apply tracking.' },
  { icon: BookOpen, title: 'Study Materials', desc: 'Notes, formula handbooks and PDFs curated by subject and exam.' },
  { icon: Newspaper, title: 'Current Affairs', desc: 'Daily, weekly and monthly digests built for exam relevance.' },
  { icon: LineChart, title: 'Deep Analytics', desc: 'Subject-wise accuracy, performance trends and leaderboard ranks.' },
];

const faqs = [
  { q: 'Is Garuda AI StudyHub free?', a: 'Yes — registration, daily quizzes, mock tests, current affairs and the AI mentor are free. A premium tier with advanced analytics and video courses is coming soon.' },
  { q: 'Which exams does it cover?', a: 'SSC (CGL, CHSL, JE), UPSC CSE, IBPS/SBI/RBI banking, RRB Railways, TSPSC, APPSC, Police & Defence, and Teaching (CTET/TET) — plus state-specific exams.' },
  { q: 'How does the AI mentor work?', a: 'The AI assistant answers exam strategy, syllabus and routine questions instantly. The AI planner builds a personalized weekly study schedule from your exam date and daily hours.' },
  { q: 'Are mock tests in the actual exam pattern?', a: 'Yes. Full-length mocks mirror the real pattern with the same question distribution, timing and negative marking. Results are auto-scored with detailed solutions.' },
];

type FeedbackItem = {
  id: number;
  name: string;
  rating: number;
  feedback: string;
  examDetails?: string | null;
  status?: string;
  createdAt: string;
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';
}

export default function Landing() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [form, setForm] = useState({ name: '', feedback: '', rating: 5, examDetails: '' });
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const { data } = await api.get('/testimonials');
        setFeedbacks((data.data?.testimonials || []) as FeedbackItem[]);
      } catch {
        setFeedbacks([]);
      }
    };

    void loadTestimonials();
  }, []);

  const averageRating = useMemo(() => {
    if (!feedbacks.length) return 5;
    const total = feedbacks.reduce((sum, item) => sum + item.rating, 0);
    return Number((total / feedbacks.length).toFixed(1));
  }, [feedbacks]);

  const visibleFeedbacks = useMemo(() => {
    return [...feedbacks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [feedbacks]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('');

    if (!form.name.trim() || !form.feedback.trim()) {
      setStatus('Please enter your name and feedback before submitting.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/testimonials', {
        name: form.name.trim(),
        rating: form.rating,
        feedback: form.feedback.trim(),
        examDetails: form.examDetails.trim(),
      });

      const entry = data.data?.testimonial as FeedbackItem | undefined;
      if (entry) {
        setFeedbacks((prev) => [entry, ...prev].slice(0, 6));
      }

      setForm({ name: '', feedback: '', rating: 5, examDetails: '' });
      setStatus('Thanks for your feedback! Your story has been added to the community section.');
    } catch (err) {
      setStatus(handleError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-ink-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-ink-900 to-ink-900" />
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent-500/20 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-semibold text-brand-200">
              <Sparkles size={14} /> AI-powered exam preparation platform
            </span>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight">
              Learn Smart.
              <br />
              Practice Better.
              <br />
              <span className="bg-gradient-to-r from-brand-300 via-brand-200 to-accent-400 bg-clip-text text-transparent">
                Get Selected.
              </span>
            </h1>
            <p className="mt-6 text-lg text-ink-300 max-w-xl leading-relaxed">
              India's all-in-one preparation companion for SSC, UPSC, Banking, Railways, TSPSC, APPSC, Police & Teaching.
              Mock tests, daily quizzes, current affairs, job alerts and an AI mentor — everything in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className="btn-primary !px-6 !py-3 !text-base">
                  Go to Dashboard <ArrowRight size={18} />
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn-primary !px-6 !py-3 !text-base">
                    Start Preparing Free <ArrowRight size={18} />
                  </Link>
                  <Link to="/mock" className="btn bg-white/10 border border-white/20 text-white hover:bg-white/20 !px-6 !py-3 !text-base">
                    Explore Mock Tests
                  </Link>
                </>
              )}
            </div>
            <div className="mt-10 rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-200">Garuda AI Study Hub</p>
                  <h3 className="mt-2 text-xl font-extrabold text-white">Learn faster with practical exam content</h3>
                  <p className="mt-2 text-sm text-ink-300 max-w-xl">Explore helpful videos, study strategies, and exam-focused guidance from our YouTube channel.</p>
                </div>
                <a
                  href="https://www.youtube.com/@GarudaAIstudyHub-x9z"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400"
                >
                  Visit Our YouTube Channel
                </a>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {channelHighlights.map((item) => (
                  <div key={item.label} className="rounded-xl bg-black/20 px-3 py-3 text-center">
                    <p className="text-lg font-extrabold text-white">{item.value}</p>
                    <p className="text-xs text-ink-300 mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hero dashboard mock */}
          <div className="hidden lg:block">
            <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Logo dark size="sm" />
                  <Badge tone="green">Live Mock</Badge>
                </div>
                <span className="text-xs text-ink-400">SSC CGL Tier-1</span>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { v: '62/100', l: 'Score' },
                  { v: '#14', l: 'All-India rank' },
                  { v: '84%', l: 'Accuracy' },
                ].map((s) => (
                  <div key={s.l} className="rounded-2xl bg-white/5 p-4 text-center">
                    <p className="text-xl font-extrabold text-brand-200">{s.v}</p>
                    <p className="text-[11px] text-ink-400 mt-1">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-white/5 p-4">
                <p className="text-xs font-bold text-ink-300 mb-3 flex items-center gap-1.5"><Flame size={13} className="text-orange-400" /> Weekly progress</p>
                <div className="flex items-end gap-2 h-20">
                  {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-brand-600 to-brand-400" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-600/30 to-accent-500/20 border border-brand-400/20 p-4">
                <div className="rounded-xl bg-brand-500/30 p-2.5"><Bot size={20} className="text-brand-200" /></div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">Garuda AI suggests</p>
                  <p className="text-xs text-ink-300 mt-0.5">Focus on Time & Work — your accuracy dipped to 55% last week.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ EXAMS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Exam coverage</p>
          <h2 className="text-3xl font-extrabold text-ink-900 mt-2">Prepare for every major government exam</h2>
          <p className="text-ink-500 mt-2 max-w-2xl mx-auto">One platform, every exam — with content tailored to each pattern.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {exams.map((e) => (
            <Link key={e.name} to={e.to} className="card p-5 hover:border-brand-300 hover:shadow-md transition group">
              <div className="text-3xl">{e.icon}</div>
              <h3 className="font-bold text-ink-900 mt-3 group-hover:text-brand-700">{e.name}</h3>
              <p className="text-sm text-ink-500 mt-1">{e.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="bg-white border-y border-ink-200/60 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Everything you need</p>
            <h2 className="text-3xl font-extrabold text-ink-900 mt-2">Built for serious aspirants</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div key={f.title} className="card p-6 hover:border-brand-300 hover:shadow-md transition">
                <div className="rounded-xl bg-brand-50 text-brand-600 p-3 w-fit"><f.icon size={22} /></div>
                <h3 className="font-bold text-ink-900 mt-4">{f.title}</h3>
                <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">How it works</p>
          <h2 className="text-3xl font-extrabold text-ink-900 mt-2">Your path to selection</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { n: '01', icon: Users, t: 'Create your profile', d: 'Set your target exam and preferences in 2 minutes.' },
            { n: '02', icon: Target, t: 'Practice daily', d: 'Attempt mocks, quizzes and study materials matched to your exam.' },
            { n: '03', icon: LineChart, t: 'Analyze & improve', d: 'Subject-wise analytics reveal exactly where to focus.' },
            { n: '04', icon: Trophy, t: 'Track & crack', d: 'Watch your rank climb as you track job deadlines and stay consistent.' },
          ].map((s) => (
            <div key={s.n} className="relative card p-6">
              <span className="text-4xl font-extrabold text-brand-100 absolute top-4 right-5">{s.n}</span>
              <div className="rounded-xl bg-ink-100 text-ink-700 p-3 w-fit"><s.icon size={22} /></div>
              <h3 className="font-bold text-ink-900 mt-4">{s.t}</h3>
              <p className="text-sm text-ink-500 mt-1.5">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="bg-ink-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-400">Success stories</p>
            <h2 className="text-3xl font-extrabold text-white mt-2">Aspirants who made it</h2>
          </div>
          {feedbacks.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-ink-200">
              <p className="text-lg font-semibold">No success stories yet</p>
              <p className="text-sm text-ink-300 mt-2">Be the first to share your journey and inspire others.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-5">
              {feedbacks.map((t) => {
                const initials = getInitials(t.name);
                const color = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626'][Math.abs(t.id % 5)];
                return (
                  <div key={t.id} className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <div className="flex gap-1 text-amber-400">{'★'.repeat(t.rating)}</div>
                    <p className="text-ink-200 text-sm mt-4 leading-relaxed">“{t.feedback}”</p>
                    <div className="flex items-center gap-3 mt-5">
                      <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: color }}>{initials}</div>
                      <div>
                        <p className="text-white font-bold text-sm">{t.name}</p>
                        {t.examDetails && <p className="text-xs text-brand-300">{t.examDetails}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============ FEEDBACK ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <div className="card p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700">
              <Star size={15} /> User Feedback & Ratings
            </div>
            <h2 className="text-3xl font-extrabold text-ink-900 mt-4">Share your experience with the community</h2>
            <p className="text-ink-500 mt-3 max-w-2xl leading-relaxed">Tell us how Garuda helped you prepare. Your feedback helps us keep improving the platform for every aspirant.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Your Name</label>
                  <Input required placeholder="Enter your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Your Rating</label>
                  <div className="flex items-center gap-1 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setForm({ ...form, rating: star })} className="text-xl transition" aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}>
                        <Star size={20} className={star <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300'} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Feedback</label>
                <textarea
                  required
                  rows={4}
                  value={form.feedback}
                  onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                  placeholder="What do you like most about Garuda?"
                  className="input min-h-[120px] resize-y"
                />
              </div>
              <div>
                <label className="label">Exam / Details (optional)</label>
                <Input
                  placeholder="e.g. SSC CGL 2025 · Selected"
                  value={form.examDetails}
                  onChange={(e) => setForm({ ...form, examDetails: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto" loading={loading}>
                {loading ? 'Submitting…' : 'Submit Feedback'}
              </Button>
            </form>

            {status && (
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                {status}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Community rating</p>
                  <p className="text-4xl font-extrabold text-ink-900 mt-2">{averageRating.toFixed(1)} <span className="text-base font-medium text-ink-500">/ 5</span></p>
                </div>
                <div className="rounded-2xl bg-brand-50 p-3 text-brand-600">
                  <Star size={24} className="fill-brand-500 text-brand-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} size={18} className={star <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'text-ink-300'} />
                ))}
              </div>
              <p className="mt-4 text-sm text-ink-500 leading-relaxed">Rated by {feedbacks.length} learners who trust Garuda for focused exam preparation and smarter daily practice.</p>
            </div>

            <div className="space-y-3">
              {visibleFeedbacks.map((item) => (
                <div key={item.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink-900">{item.name}</p>
                      <p className="text-xs text-ink-500 mt-1">{new Date(item.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} size={15} className={star <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-ink-600 mt-3 leading-relaxed">“{item.feedback}”</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">FAQ</p>
          <h2 className="text-3xl font-extrabold text-ink-900 mt-2">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="card group p-5">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-ink-900 list-none">
                {f.q}
                <ChevronDown size={18} className="text-ink-400 group-open:rotate-180 transition" />
              </summary>
              <p className="text-sm text-ink-500 mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-20">
        <div className="page-hero !rounded-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold">Your competition is already practicing.</h2>
          <p className="mt-3 text-brand-100 max-w-xl mx-auto">Join thousands of aspirants preparing smarter with Garuda. Free to start.</p>
          <div className="mt-7 flex justify-center gap-3">
            {user ? (
              <Link to="/dashboard" className="btn bg-white text-brand-700 hover:bg-brand-50 !px-6 !py-3 font-bold">Go to Dashboard</Link>
            ) : (
              <>
                <Link to="/register" className="btn bg-white text-brand-700 hover:bg-brand-50 !px-6 !py-3 font-bold">Create Free Account</Link>
                <Link to="/login" className="btn border border-white/30 text-white hover:bg-white/10 !px-6 !py-3">Sign in</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
