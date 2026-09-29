import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import T from '../theme/tokens';

const FONT = T.font.sans;

/* =====================================================================
   LoginPage — matches the reference mockup pixel-close.
   ===================================================================== */
const pageStyles = `
.sl-login {
  position: fixed; inset: 0;
  display: flex;
  font-family: ${FONT};
  overflow: hidden;
  background: #FFFFFF;
}
.sl-login-grid {
  position: relative;
  width: 100%; height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(440px, 0.72fr);
  max-width: 1560px;
  margin: 0 auto;
}

/* ═══════════════════ LEFT: DARK HERO ═══════════════════ */
.sl-hero {
  position: relative;
  overflow: hidden;
  padding: 32px 44px 22px;
  display: flex; flex-direction: column;
  gap: 20px;
  color: #FFFFFF;
  background:
    radial-gradient(1000px 500px at 100% 0%, rgba(139,92,246,0.28), transparent 55%),
    radial-gradient(700px 500px at -10% 100%, rgba(79,70,229,0.32), transparent 55%),
    linear-gradient(135deg, #16143C 0%, #1E1A5C 40%, #2A2680 100%);
}
.sl-hero::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(1400px 900px at 30% 40%, black 20%, transparent 78%);
  -webkit-mask-image: radial-gradient(1400px 900px at 30% 40%, black 20%, transparent 78%);
  pointer-events: none;
}
/* subtle wave lines at bottom */
.sl-hero::after {
  content: '';
  position: absolute; bottom: 0; right: 0; left: 0;
  height: 260px;
  background-image:
    radial-gradient(ellipse at 100% 100%, rgba(139,92,246,0.14), transparent 60%);
  pointer-events: none;
}

/* ─── Brand row ─── */
.sl-brand-row {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 14px;
}
.sl-brand-mark {
  width: 52px; height: 52px; border-radius: 14px;
  background: linear-gradient(135deg, #6366F1, #4F46E5);
  display: flex; align-items: center; justify-content: center;
  color: #fff; box-shadow: 0 8px 24px rgba(79,70,229,0.45);
}
.sl-brand-word {
  font-size: 28px; letter-spacing: -0.02em; font-weight: 800;
  color: #FFFFFF; line-height: 1;
}
.sl-brand-word .hl { color: #F5D65F; }
.sl-brand-tag {
  font-size: 11px; color: rgba(255,255,255,0.62); letter-spacing: 0.20em;
  text-transform: uppercase; font-weight: 700; margin-top: 6px;
}

/* ─── Middle section — 2col layout ─── */
.sl-hero-mid {
  position: relative; z-index: 2;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 28px;
  align-items: center;
}

/* Left copy column */
.sl-copy { min-width: 0; max-width: 520px; }

.sl-eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 8px 16px 8px 10px;
  background: rgba(79,70,229,0.20);
  border: 1px solid rgba(139,92,246,0.32);
  color: #FFFFFF;
  border-radius: 999px;
  font-size: 13px; font-weight: 600;
  margin-bottom: 22px;
  backdrop-filter: blur(10px);
}
.sl-eyebrow .ico {
  width: 22px; height: 22px; border-radius: 7px;
  background: rgba(255,255,255,0.15);
  color: #C7CDFF;
  display: inline-flex; align-items: center; justify-content: center;
}

.sl-hero-title {
  font-size: clamp(34px, 3.9vw, 52px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  font-weight: 800;
  color: #FFFFFF;
  margin: 0 0 20px;
}
.sl-hero-title span.line { display: block; }
.sl-hero-title span.hl {
  color: #F5D65F;
  display: inline-block;
}
.sl-hero-sub {
  font-size: 15px;
  line-height: 1.65;
  color: rgba(255,255,255,0.72);
  max-width: 440px;
  margin: 0 0 28px;
}

/* Compact Empowering Schools card (in-copy) */
.sl-empC {
  position: relative;
  border-radius: 18px;
  padding: 20px 22px;
  background: linear-gradient(135deg, rgba(79,70,229,0.32), rgba(139,92,246,0.28));
  border: 1px solid rgba(199,205,255,0.24);
  overflow: hidden;
  display: flex; align-items: center; gap: 16px;
  backdrop-filter: blur(10px);
  max-width: 520px;
  box-shadow: 0 12px 28px rgba(23,20,72,0.30);
}
.sl-empC::before {
  content: '';
  position: absolute; top: -30px; right: -30px;
  width: 140px; height: 140px; border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255,255,255,0.14), transparent 70%);
  pointer-events: none;
}
.sl-empC-ico {
  width: 52px; height: 52px; border-radius: 14px;
  background: linear-gradient(135deg, #818CF8, #4F46E5);
  color: #FFFFFF; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px rgba(79,70,229,0.45);
}
.sl-empC-body { flex: 1; min-width: 0; position: relative; z-index: 1; }
.sl-empC-title {
  font-size: 17px; font-weight: 800; color: #FFFFFF;
  letter-spacing: -0.01em; margin-bottom: 4px; line-height: 1.2;
}
.sl-empC-sub {
  font-size: 12.5px; color: rgba(255,255,255,0.80);
  line-height: 1.55; font-weight: 500;
}
.sl-empC-chip {
  display: inline-flex; align-items: center; gap: 6px;
  margin-top: 8px;
  padding: 4px 10px 4px 6px; border-radius: 999px;
  background: rgba(255,255,255,0.14); border: 1px solid rgba(255,255,255,0.20);
  color: #FFFFFF; font-size: 11px; font-weight: 700;
  letter-spacing: 0.02em;
}
.sl-empC-chip .dot {
  width: 6px; height: 6px; border-radius: 999px; background: #34D399;
  box-shadow: 0 0 0 3px rgba(52,211,153,0.32);
}

/* ─── Right: floating preview card ─── */
.sl-preview-wrap {
  position: relative;
  padding: 22px 4px 24px;
}
.sl-preview {
  position: relative;
  background: #FFFFFF;
  border-radius: 22px;
  padding: 22px;
  box-shadow:
    0 30px 60px -12px rgba(0,0,0,0.45),
    0 18px 30px -12px rgba(79,70,229,0.35);
}
.sl-preview-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.sl-preview-top .title { font-size: 15px; font-weight: 700; color: #0F172A; letter-spacing: -0.01em; }
.sl-preview-top .tag {
  font-size: 12px; font-weight: 700;
  padding: 3px 10px; border-radius: 999px;
  background: rgba(16,185,129,0.12); color: #059669;
  display: inline-flex; align-items: center; gap: 6px;
}
.sl-preview-top .tag .dot {
  width: 7px; height: 7px; border-radius: 999px; background: #10B981;
  animation: dot-pulse 1.6s ease-in-out infinite;
}
.sl-preview-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.sl-preview-m {
  padding: 10px 10px 12px; border-radius: 12px;
  background: #F5F5FA;
  border: 1px solid #ECECF3;
}
.sl-preview-m .ico { color: #64748B; display: inline-flex; margin-bottom: 4px; }
.sl-preview-m .l { font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px; }
.sl-preview-m .n {
  font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.02em; line-height: 1;
}
.sl-preview-m .up {
  display: inline-flex; align-items: center; gap: 3px;
  margin-top: 6px; font-size: 11px; font-weight: 700; color: #10B981;
}
.sl-preview-chart {
  border-radius: 14px;
  background: linear-gradient(180deg, #EEF0FF, #FFFFFF);
  padding: 14px 14px 8px;
  border: 1px solid #ECECF3;
}
.sl-preview-chart .l { font-size: 12px; font-weight: 700; color: #64748B; margin-bottom: 6px; }
.sl-preview-chart svg { display: block; width: 100%; height: 100px; }

/* Floating chips */
.sl-fchip {
  position: absolute;
  z-index: 4;
  padding: 10px 14px 10px 10px;
  border-radius: 14px;
  background: #FFFFFF;
  box-shadow: 0 14px 30px rgba(0,0,0,0.28);
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; font-weight: 700; color: #0F172A;
  animation: float 5s ease-in-out infinite;
  white-space: nowrap;
}
.sl-fchip .icoBox {
  width: 32px; height: 32px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
}
.sl-fchip .txt { display: flex; flex-direction: column; line-height: 1.2; }
.sl-fchip .txt .l { font-size: 11px; font-weight: 700; color: #64748B; letter-spacing: 0.02em; }
.sl-fchip .txt .v { font-size: 13px; font-weight: 800; color: #0F172A; }

.sl-fchip-a { top: -14px; left: -30px; animation-delay: 0s; }
.sl-fchip-b { bottom: -12px; right: -20px; animation-delay: 1.2s; }


/* ═══════════════════ RIGHT: WHITE FORM PANEL ═══════════════════ */
.sl-form-col {
  position: relative;
  padding: 30px 48px;
  display: flex; align-items: center; justify-content: center;
  background: #FFFFFF;
  border-top-left-radius: 24px;
  border-bottom-left-radius: 24px;
  box-shadow: -20px 0 40px rgba(0,0,0,0.10);
  z-index: 3;
}
.sl-form-card {
  position: relative;
  width: 100%; max-width: 400px;
  display: flex; flex-direction: column;
}

.sl-shield-wrap {
  position: relative;
  margin: 0 auto 18px;
  width: 100px; height: 100px;
  display: flex; align-items: center; justify-content: center;
}
.sl-spark {
  position: absolute;
  width: 4px; height: 4px; border-radius: 999px;
  background: #A855F7;
  animation: spark 2.4s ease-in-out infinite;
}
.sl-spark.s1 { top: -6px; right: -10px; animation-delay: 0s; }
.sl-spark.s2 { top: 10px; right: -18px; width: 5px; height: 5px; background: #6366F1; animation-delay: 0.4s; }
.sl-spark.s3 { top: -12px; left: -6px; width: 3px; height: 3px; background: #EC4899; animation-delay: 0.8s; }
.sl-spark.s4 { bottom: 4px; left: -14px; background: #A855F7; animation-delay: 1.2s; }
@keyframes spark {
  0%, 100% { opacity: 0.35; transform: scale(0.9); }
  50%      { opacity: 1;    transform: scale(1.35); }
}

.sl-form-title {
  text-align: center;
  font-size: 32px; font-weight: 800; letter-spacing: -0.02em;
  color: #0F172A; margin: 0; line-height: 1.1;
}
.sl-form-title .hl { color: #6366F1; }
.sl-form-sub {
  text-align: center;
  margin: 8px 0 22px; font-size: 14px; color: #64748B;
}

.sl-role-row {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0; padding: 5px;
  background: #F5F5FA;
  border-radius: 14px; margin-bottom: 22px;
}
.sl-role-btn {
  border: none; background: transparent; cursor: pointer;
  padding: 12px 12px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: ${FONT}; font-size: 14px; font-weight: 700;
  color: #64748B;
  transition: all 160ms ${T.motion.ease.spring};
}
.sl-role-btn.active {
  background: #FFFFFF; color: #6366F1;
  box-shadow: 0 1px 2px rgba(15,23,42,0.06), 0 4px 10px rgba(15,23,42,0.10);
}

.sl-field-label {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; font-weight: 700; letter-spacing: 0;
  color: #0F172A; margin-bottom: 8px;
}
.sl-field-label .req { color: #94A3B8; font-weight: 600; font-size: 12px; }
.sl-field-wrap { position: relative; }
.sl-field-ico { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748B; pointer-events: none; }
.sl-field {
  width: 100%; padding: 14px 14px 14px 44px;
  border-radius: 12px;
  border: 1px solid #E2E8F0;
  background: #FFFFFF;
  font-size: 14px; font-family: ${FONT}; font-weight: 500;
  color: #0F172A; outline: none;
  transition: all 150ms ease;
}
.sl-field:hover { border-color: #CBD5E1; }
.sl-field:focus {
  border-color: #6366F1;
  box-shadow: 0 0 0 4px rgba(99,102,241,0.16);
}
.sl-field::placeholder { color: #94A3B8; font-weight: 400; }

.sl-submit {
  width: 100%; margin-top: 20px;
  padding: 15px 16px; border: none; border-radius: 12px;
  background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
  color: #FFFFFF; font-family: ${FONT};
  font-size: 15px; font-weight: 700; letter-spacing: 0.01em;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(79,70,229,0.40);
  transition: transform 150ms, box-shadow 180ms;
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
}
.sl-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(79,70,229,0.48); }
.sl-submit:active:not(:disabled) { transform: translateY(0); }
.sl-submit:disabled { opacity: 0.7; cursor: wait; }

.sl-error {
  margin: 0 0 14px;
  padding: 11px 12px; border-radius: 10px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.22);
  color: #B91C1C;
  font-size: 13px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}

.sl-divider {
  display: flex; align-items: center; gap: 14px;
  margin: 20px 0 14px;
  color: #94A3B8;
  font-size: 13px; font-weight: 500;
}
.sl-divider::before, .sl-divider::after {
  content: '';
  flex: 1; height: 1px; background: #E2E8F0;
}

.sl-trust-row {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  padding: 16px; border-radius: 14px;
  background: #F5F5FA;
  border: 1px solid #ECECF3;
}
.sl-trust-cell { text-align: center; }
.sl-trust-cell .ic {
  width: 40px; height: 40px; border-radius: 12px;
  margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;
}
.sl-trust-cell .t { font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 2px; }
.sl-trust-cell .d { font-size: 11px; color: #64748B; line-height: 1.35; }

.sl-help { margin-top: 20px; text-align: center; font-size: 13px; color: #64748B; }
.sl-help a {
  color: #6366F1; font-weight: 700; text-decoration: none;
  display: inline-flex; align-items: center; gap: 6px;
}
.sl-help a:hover { text-decoration: underline; }

.sl-legal {
  margin-top: 22px;
  text-align: center; font-size: 12px; color: #94A3B8;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.sl-legal .dot { color: #CBD5E1; }

/* ─── Responsive ─────────────────────────────────────────── */
@media (max-height: 780px) {
  .sl-hero { padding: 22px 36px 16px; gap: 14px; }
  .sl-form-col { padding: 22px 40px; }
  .sl-hero-title { font-size: clamp(28px, 3.2vw, 44px) !important; margin-bottom: 14px; }
  .sl-hero-sub { margin-bottom: 18px; font-size: 14px; }
  .sl-empC { padding: 14px 16px; gap: 12px; }
  .sl-empC-ico { width: 44px; height: 44px; border-radius: 12px; }
  .sl-empC-title { font-size: 15px; }
  .sl-empC-sub { font-size: 12px; }
  .sl-empC-chip { margin-top: 6px; font-size: 10px; padding: 3px 8px 3px 5px; }
  .sl-shield-wrap { width: 80px; height: 80px; }
  .sl-shield-wrap img { width: 72px !important; height: 72px !important; }
  .sl-form-title { font-size: 26px; }
  .sl-preview { padding: 16px; }
  .sl-preview-m .n { font-size: 17px; }
  .sl-preview-chart svg { height: 78px; }
}
@media (max-width: 1180px) {
  .sl-login { position: relative; overflow-y: auto; }
  .sl-login-grid { grid-template-columns: 1fr; }
  .sl-hero { padding: 28px 24px 22px; }
  .sl-hero-mid { grid-template-columns: 1fr; gap: 24px; }
  .sl-preview-wrap { padding: 0; }
  .sl-form-col {
    padding: 32px 20px 40px;
    border-radius: 0;
    box-shadow: none;
  }
}
@media (max-width: 640px) {
  .sl-empC { flex-direction: column; text-align: center; align-items: center; }
}
`;

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>(UserRole.TEACHER);
  const [schoolCode, setSchoolCode] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (role === UserRole.TEACHER) {
        if (!username.trim()) { setError('Please enter your username to continue.'); setLoading(false); return; }
        login(role, { username });
      } else if (role === UserRole.SCHOOL_ADMIN) {
        if (!schoolCode.trim()) { setError('Please enter your school code to continue.'); setLoading(false); return; }
        login(role, { schoolCode });
      } else {
        login(role);
      }
      navigate(role === UserRole.SCHOOL_ADMIN ? '/school' : role === UserRole.ORCALEX_ADMIN ? '/orcalex' : '/teacher');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{pageStyles}</style>
      <div className="sl-login">
        <div className="sl-login-grid">

          {/* ═══════════════════ LEFT: DARK HERO ═══════════════════ */}
          <section className="sl-hero">

            {/* Brand row */}
            <div className="sl-brand-row">
              <img
                src="/smartlearners-logo.png"
                alt="SmartLearners.ai logo"
                style={{
                  width: 60, height: 60,
                  borderRadius: 14,
                  background: '#FFFFFF',
                  padding: 6,
                  boxShadow: '0 8px 24px rgba(79,70,229,0.35)',
                  objectFit: 'contain',
                }}
              />
              <div>
                <div className="sl-brand-word">Smart<span className="hl">Learners</span>.ai</div>
                <div className="sl-brand-tag">Management Console</div>
              </div>
            </div>

            {/* Middle 2-column: copy + preview card */}
            <div className="sl-hero-mid">

              <div className="sl-copy">
                <h1 className="sl-hero-title">
                  <span className="line">Better Insights.</span>
                  <span className="line">Stronger Learning.</span>
                  <span className="hl">Brighter Outcomes.</span>
                </h1>

                <p className="sl-hero-sub">
                  An intelligent platform for teachers and school administration to monitor progress, streamline assessments, and make data-driven decisions.
                </p>

                <div className="sl-empC">
                  <div className="sl-empC-ico" aria-hidden>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                      <path d="M9.5 12.5l1.8 1.8 3.7-4.1" />
                    </svg>
                  </div>
                  <div className="sl-empC-body">
                    <div className="sl-empC-title">Empowering Schools</div>
                    <div className="sl-empC-sub">
                      Your data is safe and always protected. Live dashboards and reports at your fingertips — together we create better learning outcomes.
                    </div>
                    <div className="sl-empC-chip">
                      Secure &middot; Reliable &middot; Always available
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating preview card */}
              <div className="sl-preview-wrap">
                <div className="sl-fchip sl-fchip-a">
                  <span className="icoBox" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <rect x="4" y="3" width="16" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div className="txt">
                    <span className="l">Worksheet</span>
                    <span className="v">92% Solved</span>
                  </div>
                </div>

                <div className="sl-preview" aria-hidden>
                  <div className="sl-preview-top">
                    <span className="title">Overview</span>
                    <span className="tag"><span className="dot" /> Live</span>
                  </div>

                  <div className="sl-preview-metrics">
                    <div className="sl-preview-m">
                      <div className="ico">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" /></svg>
                      </div>
                      <div className="l">Active Students</div>
                      <div className="n">248</div>
                      <div className="up">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        8%
                      </div>
                    </div>
                    <div className="sl-preview-m">
                      <div className="ico">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                      <div className="l">Avg. Score</div>
                      <div className="n">78%</div>
                      <div className="up">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        6%
                      </div>
                    </div>
                    <div className="sl-preview-m">
                      <div className="ico">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 20V10M12 20V4M19 20v-7" strokeLinecap="round" /></svg>
                      </div>
                      <div className="l">Sessions</div>
                      <div className="n">1.2k</div>
                      <div className="up">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 15l6-6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        12%
                      </div>
                    </div>
                  </div>

                  <div className="sl-preview-chart">
                    <div className="l">Performance Trend (7 Days)</div>
                    <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="lgLogin" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%"   stopColor="#6366F1" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0 74 L45 62 L90 68 L135 78 L180 56 L225 42 L270 32 L300 22 L300 100 L0 100 Z" fill="url(#lgLogin)" />
                      <polyline
                        points="0,74 45,62 90,68 135,78 180,56 225,42 270,32 300,22"
                        fill="none" stroke="#6366F1" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
                      />
                      {[[0,74],[45,62],[90,68],[135,78],[180,56],[225,42],[270,32],[300,22]].map(([x, y], i) => (
                        <circle key={i} cx={x} cy={y} r="3.4" fill="#FFFFFF" stroke="#6366F1" strokeWidth="2" />
                      ))}
                    </svg>
                  </div>
                </div>

                <div className="sl-fchip sl-fchip-b">
                  <span className="icoBox" style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                  <div className="txt">
                    <span className="l">Engagement</span>
                    <span className="v">+18% this week</span>
                  </div>
                </div>
              </div>
            </div>

          </section>

          {/* ═══════════════════ RIGHT: WHITE FORM ═══════════════════ */}
          <section className="sl-form-col">
            <div className="sl-form-card">

              <div className="sl-shield-wrap">
                <img
                  src="/smartlearners-logo.png"
                  alt="SmartLearners.ai logo"
                  style={{
                    width: 90, height: 90,
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 12px 28px rgba(79,70,229,0.30))',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
                <span className="sl-spark s1" />
                <span className="sl-spark s2" />
                <span className="sl-spark s3" />
                <span className="sl-spark s4" />
              </div>

              <h2 className="sl-form-title">Welcome</h2>
              <p className="sl-form-sub">Sign in to access your management dashboard</p>

              <div className="sl-role-row" role="tablist" aria-label="Select role">
                <button
                  type="button" role="tab" aria-selected={role === UserRole.TEACHER}
                  className={`sl-role-btn ${role === UserRole.TEACHER ? 'active' : ''}`}
                  onClick={() => setRole(UserRole.TEACHER)}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  Teacher
                </button>
                <button
                  type="button" role="tab" aria-selected={role === UserRole.SCHOOL_ADMIN}
                  className={`sl-role-btn ${role === UserRole.SCHOOL_ADMIN ? 'active' : ''}`}
                  onClick={() => setRole(UserRole.SCHOOL_ADMIN)}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" strokeLinecap="round" />
                  </svg>
                  School Admin
                </button>
              </div>

              {error && (
                <div className="sl-error" role="alert">
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" /></svg>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {role === UserRole.TEACHER && (
                  <div>
                    <label className="sl-field-label" htmlFor="sl-username">
                      <span>Username</span>
                      <span className="req">Required</span>
                    </label>
                    <div className="sl-field-wrap">
                      <span className="sl-field-ico">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <input
                        id="sl-username"
                        className="sl-field"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. john_smith"
                        autoComplete="username"
                        required
                      />
                    </div>
                  </div>
                )}

                {role === UserRole.SCHOOL_ADMIN && (
                  <div>
                    <label className="sl-field-label" htmlFor="sl-school">
                      <span>School Code</span>
                      <span className="req">Required</span>
                    </label>
                    <div className="sl-field-wrap">
                      <span className="sl-field-ico">
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" strokeLinecap="round" />
                        </svg>
                      </span>
                      <input
                        id="sl-school"
                        className="sl-field"
                        type="text"
                        value={schoolCode}
                        onChange={(e) => setSchoolCode(e.target.value)}
                        placeholder="e.g. DPS_001"
                        autoComplete="off"
                        required
                      />
                    </div>
                  </div>
                )}

                <button type="submit" className="sl-submit" disabled={loading}>
                  {loading ? (
                    <>
                      <span style={{ display: 'inline-flex', gap: 4 }}>
                        {[0, 1, 2].map((i) => (
                          <span key={i} style={{ width: 5, height: 5, borderRadius: 999, background: '#fff', animation: `dot-pulse 1.2s ease-in-out ${i * 0.16}s infinite` }} />
                        ))}
                      </span>
                      Signing you in…
                    </>
                  ) : (
                    <>
                      Sign In to Dashboard
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </>
                  )}
                </button>
              </form>

              <div style={{ marginTop: 18 }} />
              <div className="sl-trust-row">
                <div className="sl-trust-cell">
                  <div className="ic" style={{ background: 'rgba(99,102,241,0.10)', color: '#6366F1' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="t">Encrypted</div>
                  <div className="d">Secure data<br />protection</div>
                </div>
                <div className="sl-trust-cell">
                  <div className="ic" style={{ background: 'rgba(16,185,129,0.10)', color: '#10B981' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="t">Verified</div>
                  <div className="d">Trusted access<br />every time</div>
                </div>
                <div className="sl-trust-cell">
                  <div className="ic" style={{ background: 'rgba(245,158,11,0.12)', color: '#F59E0B' }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
                    </svg>
                  </div>
                  <div className="t">Fast</div>
                  <div className="d">Optimized for<br />speed &amp; reliability</div>
                </div>
              </div>

              <div className="sl-legal" style={{ marginTop: 20 }}>
                <svg width="12" height="12" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                © {new Date().getFullYear()} SmartLearners.ai <span className="dot">|</span> Powered by OrcaLex Technologies
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
