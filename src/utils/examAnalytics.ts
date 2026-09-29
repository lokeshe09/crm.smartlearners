import {
  TeacherExamAttemptResultItem,
  TeacherExamItem,
  TeacherExamQuestionPerformanceItem,
} from '../services/api';
import T from '../theme/tokens';

/**
 * Outcome analytics helpers shared by the Analytics page and Exam Correction.
 * Everything here is derived client-side from the teacher's exam list and the
 * per-exam attempts endpoint — no extra backend work required.
 */

export const PASS_MARK = 35;

export type AttemptsByExam = Record<number, TeacherExamAttemptResultItem[]>;

/* ─── Performance bands ─────────────────────────────── */

export type BandKey = 'support' | 'developing' | 'proficient' | 'excelling';

export const BANDS: { key: BandKey; label: string; range: string; min: number; color: string; text: string; bg: string }[] = [
  { key: 'support', label: 'Needs support', range: '< 35%', min: 0, color: T.color.danger.solid, text: T.color.danger.text, bg: T.color.danger.bg },
  { key: 'developing', label: 'Developing', range: '35–59%', min: 35, color: T.color.warning.solid, text: T.color.warning.text, bg: T.color.warning.bg },
  { key: 'proficient', label: 'Proficient', range: '60–79%', min: 60, color: T.color.info.solid, text: T.color.info.text, bg: T.color.info.bg },
  { key: 'excelling', label: 'Excelling', range: '≥ 80%', min: 80, color: T.color.success.solid, text: T.color.success.text, bg: T.color.success.bg },
];

export const bandOf = (pct: number): BandKey => {
  if (pct >= 80) return 'excelling';
  if (pct >= 60) return 'proficient';
  if (pct >= PASS_MARK) return 'developing';
  return 'support';
};

export const bandMeta = (key: BandKey) => BANDS.find((b) => b.key === key)!;

/* ─── Attempt accessors ─────────────────────────────── */

export const attemptObtained = (a: TeacherExamAttemptResultItem) => a.total_marks_obtained ?? a.score_obtained ?? null;
export const attemptMax = (a: TeacherExamAttemptResultItem) => a.total_max_marks ?? a.max_score ?? null;
export const attemptPct = (a: TeacherExamAttemptResultItem): number | null => {
  const p = a.overall_percentage ?? a.percentage;
  if (p != null && Number.isFinite(Number(p))) return Number(p);
  const o = attemptObtained(a);
  const m = attemptMax(a);
  if (o != null && m) return (Number(o) / Number(m)) * 100;
  return null;
};

export const questionObtained = (q: TeacherExamQuestionPerformanceItem) => q.obtained_marks ?? q.total_score ?? null;

/**
 * Canonical question number. Evaluations for different answer sheets can label
 * the same question "1", "1.", "Q1" or "q 1" — all become "1".
 */
export const normQuestionNo = (v: unknown) => {
  let s = String(v ?? '').trim().replace(/^(q(uestion)?\s*\.?\s*)+/i, '').replace(/[.:\s]+$/, '');
  if (s.endsWith(')') && !s.includes('(')) s = s.slice(0, -1).trim(); // "1)" -> "1", keep "4(a)"
  return s || String(v ?? '');
};

/** Optional questions the student didn't choose aren't gaps and don't count. */
export const questionCounts = (q: TeacherExamQuestionPerformanceItem) => {
  const x = q as any;
  return x.is_unchosen_choice !== true && x.counted !== false;
};

/* ─── Exam naming / grouping ───────────────────────── */

export const examName = (e: TeacherExamItem) => e.name || e.exam_name || `Exam #${e.exam_id}`;
export const examDate = (e: TeacherExamItem) => e.processed_at ?? e.created_at ?? '';

const normClass = (v?: string | null) => {
  if (!v) return '';
  const m = String(v).trim().match(/\d+/);
  return m ? m[0] : String(v).trim().replace(/^class\s+/i, '');
};
const normSection = (v?: string | null) => (v ? String(v).trim().replace(/^section\s+/i, '').toUpperCase() : '');

const SUBJECT_NAMES: Record<string, string> = {
  SOC: 'Social Studies', MAT: 'Maths', SCI: 'Science', ENG: 'English', PHY: 'Physics',
  CHE: 'Chemistry', BIO: 'Biology', HIN: 'Hindi', TEL: 'Telugu', COM: 'Computers',
  SAN: 'Sanskrit', GEO: 'Geography', HIS: 'History', ECO: 'Economics', CIV: 'Civics',
  EVS: 'EVS', GK: 'GK', PS: 'Physical Science', NS: 'Natural Science',
};

const TYPE_TOKEN = /^(FA|PT|SA|UT|CT|TERM|MID|FINAL|NEW|PRE|POST|UNIT|HY|ANNUAL|WEEK|TEST)\d*/i;
const CLASS_PREFIX = /^(\d{1,2}|X{0,1}(IX|IV|V?I{0,3})|X)[A-Z]?\d*$/i;
const ROMAN: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4', V: '5', VI: '6', VII: '7', VIII: '8', IX: '9', X: '10', XI: '11', XII: '12' };

/** Normalised subject key (first 3 letters) + a human label. */
export const examSubject = (e: TeacherExamItem): { key: string; label: string } => {
  const raw = (e.subject ?? '').trim();
  if (raw) {
    const letters = raw.replace(/[^A-Za-z]/g, '').toUpperCase();
    const key = letters.slice(0, 3) || raw.toUpperCase();
    return { key, label: SUBJECT_NAMES[key] ?? raw };
  }
  const tokens = examName(e).split(/[_\s]+/).filter(Boolean);
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (i === 0 && CLASS_PREFIX.test(tok)) continue; // class/section prefix like 9A3 or IXA3
    if (/^[A-Z]\d{0,2}$/i.test(tok)) continue;        // stray section token like "A3"
    if (TYPE_TOKEN.test(tok)) continue;
    const letters = tok.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (letters.length < 2) continue;
    const key = letters.slice(0, 3);
    return { key, label: SUBJECT_NAMES[key] ?? tok.replace(/\.+$/, '') };
  }
  return { key: 'GEN', label: 'General' };
};

/** Short assessment label used on chart axes, e.g. "FA-2". */
export const examTypeLabel = (e: TeacherExamItem) => {
  const t = (e.exam_type ?? '').trim();
  if (t) return t.toUpperCase().replace(/^([A-Z]+)\s*(\d+)$/, '$1-$2');
  const tok = examName(e).split(/[_\s]+/).find((x) => TYPE_TOKEN.test(x));
  if (tok) {
    const m = tok.toUpperCase().match(/^([A-Z]+?)(\d+)/);
    if (m) return `${m[1]}-${m[2]}`;
  }
  return 'Exam';
};

const mode = <V,>(values: V[]): V | undefined => {
  const counts = new Map<V, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best: V | undefined; let n = 0;
  counts.forEach((c, v) => { if (c > n) { n = c; best = v; } });
  return best;
};

/** Parse "9A3", "IXA3", "VIII A3", "10A4" style prefixes. */
const parseNamePrefix = (name: string) => {
  const m = name.trim().match(/^(\d{1,2}|XII|XI|IX|X|VIII|VII|VI|IV|V|III|II|I)\s*([A-Z]\d{0,2})?(?=[\s_\-.]|$)/i);
  if (!m) return null;
  const raw = m[1].toUpperCase();
  return { cls: ROMAN[raw] ?? raw, sec: (m[2] ?? '').toUpperCase() };
};

/**
 * Class-section of an exam. The key prefers the backend's teacher-section id
 * (exact), falling back to class|section; the label comes from attempts
 * (majority) or the exam name prefix (e.g. "9A3_…", "IXA3_…").
 */
export const examClassSection = (e: TeacherExamItem, attempts?: TeacherExamAttemptResultItem[]) => {
  let cls = '';
  let sec = '';
  if (attempts && attempts.length) {
    cls = mode(attempts.map((a) => normClass(a.class_name)).filter(Boolean)) ?? '';
    sec = mode(attempts.map((a) => normSection(a.section_name)).filter(Boolean)) ?? '';
  }
  if (!cls || !sec) {
    const p = parseNamePrefix(examName(e));
    if (p) {
      cls = cls || p.cls;
      sec = sec || p.sec;
    }
  }
  const label = cls ? (sec ? `Class ${cls} · ${sec}` : `Class ${cls}`) : 'Unassigned class';
  // techer_section_ref_id (sic, backend spelling) is unique per teacher-section;
  // class_section_id is not (it's shared across sections of a grade).
  const ref = e.techer_section_ref_id;
  if (ref != null) return { key: `ref:${ref}`, label };
  if (!cls) return { key: 'unknown', label };
  return { key: `${cls}|${sec}`, label };
};

/* ─── Stats ─────────────────────────────────────────── */

export interface ExamStats {
  n: number;
  avg: number | null;
  median: number | null;
  passRate: number | null;
  high: number | null;
  low: number | null;
  bands: Record<BandKey, number>;
  commonMax: number | null;
}

export const computeStats = (attempts: TeacherExamAttemptResultItem[]): ExamStats => {
  const pcts = attempts.map(attemptPct).filter((p): p is number => p != null).sort((a, b) => a - b);
  const bands: Record<BandKey, number> = { support: 0, developing: 0, proficient: 0, excelling: 0 };
  pcts.forEach((p) => { bands[bandOf(p)] += 1; });
  const n = pcts.length;
  const maxes = attempts.map(attemptMax).filter((m): m is number => m != null).map(Number);
  return {
    n,
    avg: n ? pcts.reduce((s, p) => s + p, 0) / n : null,
    median: n ? (n % 2 ? pcts[(n - 1) / 2] : (pcts[n / 2 - 1] + pcts[n / 2]) / 2) : null,
    passRate: n ? (pcts.filter((p) => p >= PASS_MARK).length / n) * 100 : null,
    high: n ? pcts[n - 1] : null,
    low: n ? pcts[0] : null,
    bands,
    commonMax: mode(maxes) ?? null,
  };
};

/* ─── Exam records ──────────────────────────────────── */

export interface ExamRecord {
  exam: TeacherExamItem;
  id: number;
  name: string;
  date: string;
  typeLabel: string;
  subjectKey: string;
  subjectLabel: string;
  classKey: string;
  classLabel: string;
  attempts: TeacherExamAttemptResultItem[] | null; // null = not loaded yet
  stats: ExamStats | null;
  /** True when the exam has no results yet (nothing processed). */
  pending: boolean;
  /** Set when a newer upload of the same assessment (class + subject + type) exists. */
  supersededBy: number | null;
}

/** Key identifying "the same assessment" — re-uploads of one paper share it. */
export const assessmentKey = (r: Pick<ExamRecord, 'classKey' | 'subjectKey' | 'typeLabel'>) => `${r.classKey}|${r.subjectKey}|${r.typeLabel}`;

export const buildExamRecords = (exams: TeacherExamItem[], attemptsByExam: AttemptsByExam): ExamRecord[] => {
  const records = buildRawRecords(exams, attemptsByExam);
  // Teachers often re-upload the same paper (e.g. "FA2", "FA2_NEW", "FA2 FINAL").
  // The latest upload with results is the one that counts.
  const latest = new Map<string, ExamRecord>();
  records.forEach((r) => {
    if (r.pending) return;
    const k = assessmentKey(r);
    const cur = latest.get(k);
    if (!cur || r.date > cur.date) latest.set(k, r);
  });
  return records.map((r) => {
    const winner = latest.get(assessmentKey(r));
    // Pending uploads are never "older" — they may be the newest attempt, just unprocessed.
    return { ...r, supersededBy: !r.pending && winner && winner.id !== r.id ? winner.id : null };
  });
};

const buildRawRecords = (exams: TeacherExamItem[], attemptsByExam: AttemptsByExam): ExamRecord[] =>
  exams.map((exam) => {
    const attempts = attemptsByExam[exam.exam_id] ?? null;
    const cs = examClassSection(exam, attempts ?? undefined);
    const sub = examSubject(exam);
    const stats = attempts ? computeStats(attempts) : null;
    const pending = attempts ? stats!.n === 0 : !(Number(exam.total_students ?? 0) > 0);
    return {
      exam,
      id: exam.exam_id,
      name: examName(exam),
      date: examDate(exam),
      typeLabel: examTypeLabel(exam),
      subjectKey: sub.key,
      subjectLabel: sub.label,
      classKey: cs.key,
      classLabel: cs.label,
      attempts,
      stats,
      pending,
      supersededBy: null,
    };
  });

/** Average to show for an exam — computed from attempts when available, else the API's value. */
export const recordAvg = (r: ExamRecord): number | null => {
  if (r.pending) return null;
  if (r.stats?.avg != null) return r.stats.avg;
  return r.exam.average_score == null ? null : Number(r.exam.average_score);
};

/**
 * The previous *assessment* for the same class-section and subject — i.e. an
 * earlier exam of a different type (FA-1 before FA-2). Re-uploads of the same
 * assessment are never compared with each other.
 */
export const previousComparable = (r: ExamRecord, all: ExamRecord[]): ExamRecord | null => {
  const candidates = all
    .filter((x) => x.id !== r.id && !x.pending && !x.supersededBy
      && x.classKey === r.classKey && x.subjectKey === r.subjectKey && x.typeLabel !== r.typeLabel
      && x.date && r.date && x.date < r.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return candidates[0] ?? null;
};

/* ─── Series across assessments ────────────────────── */

export interface AssessmentPoint {
  label: string;          // "FA-2"
  date: string;           // earliest date in the group — for ordering
  records: ExamRecord[];  // exams in this assessment (one per subject)
}

/**
 * Groups exams (already filtered to a class-section) into assessments by type label,
 * ordered chronologically. Within one subject + type the latest exam wins, which
 * handles re-uploads like "FA2_FINAL" vs "FA2_NEW".
 */
export const groupAssessments = (records: ExamRecord[]): AssessmentPoint[] => {
  const usable = records.filter((r) => !r.pending && r.attempts && r.attempts.length > 0);
  const bySubjectType = new Map<string, ExamRecord>();
  usable.forEach((r) => {
    const k = `${r.subjectKey}|${r.typeLabel}`;
    const prev = bySubjectType.get(k);
    if (!prev || r.date > prev.date) bySubjectType.set(k, r); // latest upload wins
  });
  const groups = new Map<string, AssessmentPoint>();
  bySubjectType.forEach((r) => {
    const g = groups.get(r.typeLabel) ?? { label: r.typeLabel, date: r.date, records: [] };
    g.records.push(r);
    if (r.date && (!g.date || r.date < g.date)) g.date = r.date;
    groups.set(r.typeLabel, g);
  });
  return Array.from(groups.values()).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
};

/** Pooled attempts for an assessment. */
export const pooledAttempts = (p: AssessmentPoint) => p.records.flatMap((r) => r.attempts ?? []);

/** A student's average % in one assessment (averaged across subjects present). */
export const studentPctIn = (p: AssessmentPoint, studentId: number): number | null => {
  const vals = p.records
    .map((r) => (r.attempts ?? []).find((a) => a.student_id === studentId))
    .map((a) => (a ? attemptPct(a) : null))
    .filter((v): v is number => v != null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
};

/** Top recurring strings in a list (e.g. areas_for_improvement), case-insensitive. */
export const topPhrases = (lists: (string[] | null | undefined)[], limit = 6) => {
  const counts = new Map<string, { label: string; n: number }>();
  lists.forEach((list) => {
    const seen = new Set<string>();
    (list ?? []).forEach((raw) => {
      const label = String(raw ?? '').trim().replace(/\.$/, '');
      if (!label) return;
      const k = label.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      const cur = counts.get(k) ?? { label, n: 0 };
      cur.n += 1;
      counts.set(k, cur);
    });
  });
  return Array.from(counts.values()).sort((a, b) => b.n - a.n).slice(0, limit);
};

export const asStringList = (v: unknown): string[] => {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => (typeof x === 'string' ? x : x?.concept_name ?? x?.name ?? '')).filter(Boolean);
  if (typeof v === 'string') return v.split(/\n|;|•/).map((s) => s.replace(/^[-*\d.)\s]+/, '').trim()).filter(Boolean);
  return [];
};

/* ─── Formatting ────────────────────────────────────── */

export const fmtPct = (v: number | null | undefined, digits = 1) =>
  v == null || !Number.isFinite(v) ? '—' : `${v.toFixed(digits)}%`;

export const fmtDelta = (v: number | null | undefined, digits = 1, unit = ' pts') =>
  v == null || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(digits)}${unit}`;

export const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

/** Colour for a change value; `higherIsBetter=false` flips it (e.g. students needing support). */
export const deltaTone = (v: number | null | undefined, higherIsBetter = true) => {
  if (v == null || Math.abs(v) < 0.05) return { color: T.text.tertiary, bg: T.color.neutral[100], arrow: '→' };
  const good = higherIsBetter ? v > 0 : v < 0;
  return good
    ? { color: T.color.success.text, bg: T.color.success.bg, arrow: v > 0 ? '▲' : '▼' }
    : { color: T.color.danger.text, bg: T.color.danger.bg, arrow: v > 0 ? '▲' : '▼' };
};

/** Load attempts for many exams with a small concurrency cap. */
export const loadAttemptsForExams = async (
  exams: TeacherExamItem[],
  fetcher: (examId: number) => Promise<TeacherExamAttemptResultItem[]>,
  onProgress?: (partial: AttemptsByExam) => void,
  concurrency = 5,
): Promise<AttemptsByExam> => {
  const out: AttemptsByExam = {};
  const queue = [...exams];
  const worker = async () => {
    while (queue.length) {
      const e = queue.shift()!;
      if (!(Number(e.total_students ?? 0) > 0)) { out[e.exam_id] = []; continue; }
      try {
        out[e.exam_id] = await fetcher(e.exam_id);
      } catch {
        out[e.exam_id] = [];
      }
      onProgress?.({ ...out });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, exams.length) }, worker));
  return out;
};
