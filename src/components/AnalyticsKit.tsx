import React from 'react';
import T from '../theme/tokens';
import WorkspaceHeader from './WorkspaceHeader';
import { BANDS, BandKey, deltaTone, fmtDelta } from '../utils/examAnalytics';

/** Small shared building blocks for the outcome-analytics views. */

export const FONT = T.font.sans;
export const FONT_DISPLAY = T.font.sans;

/* ─── Premium surface palette (dark hero + sidebar) ───────────── */
export const INK = {
  deep: '#0B1026',
  mid: '#161C45',
  hero: 'linear-gradient(115deg, #17243F 0%, #263963 65%, #34467A 100%)',
  glass: 'rgba(255,255,255,0.07)',
  glassBorder: 'rgba(255,255,255,0.12)',
  textHi: '#FFFFFF',
  textMid: 'rgba(226,232,255,0.78)',
  textLo: 'rgba(199,205,255,0.60)',
  accent: '#A5B4FC',
  teal: '#FDE68A',
};

export const NUM: React.CSSProperties = { fontFamily: FONT, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em' };

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; padding?: number | string; className?: string }> = ({ children, style, padding = '22px 24px', className }) => (
  <div className={className} style={{
    background: '#FFFFFF',
    borderRadius: 14,
    border: '1px solid #E7E9F3',
    boxShadow: '0 2px 6px rgba(16,24,64,0.035)',
    padding,
    minWidth: 0,
    ...style,
  }}>
    {children}
  </div>
);

export const CardTitle: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; icon?: React.ReactNode }> = ({ title, subtitle, right, icon }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
      {icon && (
        <span style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #EEF0FF, #E0E7FF)', color: T.color.brand[700],
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>{icon}</span>
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.02em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: T.text.tertiary, marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>}
      </div>
    </div>
    {right}
  </div>
);

/** Section heading between groups of cards. */
export const SectionHeading: React.FC<{ eyebrow?: string; title: string; right?: React.ReactNode }> = ({ eyebrow, title, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '10px 2px -2px' }}>
    <div>
      {eyebrow && <div style={{ fontSize: 11, fontWeight: 800, color: T.color.brand[600], textTransform: 'uppercase', letterSpacing: '0.12em' }}>{eyebrow}</div>}
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.025em', marginTop: 2 }}>{title}</div>
    </div>
    {right}
  </div>
);

/** Ring gauge — thin, rounded, value in the middle. */
export const RingGauge: React.FC<{
  pct: number | null; size?: number; stroke?: number; color?: string; track?: string;
  label?: React.ReactNode; textColor?: string; sub?: string; subColor?: string;
}> = ({ pct, size = 76, stroke = 7, color = T.color.brand[500], track = T.color.neutral[100], label, textColor = T.text.primary, sub, subColor = T.text.tertiary }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct ?? 0));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        {pct != null && p > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - (Math.max(p, 2) / 100) * circ}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)' }} />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
        <span style={{ ...NUM, fontSize: size * 0.24, fontWeight: 800, color: textColor }}>{label ?? (pct == null ? '—' : `${Math.round(p)}%`)}</span>
        {sub && <span style={{ fontSize: Math.max(9, size * 0.11), fontWeight: 700, color: subColor, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{sub}</span>}
      </div>
    </div>
  );
};

const AVATAR_TONES = [
  ['#6366F1', '#8B5CF6'], ['#0EA5E9', '#6366F1'], ['#14B8A6', '#0EA5E9'], ['#F59E0B', '#EF4444'],
  ['#EC4899', '#8B5CF6'], ['#10B981', '#14B8A6'], ['#8B5CF6', '#EC4899'],
];
export const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 34 }) => {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const h = Array.from(name).reduce((s, c) => s + c.charCodeAt(0), 0);
  const [a, b] = AVATAR_TONES[h % AVATAR_TONES.length];
  return (
    <span style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      background: `linear-gradient(135deg, ${a}, ${b})`, color: '#FFFFFF',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, letterSpacing: '0.02em',
      boxShadow: `0 4px 10px -4px ${a}AA`,
    }}>{initials}</span>
  );
};

export interface HeroStat {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  ring?: number | null;     // show a ring gauge with this %
  ringColor?: string;
}


/**
 * Dark header used at the top of every analytics page:
 * eyebrow, title, description and optional glass stat tiles.
 */
export const InsightHero: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  insight?: React.ReactNode;
  chips?: React.ReactNode[];
  stats?: HeroStat[];
  onBack?: () => void;
  backLabel?: string;
  leading?: React.ReactNode;
  art?: boolean;
}> = ({ eyebrow, title, insight, chips, stats, onBack, backLabel = 'Back', leading }) => (
  <WorkspaceHeader eyebrow={eyebrow} title={title} description={insight} onBack={onBack} backLabel={backLabel} actions={<>{leading}{stats?.length === 1 && <div className="sl-header-count"><span>{stats[0].label}</span><strong>{stats[0].value}</strong></div>}</>}>
    {chips && chips.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{chips.map((chip, i) => <span key={i} className="sl-header-chip">{chip}</span>)}</div>}
    {stats && stats.length > 1 && <div className="sl-header-stat-grid">{stats.map((stat) => (
      <div className="sl-header-stat" key={stat.label}>
        <span>{stat.label}</span><strong>{stat.value}</strong>{stat.sub && <small>{stat.sub}</small>}
      </div>
    ))}</div>}
  </WorkspaceHeader>
);

export const DeltaBadge: React.FC<{ value: number | null | undefined; higherIsBetter?: boolean; suffix?: string; unit?: string; digits?: number }> = ({
  value, higherIsBetter = true, suffix, unit = ' pts', digits = 1,
}) => {
  if (value == null || !Number.isFinite(value)) return null;
  const tone = deltaTone(value, higherIsBetter);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      background: tone.bg, color: tone.color,
      fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
    }}>
      <span aria-hidden style={{ fontSize: 9 }}>{tone.arrow}</span>
      {fmtDelta(value, digits, unit)}
      {suffix && <span style={{ fontWeight: 600, opacity: 0.85 }}>{suffix}</span>}
    </span>
  );
};

/** Vivid gradient per accent colour (decoration only). */
const VIVID: Record<string, [string, string, string]> = {
  [T.color.brand[600]]: ['#4F46E5', '#7C3AED', 'rgba(79,70,229,0.55)'],
  [T.color.brand[500]]: ['#0EA5E9', '#6366F1', 'rgba(14,165,233,0.5)'],
  [T.color.success.solid]: ['#059669', '#14B8A6', 'rgba(5,150,105,0.5)'],
  [T.color.danger.solid]: ['#E11D48', '#F97316', 'rgba(225,29,72,0.5)'],
  [T.color.warning.solid]: ['#D97706', '#F59E0B', 'rgba(217,119,6,0.5)'],
  [T.color.info.solid]: ['#2563EB', '#06B6D4', 'rgba(37,99,235,0.5)'],
};

export const KpiTile: React.FC<{
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  higherIsBetter?: boolean;
  deltaUnit?: string;
  deltaDigits?: number;
  caption?: React.ReactNode;
  accent?: string;
  icon?: React.ReactNode;
}> = ({ label, value, delta, higherIsBetter = true, deltaUnit = ' pts', deltaDigits = 1, caption, accent = T.color.brand[600], icon }) => {
  const [g1, g2, glow] = VIVID[accent] ?? [accent, accent, 'rgba(79,70,229,0.45)'];
  const hasDelta = delta != null && Number.isFinite(delta);
  const good = hasDelta && (higherIsBetter ? delta! > 0 : delta! < 0);
  return (
    <div className="sl-lift" style={{
      position: 'relative', overflow: 'hidden', borderRadius: 22, padding: '20px 22px 22px', minWidth: 0,
      background: `linear-gradient(135deg, ${g1} 0%, ${g2} 100%)`, color: '#FFFFFF',
      boxShadow: `0 22px 40px -22px ${glow}, 0 2px 6px rgba(16,24,64,0.10), inset 0 1px 0 rgba(255,255,255,0.25)`,
    }}>
      {/* decoration */}
      <span aria-hidden style={{ position: 'absolute', right: -40, top: -40, width: 150, height: 150, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }} />
      <span aria-hidden style={{ position: 'absolute', right: 30, top: 50, width: 70, height: 70, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
      <svg aria-hidden viewBox="0 0 300 60" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 46, opacity: 0.22 }}>
        <path d="M0 40 C 40 20, 70 50, 110 32 S 180 10, 220 28 S 270 44, 300 22 L 300 60 L 0 60 Z" fill="#FFFFFF" />
      </svg>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.3 }}>{label}</div>
        <span style={{
          width: 38, height: 38, borderRadius: 12, flexShrink: 0,
          background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.30)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF',
        }}>
          {icon ?? <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </span>
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <div style={{ ...NUM, fontSize: 42, fontWeight: 800, lineHeight: 1, textShadow: '0 2px 12px rgba(0,0,0,0.12)' }}>{value}</div>
        {hasDelta && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999,
            background: good ? 'rgba(255,255,255,0.95)' : 'rgba(15,23,42,0.28)', color: good ? g1 : '#FFFFFF',
            fontSize: 11.5, fontWeight: 800,
          }}>
            {delta! > 0 ? '▲' : delta! < 0 ? '▼' : '→'} {fmtDelta(delta!, deltaDigits, deltaUnit)}
          </span>
        )}
      </div>
      {caption && <div style={{ position: 'relative', marginTop: 10, fontSize: 12.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, fontWeight: 500 }}>{caption}</div>}
    </div>
  );
};

/** Small icon set for KPI tiles (decoration only). */
export const KPI_ICONS = {
  average: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  pass: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  support: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  growth: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.3" viewBox="0 0 24 24"><path d="M12 20V10M18 20V4M6 20v-4" strokeLinecap="round" /></svg>,
};

/** Gradient fills for band-coloured bars — drop inside a recharts chart's children. */
export const BandGradients: React.FC<{ vertical?: boolean }> = ({ vertical = true }) => (
  <defs>
    {BANDS.map((b) => (
      <linearGradient key={b.key} id={`bandgrad-${b.key}${vertical ? '' : '-h'}`} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
        <stop offset="0%" stopColor={b.color} stopOpacity={vertical ? 1 : 0.75} />
        <stop offset="100%" stopColor={b.color} stopOpacity={vertical ? 0.62 : 1} />
      </linearGradient>
    ))}
  </defs>
);
export const bandFill = (key: BandKey, vertical = true) => `url(#bandgrad-${key}${vertical ? '' : '-h'})`;

/** Horizontal 100% stacked bar of performance bands, with a 2px surface gap between segments. */
export const BandBar: React.FC<{ bands: Record<BandKey, number>; height?: number; showLabels?: boolean }> = ({ bands, height = 8, showLabels }) => {
  const total = BANDS.reduce((s, b) => s + bands[b.key], 0);
  if (!total) return <div style={{ height, borderRadius: 999, background: T.color.neutral[100] }} />;
  return (
    <div>
      <div style={{ display: 'flex', gap: 2, height, borderRadius: 999, overflow: 'hidden' }}>
        {BANDS.filter((b) => bands[b.key] > 0).map((b) => (
          <div key={b.key}
            title={`${b.label} (${b.range}): ${bands[b.key]} student${bands[b.key] === 1 ? '' : 's'}`}
            style={{ flex: bands[b.key], background: b.color, minWidth: 4 }} />
        ))}
      </div>
      {showLabels && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>
          {BANDS.map((b) => (
            <span key={b.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: T.text.secondary, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />
              {b.label} <span style={{ color: T.text.primary, fontWeight: 800 }}>{bands[b.key]}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const Legend: React.FC<{ items: { label: string; color: string; dashed?: boolean }[] }> = ({ items }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px' }}>
    {items.map((it) => (
      <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.text.secondary, fontWeight: 600 }}>
        <svg width="18" height="8" aria-hidden>
          <line x1="1" y1="4" x2="17" y2="4" stroke={it.color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={it.dashed ? '4 3' : undefined} />
        </svg>
        {it.label}
      </span>
    ))}
  </div>
);

/** Tooltip shell for recharts — text in ink colours, colour only on the swatch. */
export const ChartTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: any;
  title?: (label: any, payload: any[]) => React.ReactNode;
  format?: (value: any, entry: any) => React.ReactNode;
  footer?: (label: any, payload: any[]) => React.ReactNode;
}> = ({ active, payload, label, title, format, footer }) => {
  if (!active || !payload || payload.length === 0) return null;
  const rows = payload.filter((p) => p.value != null);
  return (
    <div style={{
      background: '#FFFFFF', border: `1px solid ${T.border.subtle}`, borderRadius: 12,
      boxShadow: T.shadow.lg, padding: '10px 12px', fontFamily: FONT, minWidth: 170, maxWidth: 300,
    }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: T.text.primary, marginBottom: 6 }}>{title ? title(label, payload) : label}</div>
      {rows.map((p) => (
        <div key={p.dataKey ?? p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12, padding: '2px 0' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.text.secondary, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color ?? p.payload?.fill }} />
            {p.name}
          </span>
          <span style={{ color: T.text.primary, fontWeight: 800 }}>{format ? format(p.value, p) : p.value}</span>
        </div>
      ))}
      {footer && <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${T.border.subtle}`, fontSize: 11, color: T.text.tertiary }}>{footer(label, payload)}</div>}
    </div>
  );
};

export const Select: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  minWidth?: number;
}> = ({ label, value, onChange, options, minWidth = 170 }) => (
  <label style={{ display: 'grid', gap: 5 }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: 'none', width: '100%', minWidth,
          padding: '9px 32px 9px 12px', borderRadius: 10,
          border: `1px solid ${T.border.subtle}`, background: '#FFFFFF',
          fontSize: 13, fontFamily: FONT, fontWeight: 600, color: T.text.primary,
          outline: 'none', boxShadow: T.shadow.xs, cursor: 'pointer',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = T.color.brand[600]; e.currentTarget.style.boxShadow = T.shadow.focus; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = T.border.subtle; e.currentTarget.style.boxShadow = T.shadow.xs; }}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg width="12" height="12" fill="none" stroke={T.text.tertiary} strokeWidth="2.2" viewBox="0 0 24 24" style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </label>
);

export const Chip: React.FC<{ children: React.ReactNode; color?: string; bg?: string; title?: string }> = ({ children, color = T.text.secondary, bg = T.color.neutral[100], title }) => (
  <span title={title} style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 9px', borderRadius: 999, background: bg, color,
    fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
  }}>{children}</span>
);

/** Chart series colours — fixed order, never cycled; status hues are reserved for bands. */
export const SERIES = ['#4F46E5', '#DB2777', '#0891B2', '#7C3AED', '#2563EB', '#E11D48'];
export const CLASS_AVG_COLOR = T.color.neutral[400];
