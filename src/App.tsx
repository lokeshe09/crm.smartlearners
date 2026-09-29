import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import { UserRole } from './types';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import SchoolDashboard from './pages/SchoolDashboard';
import OrcaLexDashboard from './pages/OrcaLexDashboard';
import T from './theme/tokens';
// import ChatBot from './components/ChatBot';

const FONT = T.font.sans;

/* ─── Route guard ────────────────────────────────────────────── */
const ProtectedRoute: React.FC<{
  children: React.ReactElement;
  requiredRole?: UserRole;
}> = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (requiredRole && user?.role !== requiredRole) {
    if (user?.role === UserRole.ORCALEX_ADMIN) return <Navigate to="/orcalex" replace />;
    if (user?.role === UserRole.SCHOOL_ADMIN) return <Navigate to="/school" replace />;
    return <Navigate to="/teacher" replace />;
  }
  return children;
};

/* ─── Scroll-to-top FAB ──────────────────────────────────────── */
const ScrollToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 999,
        width: 44, height: 44, borderRadius: 14,
        background: `linear-gradient(180deg, ${T.color.brand[600]}, ${T.color.brand[700]})`,
        border: 'none', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: T.shadow.brand,
        transition: `transform 180ms ${T.motion.ease.spring}, box-shadow 180ms`,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = T.shadow.brandLg; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadow.brand; }}
    >
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
        <path d="M18 15l-6-6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
};

/* ─── Top nav / dashboard layout ─────────────────────────────── */
const DashboardLayout: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const roleMeta = (() => {
    if (user?.role === UserRole.ORCALEX_ADMIN) return { label: 'Platform Admin', short: 'Admin' };
    if (user?.role === UserRole.SCHOOL_ADMIN) return { label: 'School Admin', short: 'School' };
    return { label: 'Teacher', short: 'Teacher' };
  })();

  const initials = (user?.full_name || user?.username || 'U')
    .split(/\s+|@/).filter(Boolean).slice(0, 2)
    .map((w) => w[0].toUpperCase()).join('');

  const crumbs = (() => {
    if (location.pathname.startsWith('/teacher')) return 'Teacher Workspace';
    if (location.pathname.startsWith('/school')) return 'School Overview';
    if (location.pathname.startsWith('/orcalex')) return 'Platform Overview';
    return '';
  })();

  return (
    <div className="sl-dashboard" style={{ minHeight: '100vh', background: T.surface.canvas, fontFamily: FONT }}>
      <nav
        style={{
          position: 'sticky', top: 0, zIndex: 40,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'saturate(180%) blur(14px)',
          WebkitBackdropFilter: 'saturate(180%) blur(14px)',
          borderBottom: `1px solid ${T.border.subtle}`,
        }}
      >
        <div
          style={{
            maxWidth: 1920, margin: '0 auto',
            padding: '0 24px', height: 64,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          }}
        >
          {/* Brand + crumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                Smartlearners<span style={{ color: T.color.brand[700] }}>.ai</span>
              </span>
              {crumbs && (
                <>
                  <span aria-hidden style={{ color: T.color.neutral[300], fontSize: 14 }}>/</span>
                  <span style={{ fontSize: 13, color: T.text.tertiary, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {crumbs}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* User cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* User pill */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 120)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '5px 10px 5px 5px',
                  borderRadius: 999,
                  border: `1px solid ${T.border.subtle}`,
                  background: '#FFFFFF',
                  cursor: 'pointer', fontFamily: FONT,
                  transition: `border-color 150ms, box-shadow 150ms`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.color.neutral[300]; e.currentTarget.style.boxShadow = T.shadow.sm; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border.subtle; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 30, height: 30, borderRadius: 999,
                    background: `linear-gradient(135deg, ${T.color.brand[600]}, ${T.color.brand[700]})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
                  }}
                >
                  {initials}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text.primary, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.full_name || user?.username || 'Guest'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.text.tertiary, letterSpacing: '0.02em' }}>
                    {roleMeta.label}
                  </span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.text.tertiary} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 150ms', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    minWidth: 220, padding: 6,
                    background: '#FFFFFF',
                    border: `1px solid ${T.border.subtle}`,
                    borderRadius: 14,
                    boxShadow: T.shadow.lg,
                    animation: `entrance-stagger 180ms ${T.motion.ease.spring} both`,
                    zIndex: 60,
                  }}
                >
                  <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${T.border.subtle}`, marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>{user?.full_name || user?.username}</div>
                    <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 2, letterSpacing: '0.02em' }}>{roleMeta.label}</div>
                  </div>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={logout}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      border: 'none', background: 'transparent',
                      color: T.color.danger.text,
                      fontSize: 13, fontWeight: 700, fontFamily: FONT,
                      cursor: 'pointer', borderRadius: 10,
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = T.color.danger.bg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {children}

      {/* <ChatBot /> */}
      <ScrollToTop />
    </div>
  );
};

/* ─── Router ─────────────────────────────────────────────────── */
const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/teacher"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <TeacherDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/school"
        element={
          <ProtectedRoute>
            <DashboardLayout>
              <SchoolDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orcalex"
        element={
          <ProtectedRoute requiredRole={UserRole.ORCALEX_ADMIN}>
            <DashboardLayout>
              <OrcaLexDashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === UserRole.ORCALEX_ADMIN ? <Navigate to="/orcalex" replace /> :
            user?.role === UserRole.SCHOOL_ADMIN ? <Navigate to="/school" replace /> :
            <Navigate to="/teacher" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DashboardProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </DashboardProvider>
    </AuthProvider>
  );
};

export default App;
