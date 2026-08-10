import { Link } from 'react-router-dom';
import { Eye, Heart, Shield, Target, Zap } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">About Garuda</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-900 mt-2">Why we built Garuda AI StudyHub</h1>
        <p className="text-ink-500 mt-3 max-w-2xl mx-auto leading-relaxed">
          Millions of aspirants prepare for government exams every year — often with scattered notes, missed deadlines
          and no feedback on their progress. We built one platform that brings everything together.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mb-12">
        {[
          { icon: Target, title: 'Our mission', text: 'Make high-quality exam preparation accessible and affordable for every Indian aspirant.' },
          { icon: Zap, title: 'AI-first', text: 'Personalised mentoring, planning and analytics powered by artificial intelligence.' },
          { icon: Shield, title: 'Trusted content', text: 'Content curated by educators and validated against official exam patterns.' },
          { icon: Heart, title: 'Built for aspirants', text: 'Every feature — from job alerts to streak tracking — exists to keep you consistent.' },
        ].map((f) => (
          <div key={f.title} className="card p-6">
            <div className="rounded-xl bg-brand-50 text-brand-600 p-3 w-fit"><f.icon size={22} /></div>
            <h3 className="font-bold text-ink-900 mt-4">{f.title}</h3>
            <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{f.text}</p>
          </div>
        ))}
      </div>

      <div className="card p-8 text-center bg-gradient-to-br from-brand-800 to-brand-600 !border-0 text-white">
        <h2 className="text-2xl font-extrabold">Learn Smart. Practice Better. Get Selected.</h2>
        <p className="text-brand-100 mt-2">That's not just our tagline — it's the outcome we design for.</p>
        <Link to="/register" className="btn bg-white text-brand-700 hover:bg-brand-50 !px-6 !py-3 font-bold mt-5 inline-flex">Start your journey</Link>
      </div>
    </div>
  );
}
