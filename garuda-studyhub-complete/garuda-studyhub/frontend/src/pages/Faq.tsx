import { ChevronDown } from 'lucide-react';

const faqs = [
  { q: 'Is Garuda AI StudyHub free?', a: 'Yes — registration, daily quizzes, mock tests, current affairs, job alerts and the AI mentor are completely free. A premium tier with advanced analytics and video courses is planned.' },
  { q: 'Which exams does it cover?', a: 'SSC (CGL, CHSL, JE), UPSC CSE, IBPS/SBI/RBI banking, RRB Railways, TSPSC, APPSC, Police & Defence and Teaching (CTET/TET), plus state-specific exams.' },
  { q: 'How does the AI assistant work?', a: 'The AI assistant (Garuda) answers exam strategy, syllabus and routine questions instantly. It also powers the AI Study Planner which builds a personalized weekly schedule.' },
  { q: 'Are mock tests in the actual exam pattern?', a: 'Yes. Full-length mocks mirror the official pattern with matching question distribution, timing and negative marking. Results are auto-scored with solutions and analytics.' },
  { q: 'How is my rank calculated?', a: 'Your rank is calculated against everyone who has completed the same mock test, based on total score. Leaderboards update in real time.' },
  { q: 'Can I change my target exam later?', a: 'Yes — go to Profile or Settings anytime and update your target exam and preferences.' },
  { q: 'How do I reset my password?', a: 'You can change your password from Settings → Change password. Password reset by email is coming soon.' },
  { q: 'Is my data safe?', a: 'Passwords are hashed with bcrypt and tokens are stored securely. We never share your personal data.' },
];

export default function Faq() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Help center</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-900 mt-2">Frequently asked questions</h1>
        <p className="text-ink-500 mt-2">Everything you need to know about Garuda AI StudyHub.</p>
      </div>
      <div className="space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="card group p-5">
            <summary className="flex items-center justify-between cursor-pointer font-semibold text-ink-900 list-none">
              {f.q}
              <ChevronDown size={18} className="text-ink-400 group-open:rotate-180 transition shrink-0 ml-3" />
            </summary>
            <p className="text-sm text-ink-500 mt-3 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
