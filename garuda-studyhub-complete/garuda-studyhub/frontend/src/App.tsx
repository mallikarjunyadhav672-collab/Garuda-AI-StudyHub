import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useAuth } from './lib/auth';
import { PageLoader } from './components/ui';
import { PublicLayout, AppShell } from './components/layout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import LegalPage from './pages/LegalPage';
import About from './pages/About';
import Contact from './pages/Contact';
import Faq from './pages/Faq';
import Career from './pages/Career';
import Bookmarks from './pages/Bookmarks';
import Achievements from './pages/Achievements';
import Dashboard from './pages/Dashboard';
import VerifyEmail from './pages/VerifyEmail';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import JobApply from './pages/JobApply';
import Materials from './pages/Materials';
import MaterialDetail from './pages/MaterialDetail';
import Mocks from './pages/Mocks';
import MockInstructions from './pages/MockInstructions';
import MockAttempt from './pages/MockAttempt';
import MockResult from './pages/MockResult';
import MockSolutions from './pages/MockSolutions';
import MockAnalytics from './pages/MockAnalytics';
import Quiz from './pages/Quiz';
import QuizToday from './pages/QuizToday';
import QuizResult from './pages/QuizResult';
import Affairs from './pages/Affairs';
import AffairDetail from './pages/AffairDetail';
import Videos from './pages/Videos';
import VideoDetail from './pages/VideoDetail';
import AIAssistant from './pages/AIAssistant';
import AIPlanner from './pages/AIPlanner';
import Leaderboard from './pages/Leaderboard';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminJobs from './pages/admin/AdminJobs';
import AdminMaterials from './pages/admin/AdminMaterials';
import AdminMocks from './pages/admin/AdminMocks';
import AdminQuiz from './pages/admin/AdminQuiz';
import AdminAffairs from './pages/admin/AdminAffairs';
import AdminVideos from './pages/admin/AdminVideos';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminTestimonials from './pages/admin/AdminTestimonials';
import AdminContact from './pages/admin/AdminContact';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Clear message when a non-admin tries to open the admin panel
 *  (instead of silently bouncing to the student dashboard). */
function AdminDenied() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const switchToAdmin = async () => {
    await logout();
    navigate('/login');
  };
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full card p-8 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <ShieldAlert size={30} />
        </div>
        <h1 className="text-xl font-extrabold text-ink-900 mt-4">Admin access required</h1>
        <p className="text-sm text-ink-500 mt-2 leading-relaxed">
          Nuvvu ippudu <b className="text-ink-800">Student account</b> tho login ayyav
          (<span className="text-ink-700">{user?.email}</span>). Admin panel choodataniki
          <b className="text-ink-800"> Admin account</b> tho login kavali:
        </p>
        <div className="mt-4 rounded-xl bg-ink-50 border border-ink-200 px-4 py-3 text-sm">
          <p className="font-mono text-ink-700">admin@garuda.ai</p>
          <p className="font-mono text-ink-700">Admin@123</p>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={switchToAdmin} className="btn-primary w-full">
            <LogOut size={15} /> Switch to Admin login
          </button>
          <Link to="/dashboard" className="btn-secondary w-full">← Go to my Dashboard</Link>
        </div>
      </div>
    </div>
  );
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin' && user.role !== 'superadmin') return <AdminDenied />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) return <Navigate to={user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/dashboard'} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
        <Route path="/terms" element={<LegalPage title="Terms of Service" paragraphs={["These terms govern your use of Garuda AI StudyHub and related services.", "You agree to use the platform responsibly, protect your account credentials, and comply with all applicable laws.", "Garuda reserves the right to suspend or terminate access for misuse, abuse, or violation of these terms."]} />} />
        <Route path="/privacy" element={<LegalPage title="Privacy Policy" paragraphs={["We collect the information you provide when creating an account, using the platform, and contacting support.", "This information is used to provide and improve learning services, manage your account, and communicate important updates.", "We do not sell your personal information to third parties, and we take reasonable measures to protect your data."]} />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/materials" element={<Materials />} />
        <Route path="/mock" element={<Mocks />} />
        <Route path="/affairs" element={<Affairs />} />
        <Route path="/affairs/:id" element={<AffairDetail />} />
      </Route>

      {/* Authenticated */}
      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/jobs/listing" element={<Jobs />} />
        <Route path="/jobs/saved" element={<Jobs saved />} />
        <Route path="/jobs/search" element={<Jobs />} />
        <Route path="/jobs/categories" element={<Jobs />} />
        <Route path="/jobs/organizations" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/jobs/:id/apply" element={<JobApply />} />
        <Route path="/materials/:id" element={<MaterialDetail />} />
        <Route path="/materials/bookmarks" element={<Materials bookmarks />} />
        <Route path="/materials/categories" element={<Materials />} />
        <Route path="/mock/:id/instructions" element={<MockInstructions />} />
        <Route path="/mock/:id/attempt" element={<MockAttempt />} />
        <Route path="/mock/result/:sessionId" element={<MockResult />} />
        <Route path="/mock/solutions/:sessionId" element={<MockSolutions />} />
        <Route path="/mock/analytics" element={<MockAnalytics />} />
        <Route path="/mock/leaderboard" element={<Leaderboard />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/quiz/today" element={<QuizToday />} />
        <Route path="/quiz/previous" element={<Quiz />} />
        <Route path="/quiz/result/:id" element={<QuizResult />} />
        <Route path="/quiz/leaderboard" element={<Leaderboard />} />
        <Route path="/videos" element={<Videos />} />
        <Route path="/videos/:id" element={<VideoDetail />} />
        <Route path="/videos/categories" element={<Videos />} />
        <Route path="/videos/playlists" element={<Videos />} />
        <Route path="/videos/saved" element={<Videos saved />} />
        <Route path="/ai/assistant" element={<AIAssistant />} />
        <Route path="/ai/planner" element={<AIPlanner />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/bookmarks" element={<Bookmarks />} />
        <Route path="/achievements" element={<Achievements />} />
        <Route path="/career" element={<Career />} />
      </Route>

      {/* Admin */}
      <Route element={<AdminRoute><AppShell /></AdminRoute>}>
        <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
        <Route path="/admin/jobs" element={<AdminLayout><AdminJobs /></AdminLayout>} />
        <Route path="/admin/materials" element={<AdminLayout><AdminMaterials /></AdminLayout>} />
        <Route path="/admin/mocks" element={<AdminLayout><AdminMocks /></AdminLayout>} />
        <Route path="/admin/quiz" element={<AdminLayout><AdminQuiz /></AdminLayout>} />
        <Route path="/admin/affairs" element={<AdminLayout><AdminAffairs /></AdminLayout>} />
        <Route path="/admin/videos" element={<AdminLayout><AdminVideos /></AdminLayout>} />
        <Route path="/admin/notifications" element={<AdminLayout><AdminNotifications /></AdminLayout>} />
        <Route path="/admin/testimonials" element={<AdminLayout><AdminTestimonials /></AdminLayout>} />
        <Route path="/admin/contact" element={<AdminLayout><AdminContact /></AdminLayout>} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
