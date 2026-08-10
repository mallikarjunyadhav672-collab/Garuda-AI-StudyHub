import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-extrabold text-brand-100">404</p>
        <h1 className="text-2xl font-extrabold text-ink-900 mt-2">Page not found</h1>
        <p className="text-ink-500 mt-2">The page you're looking for doesn't exist or has moved.</p>
        <div className="flex gap-3 justify-center mt-6">
          <Link to="/" className="btn-primary">Go home</Link>
          <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
