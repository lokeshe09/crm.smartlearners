import React, { useState, useEffect } from 'react';
import T from '../theme/tokens';

const FONT = T.font.sans;

interface SendAlertModalProps {
  studentId: number | null;
  studentName?: string;
  onClose: () => void;
  onSend: (studentId: number) => Promise<void>;
}

const SendAlertModal: React.FC<SendAlertModalProps> = ({
  studentId, studentName, onClose, onSend,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, loading]);

  const handleSend = async () => {
    if (!studentId) return;
    setLoading(true); setError('');
    try {
      await onSend(studentId);
      onClose();
    } catch (err) {
      setError('Failed to send alert. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!studentId) return null;

  return (
    <div
      role="dialog" aria-modal
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        background: T.surface.overlay,
        backdropFilter: 'saturate(180%) blur(8px)',
        WebkitBackdropFilter: 'saturate(180%) blur(8px)',
        fontFamily: FONT,
        opacity: mounted ? 1 : 0,
        transition: 'opacity 220ms ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div style={{
        background: '#FFFFFF',
        borderRadius: 20,
        width: '100%', maxWidth: 440,
        border: `1px solid ${T.border.subtle}`,
        boxShadow: T.shadow.xl,
        overflow: 'hidden',
        transform: mounted ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
        opacity: mounted ? 1 : 0,
        transition: `transform 300ms ${T.motion.ease.spring}, opacity 260ms ease-out`,
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, ${T.color.success.solid}, ${T.color.brand[600]})` }} />

        {/* Header */}
        <div style={{
          padding: '20px 22px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: T.color.success.bg, color: T.color.success.solid,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text.primary, letterSpacing: '-0.01em' }}>
                Send WhatsApp reminder
              </h2>
              {studentName && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: T.text.tertiary }}>
                  to <span style={{ fontWeight: 700, color: T.text.secondary }}>{studentName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose} disabled={loading} aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 6, borderRadius: 8,
              color: T.text.tertiary,
              transition: 'color 120ms, background 120ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = T.text.primary; e.currentTarget.style.background = T.color.neutral[100]; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = T.text.tertiary; e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '4px 22px 22px' }}>
          <div style={{
            padding: '12px 14px',
            borderRadius: 12,
            background: T.color.brand.tint,
            border: `1px solid ${T.color.brand[200]}`,
            marginBottom: 14,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <svg width="16" height="16" fill="none" stroke={T.color.brand[700]} strokeWidth="2" viewBox="0 0 24 24" style={{ marginTop: 2, flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
            </svg>
            <p style={{ margin: 0, fontSize: 13, color: T.color.brand[800], lineHeight: 1.55, fontWeight: 500 }}>
              A WhatsApp notification will be sent to the student’s registered phone number, encouraging them to log in and continue learning.
            </p>
          </div>

          {error && (
            <div style={{
              marginBottom: 14,
              padding: '10px 12px', borderRadius: 10,
              background: T.color.danger.bg,
              border: `1px solid ${T.color.danger.border}`,
              color: T.color.danger.text,
              fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" /></svg>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button" onClick={onClose} disabled={loading}
              style={{
                flex: 1, padding: '11px 12px', borderRadius: 12,
                border: `1px solid ${T.border.subtle}`,
                background: '#FFFFFF', color: T.text.secondary,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.color.neutral[50]; e.currentTarget.style.color = T.text.primary; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = T.text.secondary; }}
            >
              Cancel
            </button>
            <button
              type="button" onClick={handleSend} disabled={loading}
              style={{
                flex: 2, padding: '11px 12px', borderRadius: 12, border: 'none',
                background: `linear-gradient(180deg, ${T.color.success.solid}, #059669)`,
                color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer', fontFamily: FONT,
                boxShadow: '0 6px 14px rgba(16,185,129,0.28)',
                opacity: loading ? 0.7 : 1,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? 'Sending…' : 'Send reminder'}
              {!loading && (
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendAlertModal;
