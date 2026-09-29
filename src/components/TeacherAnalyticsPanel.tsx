import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList, BarChart, Bar,
} from 'recharts';
import T from '../theme/tokens';
import {
  ExamRecord, PASS_MARK, computeStats, fmtDate, groupAssessments, pooledAttempts,
} from '../utils/examAnalytics';
import { Card, FONT, InsightHero, NUM } from './AnalyticsKit';

interface TeacherAnalyticsPanelProps {
  records: ExamRecord[];
  examsLoading: boolean;
  attemptsProgress: { done: number; total: number } | null;
  onOpenExam?: (examId: number) => void;
}

const AXIS_TICK = { fontSize: 13, fill: T.text.secondary, fontFamily: FONT, fontWeight: 700 };
const LINE = '#7C3AED';

/** "Class 9 · A3" → { cls: "9", section: "A3" } */
const splitClassLabel = (label: string) => {
  const m = label.match(/^Class\s+(\S+)(?:\s*·\s*(\S+))?/i);
  return { cls: m?.[1] ?? label, section: m?.[2] ?? '' };
};

const TeacherAnalyticsPanel: React.FC<TeacherAnalyticsPanelProps> = ({ records, examsLoading, attemptsProgress }) => {
  const loaded = useMemo(() => records.filter((r) => r.attempts && !r.pending && r.classKey !== 'unknown'), [records]);

  /* Class → sections available */
  const classMap = useMemo(() => {
    const m = new Map<string, Map<string, string>>(); // cls -> (section -> classKey)
    loaded.forEach((r) => {
      const { cls, section } = splitClassLabel(r.classLabel);
      const secs = m.get(cls) ?? new Map<string, string>();
      secs.set(section || '—', r.classKey);
      m.set(cls, secs);
    });
    return m;
  }, [loaded]);

  const classes = useMemo(() => Array.from(classMap.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [classMap]);
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');

  const sections = useMemo(() => Array.from(classMap.get(cls)?.keys() ?? []).sort(), [classMap, cls]);

  useEffect(() => { if (classes.length && !classes.includes(cls)) setCls(classes[0]); }, [classes, cls]);
  useEffect(() => { if (sections.length && !sections.includes(section)) setSection(sections[0]); }, [sections, section]);

  const classKey = classMap.get(cls)?.get(section) ?? '';

  /* One point per assessment (PT-1, FA-1, …) in date order */
  const points = useMemo(() => {
    const recs = loaded.filter((r) => r.classKey === classKey);
    return groupAssessments(recs).map((p) => {
      const s = computeStats(pooledAttempts(p));
      return {
        label: p.label,
        date: p.date,
        avg: s.avg == null ? null : +s.avg.toFixed(1),
        n: s.n,
        passRate: s.passRate == null ? null : +s.passRate.toFixed(1),
        bands: s.bands,
        names: p.records.map((r) => r.name),
      };
    });
  }, [loaded, classKey]);

  const scoredResults = points.reduce((sum, point) => sum + point.n, 0);

  const stillLoading = examsLoading || (attemptsProgress != null && attemptsProgress.done < attemptsProgress.total && loaded.length === 0);

  return (
    <div style={{ display: 'grid', gap: 20, fontFamily: FONT }}>
      <InsightHero
        eyebrow="Outcome analytics"
        title="Class Performance"
        insight="Choose a class and section to see how the students' overall performance has moved across exams."
      />

      {/* Filters */}
      <Card padding="16px 20px">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <FilterSelect label="Class" value={cls} onChange={(v) => { setCls(v); setSection(''); }}
            options={classes.map((c) => ({ value: c, label: `Class ${c}` }))} disabled={stillLoading || classes.length === 0} />
          <FilterSelect label="Section" value={section} onChange={setSection}
            options={sections.map((s) => ({ value: s, label: s === '—' ? 'All' : `Section ${s}` }))} disabled={stillLoading || sections.length === 0} />
          {attemptsProgress && attemptsProgress.done < attemptsProgress.total && (
            <div style={{ marginLeft: 'auto', fontSize: 12.5, color: T.text.tertiary, fontWeight: 600, alignSelf: 'center' }}>
              Loading exam results {attemptsProgress.done}/{attemptsProgress.total}…
            </div>
          )}
        </div>
      </Card>

      {/* Line graph */}
      <Card padding="24px 26px 18px">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.02em' }}>
              Overall performance across exams
            </div>
            <div style={{ fontSize: 13, color: T.text.tertiary, marginTop: 4 }}>
              {cls ? <>Class {cls}{section && section !== '—' ? ` · Section ${section}` : ''} — </> : null}
              class average score in each exam, in the order they were taken.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: T.text.secondary, fontWeight: 700 }}>
              <span style={{ width: 22, height: 4, borderRadius: 999, background: `linear-gradient(90deg, ${LINE}, #EC4899)` }} /> Class average
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: T.text.secondary, fontWeight: 700 }}>
              <span style={{ width: 22, borderTop: `2px dashed ${T.color.danger.solid}` }} /> Pass mark {PASS_MARK}%
            </span>
          </div>
        </div>

        {stillLoading ? (
          <div className="sl-skeleton" style={{ height: 380, borderRadius: 16 }} />
        ) : points.length === 0 ? (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text.tertiary, fontSize: 14 }}>
            No corrected exams for this class and section yet.
          </div>
        ) : (
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 30, right: 30, bottom: 6, left: -4 }}>
                <defs>
                  <linearGradient id="perfLine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor={LINE} />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                  <linearGradient id="perfArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={LINE} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={LINE} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#EEF0F7" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: '#E2E5F0' }} tickLine={false} padding={{ left: 40, right: 40 }} dy={8} />
                <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`}
                  tick={{ ...AXIS_TICK, fontWeight: 600, fill: T.text.tertiary, fontSize: 12 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={PASS_MARK} stroke={T.color.danger.solid} strokeDasharray="5 5" strokeOpacity={0.55} />
                <Tooltip cursor={{ stroke: '#C7CDFF', strokeWidth: 1.5 }} content={(props: any) => <PerfTooltip {...props} />} />
                <Area type="monotone" dataKey="avg" stroke="none" fill="url(#perfArea)" isAnimationActive tooltipType="none" legendType="none" />
                <Line type="monotone" dataKey="avg" name="Class average" stroke="url(#perfLine)" strokeWidth={4} connectNulls
                  dot={{ r: 7, strokeWidth: 4, stroke: '#FFFFFF', fill: LINE }}
                  activeDot={{ r: 9, strokeWidth: 4, stroke: '#FFFFFF', fill: '#EC4899' }}>
                  {points.length <= 8 && <LabelList dataKey="avg" content={PointLabel} />}
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      {!stillLoading && scoredResults > 0 && <div className="sl-outcome-grid">
        <Card>
          <div className="sl-chart-eyebrow">ASSESSMENT OUTCOMES</div>
          <h2 className="sl-chart-title">Pass rate by assessment</h2>
          <p className="sl-chart-description">Percentage of scored results at or above {PASS_MARK}%. Hover for the exact rate.</p>
          <div style={{ height: 270, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 12, right: 12, left: -20, bottom: 12 }}>
                <CartesianGrid vertical={false} stroke="#EDF0F5" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: T.text.tertiary }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => [`${value}%`, 'Pass rate']} contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }} cursor={{ fill: '#F1F5F9' }} />
                <Bar dataKey="passRate" fill="#6366F1" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>}
    </div>
  );
};

/* Value bubble above each point */
const PointLabel = (props: any) => {
  const { x, y, value } = props;
  if (value == null) return null;
  const text = `${Number(value).toFixed(1)}%`;
  const w = text.length * 7.6 + 16;
  return (
    <g>
      <rect x={x - w / 2} y={y - 38} width={w} height={24} rx={12} fill="#1E1B4B" />
      <path d={`M${x - 5} ${y - 14} L${x} ${y - 9} L${x + 5} ${y - 14} Z`} fill="#1E1B4B" />
      <text x={x} y={y - 21.5} textAnchor="middle" fontSize={12} fontWeight={800} fill="#FFFFFF" fontFamily={FONT}>{text}</text>
    </g>
  );
};

const PerfTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E7E9F3', borderRadius: 14, boxShadow: T.shadow.lg, padding: '12px 14px', fontFamily: FONT, minWidth: 190 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: T.text.primary }}>{p.label}</div>
      <div style={{ fontSize: 11.5, color: T.text.tertiary, fontWeight: 600, marginTop: 1 }}>{fmtDate(p.date)}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 8 }}>
        <span style={{ ...NUM, fontSize: 24, fontWeight: 800, color: LINE }}>{p.avg == null ? '—' : `${p.avg}%`}</span>
        <span style={{ fontSize: 12, color: T.text.secondary, fontWeight: 600 }}>class average</span>
      </div>
      <div style={{ fontSize: 12, color: T.text.secondary, marginTop: 4 }}>{p.n} students</div>
      <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 6, paddingTop: 6, borderTop: '1px solid #F1F2F8' }}>{p.names.join(', ')}</div>
    </div>
  );
};

const FilterSelect: React.FC<{
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean;
}> = ({ label, value, onChange, options, disabled }) => (
  <label style={{ display: 'grid', gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 800, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
    <div style={{ position: 'relative' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} style={{
        appearance: 'none', minWidth: 200, padding: '11px 38px 11px 14px', borderRadius: 12,
        border: '1.5px solid #E2E5F0', background: disabled ? '#F8F9FC' : '#FFFFFF',
        fontSize: 14, fontFamily: FONT, fontWeight: 700, color: T.text.primary, outline: 'none', cursor: disabled ? 'default' : 'pointer',
        boxShadow: '0 1px 2px rgba(16,24,64,0.05)',
      }}
        onFocus={(e) => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.boxShadow = T.shadow.focus; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E5F0'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(16,24,64,0.05)'; }}
      >
        {options.length === 0 && <option value="">—</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg width="13" height="13" fill="none" stroke={T.text.tertiary} strokeWidth="2.4" viewBox="0 0 24 24" style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </label>
);

export default TeacherAnalyticsPanel;
