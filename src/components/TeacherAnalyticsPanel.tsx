import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, LabelList, BarChart, Bar,
} from 'recharts';
import T from '../theme/tokens';
import {
  ExamRecord, PASS_MARK, computeStats, fmtDate, groupAssessments, pooledAttempts,
} from '../utils/examAnalytics';
import { FONT, NUM } from './AnalyticsKit';

interface TeacherAnalyticsPanelProps {
  records: ExamRecord[];
  examsLoading: boolean;
  attemptsProgress: { done: number; total: number } | null;
  onOpenExam?: (examId: number) => void;
}

const AXIS_TICK = { fontSize: 12, fill: '#64748B', fontFamily: FONT, fontWeight: 600 };
const BRAND_PRIMARY = '#4F46E5';
const BRAND_ACCENT = '#06B6D4';

/** "Class 9 · A3" → { cls: "9", section: "A3" } */
const splitClassLabel = (label: string) => {
  const m = label.match(/^Class\s+(\S+)(?:\s*·\s*(\S+))?/i);
  return { cls: m?.[1] ?? label, section: m?.[2] ?? '' };
};

const TeacherAnalyticsPanel: React.FC<TeacherAnalyticsPanelProps> = ({ records, examsLoading, attemptsProgress, onOpenExam }) => {
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
        examIds: p.records.map((r) => r.id),
      };
    });
  }, [loaded, classKey]);

  const scoredResults = points.reduce((sum, point) => sum + point.n, 0);

  const cohortStats = useMemo(() => {
    if (!points.length) return null;
    const validAvgs = points.map((p) => p.avg).filter((v): v is number => v !== null);
    const overallAvg = validAvgs.length ? +(validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(1) : null;
    const validPass = points.map((p) => p.passRate).filter((v): v is number => v !== null);
    const overallPass = validPass.length ? +(validPass.reduce((a, b) => a + b, 0) / validPass.length).toFixed(1) : null;
    const topAvg = validAvgs.length ? Math.max(...validAvgs) : null;
    const lowestAvg = validAvgs.length ? Math.min(...validAvgs) : null;
    return { overallAvg, overallPass, topAvg, lowestAvg };
  }, [points]);

  const stillLoading = examsLoading || (attemptsProgress != null && attemptsProgress.done < attemptsProgress.total && loaded.length === 0);

  return (
    <div style={{ display: 'grid', gap: 24, fontFamily: FONT }}>
      
      {/* ── Section Header ────────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid #E2E8F0',
        padding: '24px 28px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: 'rgba(79,70,229,0.08)', color: '#4F46E5', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5' }} />
            Academic Intelligence
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.025em', lineHeight: 1.2 }}>
            Class Performance Analytics
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: '#64748B', fontWeight: 500, maxWidth: 640 }}>
            Track longitudinal cohort mastery, pass mark thresholds, and multi-cycle exam trends.
          </p>
        </div>

        {/* Filter Toolbar embedded directly into header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
          {/* Class Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', padding: '6px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Class:</span>
            <select
              value={cls}
              onChange={(e) => { setCls(e.target.value); setSection(''); }}
              disabled={stillLoading || classes.length === 0}
              style={{
                border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#0F172A',
                cursor: 'pointer', outline: 'none', fontFamily: FONT,
              }}
            >
              {classes.map((c) => (<option key={c} value={c}>Class {c}</option>))}
            </select>
          </div>

          {/* Section Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8FAFC', padding: '6px 12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Section:</span>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              disabled={stillLoading || sections.length === 0}
              style={{
                border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#0F172A',
                cursor: 'pointer', outline: 'none', fontFamily: FONT,
              }}
            >
              {sections.map((s) => (<option key={s} value={s}>{s === '—' ? 'All Sections' : `Section ${s}`}</option>))}
            </select>
          </div>

          {attemptsProgress && attemptsProgress.done < attemptsProgress.total && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 10, background: '#EEF2FF', color: '#4F46E5', fontSize: 12, fontWeight: 700 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F46E5', animation: 'dot-pulse 1.2s ease-in-out infinite' }} />
              Syncing {attemptsProgress.done}/{attemptsProgress.total}
            </div>
          )}
        </div>
      </div>

      {/* ── Metric KPI Cards ──────────────────────────────────── */}
      {!stillLoading && cohortStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {/* Card 1 */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cohort Average</span>
              <span style={{ padding: '3px 8px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 700 }}>Mean</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {cohortStats.overallAvg != null ? `${cohortStats.overallAvg}%` : '—'}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: (cohortStats.overallAvg ?? 0) >= PASS_MARK ? '#10B981' : '#F43F5E' }}>
                {(cohortStats.overallAvg ?? 0) >= PASS_MARK ? 'Above Pass' : 'Under Target'}
              </span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#94A3B8' }}>Aggregated across {points.length} exam cycles</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #4F46E5, #818CF8)' }} />
          </div>

          {/* Card 2 */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall Pass Rate</span>
              <span style={{ padding: '3px 8px', borderRadius: 6, background: '#ECFDF5', color: '#059669', fontSize: 11, fontWeight: 700 }}>&ge; {PASS_MARK}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#059669', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {cohortStats.overallPass != null ? `${cohortStats.overallPass}%` : '—'}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#059669' }}>Qualified</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#94A3B8' }}>Benchmark set at {PASS_MARK}% pass criteria</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#10B981' }} />
          </div>

          {/* Card 3 */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Peak Exam Score</span>
              <span style={{ padding: '3px 8px', borderRadius: 6, background: '#F0FDFA', color: '#0D9488', fontSize: 11, fontWeight: 700 }}>Record High</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#0D9488', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {cohortStats.topAvg != null ? `${cohortStats.topAvg}%` : '—'}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#0D9488' }}>Peak mean</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#94A3B8' }}>Highest recorded assessment average</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#0D9488' }} />
          </div>

          {/* Card 4 */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Evaluated Sheets</span>
              <span style={{ padding: '3px 8px', borderRadius: 6, background: '#F8FAFC', color: '#475569', fontSize: 11, fontWeight: 700 }}>Verified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                {scoredResults.toLocaleString()}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: '#64748B' }}>Papers</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: '#94A3B8' }}>Total scored exam submissions</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#3B82F6' }} />
          </div>
        </div>
      )}

      {/* ── Main Performance Progression Chart ────────────────── */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px 28px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.015em' }}>
              Historical Performance Progression
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>
              {cls ? `Class ${cls}${section && section !== '—' ? ` · Section ${section}` : ''} — ` : ''}
              Mean score obtained in each assessment chronologically.
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155', fontWeight: 700 }}>
              <span style={{ width: 14, height: 4, borderRadius: 2, background: BRAND_PRIMARY }} /> Class Average
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#E11D48', fontWeight: 700 }}>
              <span style={{ width: 14, borderTop: '2px dashed #E11D48' }} /> Pass Benchmark ({PASS_MARK}%)
            </span>
          </div>
        </div>

        {stillLoading ? (
          <div style={{ height: 380, borderRadius: 12, background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', fontSize: 13 }}>
            Calculating cohort assessment data...
          </div>
        ) : points.length === 0 ? (
          <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', gap: 8 }}>
            <svg width="36" height="36" fill="none" stroke="#CBD5E1" strokeWidth="1.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span style={{ fontSize: 14, fontWeight: 600 }}>No corrected exams available for this class and section.</span>
          </div>
        ) : (
          <div style={{ height: 400, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 25, right: 24, bottom: 10, left: -10 }}>
                <defs>
                  <linearGradient id="primaryArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BRAND_PRIMARY} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={BRAND_PRIMARY} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="label" tick={AXIS_TICK} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} padding={{ left: 35, right: 35 }} dy={8} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`}
                  tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <ReferenceLine y={PASS_MARK} stroke="#E11D48" strokeDasharray="4 4" strokeWidth={1.5} />
                <Tooltip cursor={{ stroke: '#CBD5E1', strokeWidth: 1.5, strokeDasharray: '4 4' }} content={(props: any) => <PerfTooltip {...props} />} />
                <Area type="monotone" dataKey="avg" stroke="none" fill="url(#primaryArea)" isAnimationActive />
                <Line type="monotone" dataKey="avg" name="Class average" stroke={BRAND_PRIMARY} strokeWidth={3.5} connectNulls
                  dot={{ r: 6, strokeWidth: 3, stroke: '#FFFFFF', fill: BRAND_PRIMARY }}
                  activeDot={{ r: 8, strokeWidth: 3, stroke: '#FFFFFF', fill: BRAND_ACCENT }}>
                  {points.length <= 10 && <LabelList dataKey="avg" content={PointLabel} />}
                </Line>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Assessment Outcomes (Pass Rate & Breakdown) ───────── */}
      {!stillLoading && scoredResults > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
          {/* Bar Chart Card */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.015em' }}>
              Pass Rate Distribution
            </div>
            <p style={{ margin: '4px 0 20px', fontSize: 12.5, color: '#64748B' }}>
              Proportion of students scoring at or above the {PASS_MARK}% pass criteria per exam.
            </p>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11.5, fill: '#64748B', fontWeight: 600 }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11.5, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Pass Rate']} contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }} cursor={{ fill: '#F8FAFC' }} />
                  <Bar dataKey="passRate" fill="#4F46E5" radius={[6, 6, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assessment Summary Table Card */}
          <div style={{
            background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '24px',
            boxShadow: '0 1px 3px rgba(15,23,42,0.03)', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.015em' }}>
              Exam Cycles Breakdown
            </div>
            <p style={{ margin: '4px 0 16px', fontSize: 12.5, color: '#64748B' }}>
              Summary of all verified assessments for Class {cls}.
            </p>
            <div style={{ overflowX: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.06em' }}>Assessment</th>
                    <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.06em' }}>Date</th>
                    <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.06em' }}>Average</th>
                    <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.06em' }}>Pass Rate</th>
                    <th style={{ padding: '8px 10px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.06em', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 10px', fontWeight: 700, color: '#0F172A' }}>{p.label}</td>
                      <td style={{ padding: '10px 10px', color: '#64748B' }}>{fmtDate(p.date)}</td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{ fontWeight: 800, color: (p.avg ?? 0) >= PASS_MARK ? '#059669' : '#E11D48' }}>
                          {p.avg != null ? `${p.avg}%` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 8px', borderRadius: 6,
                          background: (p.passRate ?? 0) >= 70 ? '#ECFDF5' : (p.passRate ?? 0) >= 50 ? '#FFFBEB' : '#FFF1F2',
                          color: (p.passRate ?? 0) >= 70 ? '#059669' : (p.passRate ?? 0) >= 50 ? '#D97706' : '#E11D48',
                          fontWeight: 700, fontSize: 11.5,
                        }}>
                          {p.passRate != null ? `${p.passRate}%` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right' }}>
                        {p.examIds?.[0] && onOpenExam ? (
                          <button
                            onClick={() => onOpenExam(p.examIds[0])}
                            style={{
                              padding: '4px 10px', borderRadius: 6, border: '1px solid #E2E8F0',
                              background: '#F8FAFC', color: '#4F46E5', fontSize: 11.5, fontWeight: 700,
                              cursor: 'pointer', fontFamily: FONT,
                            }}
                          >
                            Correct &rarr;
                          </button>
                        ) : (
                          <span style={{ color: '#CBD5E1' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* Value bubble above each point */
const PointLabel = (props: any) => {
  const { x, y, value } = props;
  if (value == null) return null;
  const text = `${Number(value).toFixed(1)}%`;
  const w = text.length * 7.5 + 14;
  return (
    <g>
      <rect x={x - w / 2} y={y - 34} width={w} height={22} rx={6} fill="#0F172A" />
      <path d={`M${x - 4} ${y - 12} L${x} ${y - 8} L${x + 4} ${y - 12} Z`} fill="#0F172A" />
      <text x={x} y={y - 19} textAnchor="middle" fontSize={11} fontWeight={800} fill="#FFFFFF" fontFamily={FONT}>{text}</text>
    </g>
  );
};

const PerfTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '14px 16px', fontFamily: FONT, minWidth: 200 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{p.label}</div>
      <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600, marginTop: 1 }}>{fmtDate(p.date)}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
        <span style={{ ...NUM, fontSize: 24, fontWeight: 800, color: BRAND_PRIMARY }}>{p.avg == null ? '—' : `${p.avg}%`}</span>
        <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>class average</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#475569' }}>
        <span>Pass rate:</span>
        <strong style={{ color: (p.passRate ?? 0) >= PASS_MARK ? '#059669' : '#E11D48' }}>{p.passRate}%</strong>
      </div>
      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{p.n} students evaluated</div>
      {p.names?.length > 0 && (
        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 8, paddingTop: 8, borderTop: '1px solid #F1F5F9' }}>
          {p.names.slice(0, 2).join(', ')}{p.names.length > 2 ? ` +${p.names.length - 2} more` : ''}
        </div>
      )}
    </div>
  );
};

export default TeacherAnalyticsPanel;
