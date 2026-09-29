import React, { useMemo } from 'react';
import T from '../theme/tokens';

const FONT = T.font.sans;
const FONT_SERIF = T.font.sans;

interface MetricsCardsProps {
  totalStudents: number;
  activeStudents: number;
  activeSessions?: number;
  atRiskStudents: number;
  inactiveStudents: number;
  totalSessions?: number;
  trend?: 'up' | 'down' | 'stable';
  students?: { last_login?: string; is_currently_active: boolean }[];
}

/** Slim ring gauge with soft track and clean edge. */
const RingGauge: React.FC<{ percentage: number; color: string; value: number | string }> = ({
  percentage, color, value,
}) => {
  const size = 72;
  const sw = 6;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, percentage));
  const arc = pct > 0 ? Math.max(pct, 3) : 0;
  const offset = circ - (arc / 100) * circ;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.color.neutral[100]} strokeWidth={sw} />
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.text.primary, lineHeight: 1, fontFamily: FONT_SERIF, letterSpacing: '-0.02em' }}>{value}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color, marginTop: 2, letterSpacing: '0.02em' }}>{pct}%</span>
      </div>
    </div>
  );
};

const MetricsCards: React.FC<MetricsCardsProps> = ({
  totalStudents, activeStudents, activeSessions, atRiskStudents, inactiveStudents, totalSessions, students,
}) => {
  const engRate = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;
  const atRiskPct = totalStudents > 0 ? Math.round((atRiskStudents / totalStudents) * 100) : 0;
  const inactivePct = totalStudents > 0 ? Math.round((inactiveStudents / totalStudents) * 100) : 0;

  // Reserved computations (not shown, retained if re-enabled)
  const now = Date.now();
  useMemo(() => {
    if (!students) return { dau: 0, wau: 0, mau: 0 };
    let d = 0, w = 0, m = 0;
    const H24 = 864e5, D7 = 7 * H24, D30 = 30 * H24;
    students.forEach(s => {
      if (!s.last_login) return;
      const diff = now - new Date(s.last_login).getTime();
      if (diff <= H24) d++;
      if (diff <= D7) w++;
      if (diff <= D30) m++;
    });
    return { dau: d, wau: w, mau: m };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  const cards = [
    {
      label: 'Active', value: activeStudents, pct: engRate,
      color: T.color.success.solid, tint: T.color.success.bg,
      sub: `${engRate}% engaged`,
    },
    {
      label: 'At-Risk', value: atRiskStudents, pct: atRiskPct,
      color: T.color.warning.solid, tint: T.color.warning.bg,
      sub: atRiskStudents > 0 ? 'Needs intervention' : 'All clear',
    },
    {
      label: 'Inactive', value: inactiveStudents, pct: inactivePct,
      color: T.color.danger.solid, tint: T.color.danger.bg,
      sub: inactiveStudents > 0 ? 'Requires attention' : 'None',
    },
  ];

  const sessVal = totalSessions ?? activeSessions ?? 0;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 14,
      fontFamily: FONT,
    }}>
      {/* Total students — hero metric */}
      <div style={{
        background: '#FFFFFF', borderRadius: 14,
        border: `1px solid ${T.border.subtle}`, padding: '16px 18px',
        boxShadow: T.shadow.xs,
        animation: `entrance-stagger 300ms ${T.motion.ease.spring} both`,
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'box-shadow 150ms, transform 150ms',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = T.shadow.md; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadow.xs; }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: T.color.brand.tint, color: T.color.brand[700], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Students</div>
          <div style={{ marginTop: 2, fontSize: 26, fontWeight: 700, color: T.text.primary, fontFamily: FONT_SERIF, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{totalStudents}</div>
          <div style={{ marginTop: 2, fontSize: 11, color: T.text.tertiary, fontWeight: 600 }}>Enrolled on the platform</div>
        </div>
      </div>

      {/* Sessions */}
      <div style={{
        background: '#FFFFFF', borderRadius: 14,
        border: `1px solid ${T.border.subtle}`, padding: '16px 18px',
        boxShadow: T.shadow.xs,
        animation: `entrance-stagger 300ms ${T.motion.ease.spring} 40ms both`,
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'box-shadow 150ms, transform 150ms',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = T.shadow.md; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadow.xs; }}
      >
        <div style={{ width: 40, height: 40, borderRadius: 12, background: T.color.info.bg, color: T.color.info.solid, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h4l3-9 6 18 3-9h4" />
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Weekly Sessions</div>
          <div style={{ marginTop: 2, fontSize: 26, fontWeight: 700, color: T.text.primary, fontFamily: FONT_SERIF, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{sessVal}</div>
          <div style={{ marginTop: 2, fontSize: 11, color: T.text.tertiary, fontWeight: 600 }}>Learning sessions this week</div>
        </div>
      </div>

      {/* Status gauges */}
      {cards.map((c, i) => (
        <div key={c.label} style={{
          background: '#FFFFFF', borderRadius: 14,
          border: `1px solid ${T.border.subtle}`, padding: '16px 18px',
          boxShadow: T.shadow.xs,
          animation: `entrance-stagger 300ms ${T.motion.ease.spring} ${80 + i * 40}ms both`,
          display: 'flex', alignItems: 'center', gap: 14,
          transition: 'box-shadow 150ms, transform 150ms',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = T.shadow.md; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadow.xs; }}
        >
          <RingGauge percentage={c.pct} color={c.color} value={c.value} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.label}</div>
            <div style={{ marginTop: 2, fontSize: 14, fontWeight: 700, color: T.text.primary }}>{c.value} {c.value === 1 ? 'student' : 'students'}</div>
            <div style={{ marginTop: 2, fontSize: 11, color: T.text.tertiary, fontWeight: 600 }}>{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsCards;
