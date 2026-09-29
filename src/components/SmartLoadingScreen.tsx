import React, { useEffect, useState } from 'react';
import T from '../theme/tokens';

const FONT = T.font.sans;
const FONT_DISPLAY = T.font.display;

/**
 * SmartLoadingScreen — polished, step-driven loading UI.
 * Matches the reference mockup: graduation cap in ring, progress bar with
 * live percentage, and a checklist that progressively completes.
 */
interface Props {
  /** Total duration in ms — the animation targets ~95% by the end. */
  durationMs?: number;
}

const STEPS: Array<{ key: string; label: string; at: number }> = [
  { key: 'verify',   label: 'User Verified',       at: 15 },
  { key: 'classes',  label: 'Classes Loaded',      at: 35 },
  { key: 'students', label: 'Students Synced',     at: 55 },
  { key: 'worksheets', label: 'Loading Worksheets', at: 78 },
  { key: 'analytics',  label: 'Preparing Analytics', at: 100 },
];

const LOADING_LABELS = [
  'Loading classroom data...',
  'Syncing student records...',
  'Fetching worksheet progress...',
  'Preparing your analytics...',
];

const SmartLoadingScreen: React.FC<Props> = ({ durationMs = 5500 }) => {
  const [progress, setProgress] = useState(0);
  const [labelIdx, setLabelIdx] = useState(0);

  useEffect(() => {
    const startedAt = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const pct = Math.min(97, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);
      if (pct < 97) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [durationMs]);

  useEffect(() => {
    const id = setInterval(() => setLabelIdx((i) => (i + 1) % LOADING_LABELS.length), 1400);
    return () => clearInterval(id);
  }, []);

  const currentLoadingLabel = LOADING_LABELS[labelIdx];

  return (
    <div style={{
      minHeight: 'calc(100vh - 64px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: FONT, padding: 32,
      background: `
        radial-gradient(900px 500px at 50% -10%, ${T.color.brand[100]}, transparent 55%),
        radial-gradient(700px 500px at 100% 100%, rgba(236,72,153,0.08), transparent 55%),
        #F8F5F0
      `,
    }}>
      <style>{`
        @keyframes sl-halo {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50%      { transform: scale(1.06); opacity: 1; }
        }
        @keyframes sl-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes sl-bar-shine {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(120%); }
        }
        @keyframes sl-step-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 460,
        background: '#FFFFFF',
        border: `1px solid ${T.border.subtle}`,
        borderRadius: 22,
        boxShadow: '0 24px 60px rgba(15,23,42,0.10), 0 8px 20px rgba(79,70,229,0.10)',
        padding: '36px 36px 30px',
        animation: `rise-in 0.5s ${T.motion.ease.spring} both`,
      }}>

        {/* ─── Icon in ring ─── */}
        <div style={{
          position: 'relative',
          width: 88, height: 88,
          margin: '0 auto 22px',
        }}>
          {/* Outer soft ring */}
          <div style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(139,92,246,0.16), rgba(139,92,246,0) 70%)',
            animation: 'sl-halo 2.4s ease-in-out infinite',
          }} />
          {/* Ring outline */}
          <div style={{
            position: 'absolute', inset: 6,
            borderRadius: '50%',
            border: '1.5px dashed rgba(139,92,246,0.35)',
            animation: 'sl-spin 12s linear infinite',
          }} />
          {/* Sparkle dot */}
          <div style={{
            position: 'absolute', top: 4, right: 12,
            width: 8, height: 8, borderRadius: 999,
            background: T.color.brand[600],
            boxShadow: `0 0 0 4px ${T.color.brand.tint}`,
            animation: 'sl-halo 1.8s ease-in-out infinite',
          }} />
          {/* Center logo */}
          <div style={{
            position: 'absolute', inset: 12,
            borderRadius: '50%',
            background: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 10px 24px rgba(79,70,229,0.28)`,
            overflow: 'hidden',
            padding: 4,
          }}>
            <img
              src="/smartlearners-logo.png"
              alt="SmartLearners.ai"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* ─── Title + subtitle ─── */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: T.text.primary,
            fontFamily: FONT_DISPLAY, letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}>
            Preparing Your Smart Workspace
          </div>
          <div style={{
            marginTop: 10, fontSize: 13, color: T.text.tertiary,
            fontWeight: 500, lineHeight: 1.55,
            maxWidth: 320, margin: '10px auto 0',
          }}>
            We’re securely loading your classes, assignments, and analytics.
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: T.border.subtle, margin: '0 -8px 20px' }} />

        {/* ─── Loading label + progress bar ─── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            textAlign: 'center',
            fontSize: 13, fontWeight: 700, color: T.color.brand[700],
            marginBottom: 10, minHeight: 18,
            transition: 'opacity 200ms',
          }} key={currentLoadingLabel}>
            {currentLoadingLabel}
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              flex: 1, height: 8, borderRadius: 999,
              background: '#EDECF4',
              overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                width: `${progress}%`, height: '100%',
                background: `linear-gradient(90deg, ${T.color.brand[500]}, ${T.color.brand[700]})`,
                borderRadius: 999,
                transition: 'width 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.42), transparent)',
                  animation: 'sl-bar-shine 1.4s linear infinite',
                }} />
              </div>
            </div>
            <div style={{
              minWidth: 40, textAlign: 'right',
              fontSize: 13, fontWeight: 700, color: T.color.brand[700],
              fontFeatureSettings: '"tnum"',
            }}>{progress}%</div>
          </div>
        </div>

        {/* ─── Steps checklist ─── */}
        <div style={{
          background: '#F5F5FA',
          borderRadius: 14,
          padding: '14px 14px',
          border: `1px solid ${T.border.subtle}`,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {STEPS.map((step, i) => {
            const state: 'done' | 'active' | 'pending' =
              progress >= step.at ? 'done'
              : progress >= (STEPS[i - 1]?.at ?? 0) ? 'active'
              : 'pending';

            const color = state === 'done'
              ? T.color.success.solid
              : state === 'active'
                ? T.color.brand[600]
                : T.color.neutral[400];
            const label = state === 'done' ? 'Completed'
              : state === 'active' ? 'In Progress'
              : 'Pending';

            return (
              <div key={step.key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                animation: `sl-step-in 260ms ${T.motion.ease.spring} ${i * 40}ms both`,
              }}>
                {/* Status icon */}
                <div style={{
                  width: 22, height: 22, borderRadius: 999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  background: state === 'done' ? T.color.success.bg
                    : state === 'active' ? T.color.brand.tint
                    : 'transparent',
                  color,
                }}>
                  {state === 'done' ? (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.2" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : state === 'active' ? (
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      border: `2px solid ${color}`,
                      borderTopColor: 'transparent',
                      animation: 'sl-spin 0.9s linear infinite',
                    }} />
                  ) : (
                    <div style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: color,
                    }} />
                  )}
                </div>

                {/* Label */}
                <div style={{
                  flex: 1,
                  fontSize: 13, fontWeight: state === 'pending' ? 500 : 600,
                  color: state === 'pending' ? T.text.tertiary : T.text.primary,
                }}>
                  {step.label}
                </div>

                {/* Status text */}
                <div style={{
                  fontSize: 12, fontWeight: 700, color,
                  letterSpacing: '0.01em',
                }}>
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SmartLoadingScreen;
