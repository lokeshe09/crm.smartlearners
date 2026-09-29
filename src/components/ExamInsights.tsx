import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ReferenceLine,
} from 'recharts';
import {
  examAPI,
  TeacherExamAttemptResultItem,
  TeacherExamQuestionPerformanceItem,
} from '../services/api';
import T from '../theme/tokens';
import KaTeXText from './KaTeXText';
import {
  BANDS, ExamRecord, PASS_MARK, asStringList, bandMeta, bandOf,
  normQuestionNo, questionCounts, questionObtained,
} from '../utils/examAnalytics';
import { BandGradients, bandFill, Card, CardTitle, ChartTooltip, FONT } from './AnalyticsKit';

const AXIS_TICK = { fontSize: 12, fill: T.text.tertiary, fontFamily: FONT, fontWeight: 600 };

/* ─── Question aggregation ─────────────────────────── */

export interface QuestionAgg {
  q: string;
  max: number;
  pct: number;          // class % of marks obtained on this question
  n: number;            // students with data
  full: number;         // fully correct
  partial: number;      // some marks
  wrong: number;        // attempted, zero marks
  notAttempted: number; // left blank
  concepts: string[];   // most common topics first, de-duplicated
  text: string | null;  // question text, when known
}

/**
 * Readable plain text for LaTeX in places KaTeX can't render (SVG chart labels).
 * "$\frac{1}{2} \times x^2$" → "1/2 × x²"
 */
const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', n: 'ⁿ' };
const plainMath = (s: string) => {
  if (!/[$\\]/.test(s)) return s;
  return s
    .replace(/\$\$?|\\\(|\\\)|\\\[|\\\]/g, '')
    .replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^{}]*)\}/g, '√$1')
    .replace(/\^\{?([0-9n])\}?/g, (_, d) => SUP[d] ?? `^${d}`)
    .replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\div/g, '÷')
    .replace(/\\pm/g, '±').replace(/\\le(q)?/g, '≤').replace(/\\ge(q)?/g, '≥').replace(/\\neq/g, '≠')
    .replace(/\\pi/g, 'π').replace(/\\theta/g, 'θ').replace(/\\alpha/g, 'α').replace(/\\beta/g, 'β').replace(/\\degree|\^\\circ|\\circ/g, '°')
    .replace(/\\(text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, '$2')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const conceptNames = (q: TeacherExamQuestionPerformanceItem) => asStringList(q.concepts_required as any).map(plainMath);

const qPct = (q: TeacherExamQuestionPerformanceItem) => {
  if (q.percentage != null && Number.isFinite(Number(q.percentage))) return Number(q.percentage);
  const o = questionObtained(q);
  return o != null && q.max_marks ? (Number(o) / Number(q.max_marks)) * 100 : null;
};

const isNotAttempted = (q: TeacherExamQuestionPerformanceItem) =>
  /not[\s_-]*attempt|unattempt|blank|skipped/i.test(String(q.error_type ?? ''));

/** Try to read per-question rows embedded in an attempt (shape varies by backend version). */
export const parseQuestionEval = (v: unknown): TeacherExamQuestionPerformanceItem[] | null => {
  if (!v) return null;
  let list: any[] | null = null;
  if (Array.isArray(v)) list = v;
  else if (typeof v === 'object') {
    const o = v as Record<string, any>;
    if (Array.isArray(o.questions)) list = o.questions;
    else if (Array.isArray(o.items)) list = o.items;
    else {
      const vals = Object.entries(o).map(([k, val]) => (val && typeof val === 'object' ? { question_number: k, ...val } : null)).filter(Boolean);
      list = vals as any[];
    }
  }
  if (!list || list.length === 0) return null;
  const rows = list
    .filter((x) => x && typeof x === 'object' && x.question_number != null && (x.percentage != null || x.max_marks != null))
    .map((x) => ({ ...x, question_number: normQuestionNo(x.question_number) })) as TeacherExamQuestionPerformanceItem[];
  return rows.length ? rows : null;
};

export const aggregateQuestions = (
  perStudent: TeacherExamQuestionPerformanceItem[][],
  paperText?: Map<string, string>,
): QuestionAgg[] => {
  const map = new Map<string, {
    max: number; sumPct: number; n: number; full: number; partial: number; wrong: number; blank: number;
    concepts: Map<string, { label: string; n: number }>; text: string | null;
  }>();
  perStudent.forEach((rows) => rows.filter(questionCounts).forEach((q) => {
    const p = qPct(q);
    if (p == null) return;
    const key = normQuestionNo(q.question_number);
    const cur = map.get(key) ?? {
      max: Number(q.max_marks ?? 0), sumPct: 0, n: 0, full: 0, partial: 0, wrong: 0, blank: 0,
      concepts: new Map(), text: null,
    };
    cur.sumPct += p;
    cur.n += 1;
    if (isNotAttempted(q)) cur.blank += 1;
    else if (p >= 99.5) cur.full += 1;
    else if (p > 0) cur.partial += 1;
    else cur.wrong += 1;
    // Each answer sheet names topics in its own words — count them case-insensitively
    // so the same topic isn't listed twice.
    const seen = new Set<string>();
    conceptNames(q).forEach((c) => {
      const label = c.trim().replace(/\s+/g, ' ').replace(/\.$/, '');
      const k = label.toLowerCase();
      if (!label || seen.has(k)) return;
      seen.add(k);
      const e = cur.concepts.get(k) ?? { label, n: 0 };
      e.n += 1;
      cur.concepts.set(k, e);
    });
    if (!cur.text) cur.text = (q.question_text || q.question || null) as string | null;
    map.set(key, cur);
  }));
  return Array.from(map.entries())
    .map(([q, v]) => ({
      q,
      max: v.max,
      pct: v.sumPct / v.n,
      n: v.n,
      full: v.full,
      partial: v.partial,
      wrong: v.wrong,
      notAttempted: v.blank,
      concepts: mergeTopics(Array.from(v.concepts.values()), v.n),
      text: paperText?.get(q) ?? v.text,
    }))
    .sort((a, b) => a.q.localeCompare(b.q, undefined, { numeric: true }));
};

/* ─── Topic clean-up ─────────────────────────────── */

const TOPIC_STOPWORDS = new Set(['the', 'of', 'in', 'a', 'an', 'and', 'to', 'for', 'on', 'during', 'its', 'with', 'by']);
const topicTokens = (label: string) => new Set(
  label.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter((w) => w && !TOPIC_STOPWORDS.has(w))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)),
);
const sameTopic = (a: Set<string>, b: Set<string>) => {
  if (!a.size || !b.size) return false;
  let shared = 0;
  a.forEach((w) => { if (b.has(w)) shared += 1; });
  const union = a.size + b.size - shared;
  return shared === Math.min(a.size, b.size) || shared / union >= 0.6; // subset, or mostly the same words
};

/**
 * Each answer sheet names a question's topic in its own words ("Execution Methods",
 * "Methods of Execution"…). Merge near-identical names, keep the most common wording,
 * and drop one-off labels so only topics a real share of the class was tagged with remain.
 */
const mergeTopics = (topics: { label: string; n: number }[], students: number) => {
  const clusters: { label: string; top: number; n: number; tokens: Set<string> }[] = [];
  [...topics].sort((a, b) => b.n - a.n).forEach((t) => {
    const tokens = topicTokens(t.label);
    const hit = clusters.find((c) => sameTopic(c.tokens, tokens));
    if (hit) hit.n += t.n;
    else clusters.push({ label: t.label, top: t.n, n: t.n, tokens });
  });
  clusters.sort((a, b) => b.n - a.n);
  const floor = Math.max(2, Math.round(students * 0.15));
  // Also skip a topic that shares a keyword with one already shown ("Old Regime Taxation"
  // after "Taxation in Pre-Revolutionary France") — it reads as a repeat.
  const picked: typeof clusters = [];
  clusters.forEach((c, i) => {
    if (picked.length >= 3 || (i > 0 && c.n < floor)) return;
    if (picked.some((p) => Array.from(c.tokens).some((w) => p.tokens.has(w)))) return;
    picked.push(c);
  });
  return picked.map((c) => c.label);
};

const questionCache = new Map<number, QuestionAgg[]>();

/** Question text from the exam's processed paper, keyed by normalised question number. */
const paperTextOf = (record: ExamRecord | undefined) => {
  const m = new Map<string, string>();
  const qs = (record?.exam.processing_summary as any)?.questions;
  if (Array.isArray(qs)) qs.forEach((q: any) => { if (q?.question_number != null && q.question_text) m.set(normQuestionNo(q.question_number), String(q.question_text)); });
  return m;
};

/* Outcome categories for a question — shared by tooltip and legend */
const OUTCOMES = [
  { key: 'full' as const, label: 'Fully correct', color: T.color.success.solid },
  { key: 'partial' as const, label: 'Partly correct', color: T.color.warning.solid },
  { key: 'wrong' as const, label: 'Incorrect', color: T.color.danger.solid },
  { key: 'notAttempted' as const, label: 'Not attempted', color: T.color.neutral[400] },
];

/* ═══════════════════ Exam-level insights ═══════════════════ */

export const ExamInsightPanel: React.FC<{
  record: ExamRecord | undefined;
  attempts: TeacherExamAttemptResultItem[];
}> = ({ record, attempts }) => {
  const stats = record?.stats;
  const examId = record?.id ?? 0;
  const paperText = useMemo(() => paperTextOf(record), [record]);

  const embedded = useMemo(() => {
    const parsed = attempts.map((a) => parseQuestionEval(a.questions_evaluation)).filter((x): x is TeacherExamQuestionPerformanceItem[] => !!x);
    return parsed.length >= Math.max(1, Math.floor(attempts.length / 2)) ? aggregateQuestions(parsed, paperText) : null;
  }, [attempts, paperText]);

  const [questions, setQuestions] = useState<QuestionAgg[] | null>(() => questionCache.get(examId) ?? null);
  const [qLoading, setQLoading] = useState<{ done: number; total: number } | null>(null);

  const qData = embedded && embedded.length ? embedded : questions;

  // Question analysis is the main content of this page — load it automatically.
  useEffect(() => {
    let cancelled = false;
    const cached = questionCache.get(examId) ?? null;
    setQuestions(cached);
    if (cached || embedded || !examId || attempts.length === 0) { setQLoading(null); return; }

    const list = [...attempts];
    const results: TeacherExamQuestionPerformanceItem[][] = [];
    let done = 0;
    setQLoading({ done, total: attempts.length });
    const worker = async () => {
      while (list.length && !cancelled) {
        const a = list.shift()!;
        try {
          const r = await examAPI.getTeacherExamQuestionPerformance(examId, a.student_id, 200);
          const rows = (r.items?.length ? r.items : r.questions_evaluation) ?? [];
          if (rows.length) results.push(rows);
        } catch { /* skip student */ }
        done += 1;
        if (!cancelled) setQLoading({ done, total: attempts.length });
      }
    };
    Promise.all(Array.from({ length: Math.min(5, list.length) }, worker)).then(() => {
      if (cancelled) return;
      const agg = aggregateQuestions(results, paperText);
      questionCache.set(examId, agg);
      setQuestions(agg);
      setQLoading(null);
    });
    return () => { cancelled = true; };
  }, [examId, attempts, embedded, paperText]);

  if (!stats || stats.n === 0) return null;

  const chartData = (qData ?? []).map((q) => ({ ...q, label: `Q${q.q}`, value: +q.pct.toFixed(1) }));
  const reteach = chartData.filter((q) => q.pct < PASS_MARK).length;
  const manyQuestions = chartData.length > 24;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card>
        <CardTitle
          title="Question analysis"
          subtitle={qData && qData.length
            ? `Class score on each question. ${reteach ? `${reteach} question${reteach === 1 ? '' : 's'} below ${PASS_MARK}% — re-teach these.` : 'No question fell below the pass mark.'} Hover a bar for the student breakdown and topics.`
            : 'Class score on each question.'}
          right={qData && qData.length ? <QuestionLegend /> : undefined}
        />
        {qData && qData.length > 0 ? (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 22, right: 8, bottom: 4, left: -12 }} barCategoryGap={manyQuestions ? '14%' : '22%'}>
                <BandGradients />
                <CartesianGrid stroke={T.color.neutral[150]} vertical={false} />
                <XAxis dataKey="label" tick={{ ...AXIS_TICK, fontSize: manyQuestions ? 10 : 12 }} axisLine={{ stroke: T.color.neutral[200] }} tickLine={false} interval={0} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <ReferenceLine y={PASS_MARK} stroke={T.color.danger.solid} strokeDasharray="2 4" strokeOpacity={0.6}
                  label={{ value: `Pass ${PASS_MARK}%`, position: 'insideTopRight', fill: T.text.tertiary, fontSize: 11, fontWeight: 600 }} />
                <Tooltip cursor={{ fill: T.color.neutral[100] }} content={(props: any) => <QuestionTooltip {...props} />} />
                <Bar dataKey="value" name="Class score" radius={[10, 10, 10, 10]} maxBarSize={44}
                  background={{ fill: '#F0F1F8', radius: 10 } as any}>
                  {chartData.map((q) => <Cell key={q.q} fill={bandFill(bandOf(q.pct))} />)}
                  {!manyQuestions && (
                    <LabelList dataKey="value" position="top"
                      formatter={(v: any) => `${Number(v).toFixed(0)}%`}
                      style={{ fontSize: 11, fontWeight: 800, fill: T.text.primary, fontFamily: FONT }} />
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : qLoading ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: T.text.secondary, fontWeight: 600, marginBottom: 10 }}>Analysing answer sheets… {qLoading.done} / {qLoading.total}</div>
            <div style={{ height: 6, background: T.color.neutral[100], borderRadius: 999, overflow: 'hidden', maxWidth: 260, margin: '0 auto' }}>
              <div style={{ width: `${(qLoading.done / Math.max(1, qLoading.total)) * 100}%`, height: '100%', background: T.color.brand[600], transition: 'width 200ms' }} />
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: T.text.tertiary }}>
            Question-wise results aren't available for this exam yet.
          </div>
        )}
      </Card>
    </div>
  );
};

/** Hover card for one question: score, who got it right / wrong / skipped it, and its topics. */
const QuestionTooltip: React.FC<{ active?: boolean; payload?: any[] }> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const q = payload[0].payload as QuestionAgg & { label: string };
  const band = bandMeta(bandOf(q.pct));
  const text = q.text || null;
  return (
    <div style={{
      background: '#FFFFFF', border: `1px solid ${T.border.subtle}`, borderRadius: 12, boxShadow: T.shadow.lg,
      padding: '12px 14px', fontFamily: FONT, width: 290,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: T.text.primary }}>{q.label} <span style={{ fontSize: 11, color: T.text.tertiary, fontWeight: 600 }}>· {q.max} mark{q.max === 1 ? '' : 's'}</span></span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 800, color: T.text.primary }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: band.color }} />{q.pct.toFixed(0)}%
        </span>
      </div>
      {text && (
        // Full text rendered with KaTeX (never cut mid-formula), visually clamped to ~4 lines
        <div className="sl-rich sl-clamp-4" style={{ fontSize: 11.5, color: T.text.secondary, lineHeight: 1.5, marginTop: 6 }}>
          <KaTeXText text={text} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 999, overflow: 'hidden', margin: '10px 0 8px', background: T.color.neutral[100] }}>
        {OUTCOMES.filter((o) => q[o.key] > 0).map((o) => <div key={o.key} style={{ flex: q[o.key], background: o.color }} />)}
      </div>
      <div style={{ display: 'grid', gap: 3 }}>
        {OUTCOMES.map((o) => (
          <div key={o.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.text.secondary, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: o.color }} />{o.label}
            </span>
            <span style={{ color: T.text.primary, fontWeight: 800 }}>{q[o.key]} <span style={{ color: T.text.tertiary, fontWeight: 600 }}>student{q[o.key] === 1 ? '' : 's'}</span></span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 2 }}>Attempted by {q.n - q.notAttempted} of {q.n} students</div>
      </div>

      {q.concepts.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.border.subtle}` }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>Topics</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {q.concepts.map((c) => (
              <span key={c} style={{ padding: '2px 8px', borderRadius: 999, background: T.color.brand.tint, color: T.color.brand[700], fontSize: 11, fontWeight: 700 }}>{c}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


const QuestionLegend: React.FC = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
    {BANDS.map((b) => (
      <span key={b.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.text.tertiary, fontWeight: 600 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: b.color }} />{b.range}
      </span>
    ))}
  </div>
);

/* ═══════════════════ Student-in-exam insights ═══════════════════ */

interface TopicRow { name: string; pct: number; got: number; max: number; qs: string[] }

/** Marks earned per topic for one student, near-duplicate topic names merged. */
const studentTopics = (rows: TeacherExamQuestionPerformanceItem[]): TopicRow[] => {
  const clusters: (TopicRow & { tokens: Set<string> })[] = [];
  rows.filter(questionCounts).forEach((q) => {
    const max = Number(q.max_marks ?? 0);
    if (!max) return;
    const got = Number(questionObtained(q) ?? 0);
    const qn = `Q${normQuestionNo(q.question_number)}`;
    // Split the question's marks across its topics once each
    const seen = new Set<(typeof clusters)[number]>();
    conceptNames(q).forEach((raw) => {
      const name = raw.trim().replace(/\s+/g, ' ').replace(/\.$/, '');
      if (!name) return;
      const tokens = topicTokens(name);
      let c = clusters.find((x) => sameTopic(x.tokens, tokens));
      if (!c) { c = { name, pct: 0, got: 0, max: 0, qs: [], tokens }; clusters.push(c); }
      if (seen.has(c)) return;
      seen.add(c);
      c.got += got; c.max += max;
      if (!c.qs.includes(qn)) c.qs.push(qn);
    });
  });
  return clusters
    .map(({ tokens, ...c }) => ({ ...c, pct: c.max ? (c.got / c.max) * 100 : 0 }))
    .sort((a, b) => a.pct - b.pct || b.max - a.max);
};

const fmtMarks = (v: number) => (v % 1 ? v.toFixed(1) : String(v));

/** Topic-wise analysis — horizontal bars, weakest topic at the top. */
export const StudentTopicChart: React.FC<{ questionRows: TeacherExamQuestionPerformanceItem[] }> = ({ questionRows }) => {
  const topics = useMemo(() => studentTopics(questionRows).slice(0, 12), [questionRows]);
  const data = topics.map((t) => ({ ...t, value: +t.pct.toFixed(1) }));
  return (
    <Card>
      <CardTitle
        title="Topic-wise analysis"
        subtitle="Share of marks earned in each topic — weakest first. Hover a bar for marks and questions."
        right={topics.length ? <QuestionLegend /> : undefined}
      />
      {topics.length === 0 ? (
        <div style={{ padding: '30px 0', textAlign: 'center', fontSize: 13, color: T.text.tertiary }}>Topic tags aren't available for this exam.</div>
      ) : (
        <div style={{ height: Math.max(140, data.length * 38 + 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }} barCategoryGap="26%">
              <BandGradients vertical={false} />
              <CartesianGrid stroke={T.color.neutral[150]} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={230} axisLine={{ stroke: T.color.neutral[200] }} tickLine={false} interval={0}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const label = String(payload.value);
                  return (
                    <text x={x - 8} y={y} dy={4} textAnchor="end" fontSize={12} fontWeight={600} fill={T.text.secondary} fontFamily={FONT}>
                      {label.length > 32 ? `${label.slice(0, 31)}…` : label}
                    </text>
                  );
                }} />
              <ReferenceLine x={PASS_MARK} stroke={T.color.danger.solid} strokeDasharray="2 4" strokeOpacity={0.6} />
              <Tooltip cursor={{ fill: T.color.neutral[100] }}
                content={(props: any) => (
                  <ChartTooltip {...props}
                    title={(_, payload) => payload[0]?.payload?.name}
                    format={(v) => `${Number(v).toFixed(0)}%`}
                    footer={(_, payload) => {
                      const t = payload[0]?.payload as TopicRow | undefined;
                      return t ? `${fmtMarks(t.got)} of ${fmtMarks(t.max)} marks · ${t.qs.join(', ')}` : '';
                    }} />
                )} />
              <Bar dataKey="value" name="Marks earned" radius={[999, 999, 999, 999]} maxBarSize={16} minPointSize={6}
                background={{ fill: '#F0F1F8', radius: 999 } as any}>
                {data.map((t) => <Cell key={t.name} fill={bandFill(bandOf(t.pct), false)} />)}
                <LabelList dataKey="value" position="right" formatter={(v: any) => `${Number(v).toFixed(0)}%`}
                  style={{ fontSize: 11, fontWeight: 800, fill: T.text.primary, fontFamily: FONT }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

/* ─── Concise feedback ────────────────────────────── */

/**
 * Split text into sentences without ever cutting through a LaTeX formula:
 * formulas ($…$, $$…$$, \(…\), \[…\]) are masked first, then restored.
 * Splits only at real sentence ends (". " followed by a capital), so "e.g." or "Q.5" stay intact.
 */
const MATH_RE = /\$\$[\s\S]*?\$\$|\$[^$]+?\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/g;
const splitSentences = (text: string): string[] => {
  const math: string[] = [];
  const masked = text.replace(MATH_RE, (m) => { math.push(m); return `\u0000${math.length - 1}\u0000`; }).replace(/\s+/g, ' ');
  return masked
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => math[Number(i)]).trim())
    .filter(Boolean);
};

/** First full sentence of a point — never cut mid-sentence or mid-formula. */
const brief = (s: string) => splitSentences(s)[0] ?? s.trim();

/** Break a long remediation paragraph into a few short action points. */
const planPoints = (plan: string, limit = 3) => {
  const sentences = splitSentences(plan);
  // Prefer sentences that tell the student what to do
  const action = /\b(practi[cs]e|revise|review|re-?read|learn|memori[sz]e|focus|write|make|create|attempt|solve|read|study|work on|prepare|improve|use|try|draw|list|summari[sz]e|distinguish|complete|manage)\b/i;
  const picked = sentences.filter((s) => action.test(s) && !/^you (have|showed|demonstrated|scored)/i.test(s) && !/^(excellent|great|good|well done|congratulations|fantastic|superb)\b/i.test(s));
  return (picked.length ? picked : sentences).slice(0, limit).map((s) => {
    const t = s.replace(/^(first(ly)?|second(ly)?|third(ly)?|finally|next|also|then|factually|additionally|lastly)[,:]?\s+/i, '');
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
};

export const StudentFeedback: React.FC<{ attempt: TeacherExamAttemptResultItem }> = ({ attempt }) => {
  const strengths = asStringList(attempt.strengths).slice(0, 3).map((s) => brief(s));
  const areas = asStringList(attempt.areas_for_improvement).slice(0, 3).map((s) => brief(s));
  const plan = attempt.remediation_plan ? planPoints(attempt.remediation_plan) : [];
  if (!strengths.length && !areas.length && !plan.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
      {(strengths.length > 0 || areas.length > 0) && (
        <Card>
          <CardTitle title="Feedback"
            icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
          <div style={{ display: 'grid', gap: 12 }}>
            {strengths.length > 0 && <MiniList title="Strengths" tone="good" items={strengths} />}
            {areas.length > 0 && <MiniList title="Needs work" tone="bad" items={areas} />}
          </div>
        </Card>
      )}
      {plan.length > 0 && (
        <Card style={{ background: 'radial-gradient(420px 200px at 100% 0%, rgba(99,102,241,0.10), transparent 70%), #FFFFFF' }}>
          <CardTitle title="Remedial plan"
            icon={<svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" /></svg>} />
          <div style={{ display: 'grid', gap: 10, position: 'relative' }}>
            {plan.map((p, i) => (
              <div key={p} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: '#FFFFFF',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800,
                  boxShadow: '0 6px 14px -6px rgba(79,70,229,0.8)',
                }}>{i + 1}</span>
                <span className="sl-rich" style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: T.text.secondary, lineHeight: 1.7, paddingTop: 4 }}><KaTeXText text={p} /></span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

const MiniList: React.FC<{ title: string; tone: 'good' | 'bad'; items: string[] }> = ({ title, tone, items }) => {
  const c = tone === 'good'
    ? { bg: 'linear-gradient(135deg, rgba(16,185,129,0.10), rgba(20,184,166,0.04))', border: 'rgba(16,185,129,0.25)', dot: '#10B981', text: T.color.success.text, icon: '✓' }
    : { bg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(249,115,22,0.04))', border: 'rgba(245,158,11,0.28)', dot: '#F59E0B', text: T.color.warning.text, icon: '!' };
  return (
    <div style={{ padding: '12px 14px', borderRadius: 14, background: c.bg, border: `1px solid ${c.border}` }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        <span style={{ width: 18, height: 18, borderRadius: 999, background: c.dot, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5 }}>{c.icon}</span>
        {title}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {items.map((it) => (
          <div key={it} style={{ display: 'flex', gap: 8, fontSize: 13, color: T.text.secondary, lineHeight: 1.5 }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: c.dot, marginTop: 8, flexShrink: 0 }} />
            <span className="sl-rich" style={{ flex: 1, minWidth: 0 }}><KaTeXText text={it} /></span>
          </div>
        ))}
      </div>
    </div>
  );
};
