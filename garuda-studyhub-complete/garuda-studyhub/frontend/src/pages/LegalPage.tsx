import { Link } from 'react-router-dom';

type LegalPageProps = {
  title: string;
  paragraphs: string[];
};

export default function LegalPage({ title, paragraphs }: LegalPageProps) {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-brand-50 via-white to-sky-50">
      <div className="w-full max-w-3xl card !shadow-2xl !shadow-brand-600/10 overflow-hidden border-ink-200/40">
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-blue-600 px-8 sm:px-12 py-10 sm:py-12 text-white">
          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm text-blue-50">Please review this page for the latest information about our policies and terms.</p>
        </div>
        <div className="p-8 sm:p-12 text-ink-700">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-sm leading-7 mb-4">{paragraph}</p>
          ))}
          <div className="mt-8">
            <Link to="/register" className="font-semibold text-brand-600 hover:text-brand-700 transition">← Back to Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
