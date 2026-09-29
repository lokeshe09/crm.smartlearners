import React, { useEffect, useMemo, useState } from 'react';
import {
  examAPI,
  TeacherExamAttemptResultItem,
  TeacherExamAttemptsResponse,
  TeacherExamItem,
  TeacherExamQuestionPerformanceItem,
  TeacherExamQuestionPerformanceResponse,
  TeacherExamsResponse,
} from '../services/api';
import T from '../theme/tokens';
import WorkspaceHeader from './WorkspaceHeader';
import {
  BANDS, BandKey, ExamRecord, attemptPct, bandMeta, bandOf, computeStats, normQuestionNo, previousComparable, questionCounts, recordAvg,
} from '../utils/examAnalytics';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts';
import { Avatar, BandGradients, bandFill, Card, ChartTooltip, DeltaBadge, InsightHero, NUM } from './AnalyticsKit';
import KaTeXText from './KaTeXText';
import { ExamInsightPanel, StudentFeedback, StudentTopicChart } from './ExamInsights';

const FONT = T.font.sans;
// Numbers and headings use the sans face (tabular) for a crisp dashboard look
const FONT_DISPLAY = T.font.sans;

interface ExamCorrectionPanelProps {
  data: TeacherExamsResponse | null;
  loading: boolean;
  /** Exams enriched with attempts + stats (from TeacherDashboard). */
  records?: ExamRecord[];
  /** When set, open this exam directly (e.g. jumped here from Analytics). */
  focusExamId?: number | null;
  onFocusHandled?: () => void;
}

const formatPercent = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return '—';
  return `${Number(value).toFixed(1)}%`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const getAttemptScoreObtained = (item: TeacherExamAttemptResultItem) => item.total_marks_obtained ?? item.score_obtained ?? null;
const getAttemptMaxScore = (item: TeacherExamAttemptResultItem) => item.total_max_marks ?? item.max_score ?? null;
const getQuestionObtainedMarks = (item: TeacherExamQuestionPerformanceItem) => item.obtained_marks ?? item.total_score ?? null;

const getQuestionRows = (data: TeacherExamQuestionPerformanceResponse | null): TeacherExamQuestionPerformanceItem[] => {
  if (!data) return [];
  if ((data.items?.length ?? 0) > 0) return data.items ?? [];
  if ((data.questions_evaluation?.length ?? 0) > 0) return data.questions_evaluation ?? [];
  return [];
};

/* ─── Shared UI atoms ─────────────────────────────────── */

const HeroCard: React.FC<{
  pill?: string;
  title: React.ReactNode;
  subtitle: string;
  counterLabel?: string;
  counterValue?: string;
  counterColor?: string;
  showArt?: boolean;
  backOnClick?: () => void;
}> = ({ pill, title, subtitle, counterLabel, counterValue, backOnClick }) => (
  <WorkspaceHeader eyebrow={pill} title={title} description={subtitle} onBack={backOnClick}
    actions={counterLabel && counterValue != null ? (
      <div className="sl-header-count"><span>{counterLabel}</span><strong>{counterValue}</strong></div>
    ) : undefined}
  />
);


const tableHeaderStyle: React.CSSProperties = {
  padding: '12px 16px', textAlign: 'left',
  fontSize: 11, fontWeight: 700, color: T.text.tertiary,
  textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
};

const tableCellStyle: React.CSSProperties = {
  padding: '14px 16px', color: T.text.secondary,
  fontSize: 13, verticalAlign: 'middle',
};

/* ─── Main component ──────────────────────────────────── */

const ExamCorrectionPanel: React.FC<ExamCorrectionPanelProps> = ({ data, loading, records = [], focusExamId, onFocusHandled }) => {
  const [selectedExam, setSelectedExam] = useState<TeacherExamItem | null>(null);
  const [examAttemptsData, setExamAttemptsData] = useState<TeacherExamAttemptsResponse | null>(null);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<TeacherExamAttemptResultItem | null>(null);
  const [questionPerformanceData, setQuestionPerformanceData] = useState<TeacherExamQuestionPerformanceResponse | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'high-score' | 'low-score' | 'most-students' | 'attention'>('newest');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [segment, setSegment] = useState<'all' | BandKey>('all');
  const [showCorrect, setShowCorrect] = useState(false);

  const examTime = (e: TeacherExamItem) => e.processed_at ?? e.created_at ?? '';

  const recordById = useMemo(() => new Map(records.map((r) => [r.id, r])), [records]);
  const isPending = (e: TeacherExamItem) => recordById.get(e.exam_id)?.pending ?? !(Number(e.total_students ?? 0) > 0);
  const passRateOf = (e: TeacherExamItem) => recordById.get(e.exam_id)?.stats?.passRate ?? null;

  const classOptions = useMemo(() => {
    const m = new Map<string, string>();
    records.forEach((r) => { if (!r.pending) m.set(r.classKey, r.classLabel); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }));
  }, [records]);
  const subjectOptions = useMemo(() => {
    const m = new Map<string, string>();
    records.forEach((r) => { if (!r.pending) m.set(r.subjectKey, r.subjectLabel); });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [records]);

  const filteredExams = useMemo(() => {
    const list = [...(data?.items ?? [])].filter((e) => {
      const rec = recordById.get(e.exam_id);
      if (classFilter !== 'all' && rec?.classKey !== classFilter) return false;
      if (subjectFilter !== 'all' && rec?.subjectKey !== subjectFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (e.name || e.exam_name || '').toLowerCase().includes(q);
    });

    const avgOf = (e: TeacherExamItem) => {
      const rec = recordById.get(e.exam_id);
      if (rec) return recordAvg(rec);
      return isPending(e) || e.average_score == null ? null : Number(e.average_score);
    };
    let sorted: TeacherExamItem[];
    switch (sortBy) {
      case 'oldest': sorted = list.sort((a, b) => examTime(a).localeCompare(examTime(b))); break;
      case 'high-score': sorted = list.sort((a, b) => (avgOf(b) ?? -1) - (avgOf(a) ?? -1)); break;
      case 'low-score': sorted = list.sort((a, b) => (avgOf(a) ?? 101) - (avgOf(b) ?? 101)); break;
      case 'most-students': sorted = list.sort((a, b) => (Number(b.total_students ?? 0)) - (Number(a.total_students ?? 0))); break;
      case 'attention': sorted = list.sort((a, b) => (passRateOf(a) ?? 101) - (passRateOf(b) ?? 101)); break;
      case 'newest':
      default: sorted = list.sort((a, b) => examTime(b).localeCompare(examTime(a)));
    }
    // Exams still awaiting results always sink to the bottom
    return [...sorted.filter((e) => !isPending(e)), ...sorted.filter((e) => isPending(e))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, sortBy, classFilter, subjectFilter, recordById]);

  const exams = useMemo(() => [...(data?.items ?? [])], [data]);

  const questionRows = useMemo(() => getQuestionRows(questionPerformanceData), [questionPerformanceData]);

  /* Exam-level derived data */
  const currentRecord = selectedExam ? recordById.get(selectedExam.exam_id) : undefined;
  const currentAttempts = useMemo(() => examAttemptsData?.items ?? [], [examAttemptsData]);
  const liveRecord: ExamRecord | undefined = useMemo(() => {
    if (!currentRecord) return undefined;
    if (currentRecord.stats && currentRecord.stats.n > 0) return currentRecord;
    return currentAttempts.length ? { ...currentRecord, attempts: currentAttempts, stats: computeStats(currentAttempts), pending: false } : currentRecord;
  }, [currentRecord, currentAttempts]);
  const prevRecord = useMemo(() => (liveRecord ? previousComparable(liveRecord, records) : null), [liveRecord, records]);
  const prevPctByStudent = useMemo(() => {
    const m = new Map<number, number>();
    (prevRecord?.attempts ?? []).forEach((a) => { const p = attemptPct(a); if (p != null) m.set(a.student_id, p); });
    return m;
  }, [prevRecord]);
  const commonMax = liveRecord?.stats?.commonMax ?? null;

  useEffect(() => { setSegment('all'); }, [selectedExam]);
  useEffect(() => { setShowCorrect(false); }, [selectedStudent]);

  /* Jump straight to an exam when asked (from Analytics) */
  useEffect(() => {
    if (focusExamId == null || !data) return;
    const exam = (data?.items ?? []).find((e) => e.exam_id === focusExamId);
    if (exam) openExamAnalytics(exam);
    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusExamId, data]);

  const openExamAnalytics = async (exam: TeacherExamItem) => {
    setSelectedExam(exam);
    setSelectedStudent(null);
    setQuestionPerformanceData(null);
    setExamAttemptsData(null);
    try {
      setAttemptsLoading(true);
      const response = await examAPI.getTeacherExamAttempts(exam.exam_id, 1000);
      setExamAttemptsData(response);
    } catch (error) {
      console.error('Failed to load exam analytics:', error);
      setExamAttemptsData({
        exam_id: exam.exam_id,
        exam_name: exam.name || exam.exam_name || `Exam #${exam.exam_id}`,
        exam_type: exam.exam_type,
        teacher_id: exam.teacher_id ?? 0,
        teacher_username: exam.teacher_username ?? '',
        teacher_name: exam.teacher_name ?? '',
        school_id: data?.school_id ?? 0,
        school_name: data?.school_name ?? '',
        school_code: data?.school_code ?? null,
        class_name: null, section_name: null,
        total_students: exam.total_students,
        average_score: exam.average_score,
        items: [],
      });
    } finally {
      setAttemptsLoading(false);
    }
  };

  const openStudentAnalytics = async (student: TeacherExamAttemptResultItem) => {
    if (!selectedExam) return;
    setSelectedStudent(student);
    setQuestionPerformanceData(null);
    try {
      setQuestionLoading(true);
      const response = await examAPI.getTeacherExamQuestionPerformance(selectedExam.exam_id, student.student_id, 200);
      setQuestionPerformanceData(response);
    } catch (error) {
      console.error('Failed to load question analytics:', error);
      setQuestionPerformanceData({
        exam_id: selectedExam.exam_id,
        exam_name: selectedExam.name || selectedExam.exam_name || `Exam #${selectedExam.exam_id}`,
        student_result_id: student.student_result_id, student_id: student.student_id,
        student_name: student.student_name, username: student.username,
        roll_number: student.roll_number ?? null,
        teacher_id: selectedExam.teacher_id ?? 0,
        teacher_username: selectedExam.teacher_username ?? '',
        teacher_name: selectedExam.teacher_name ?? '',
        school_id: data?.school_id ?? 0,
        school_name: data?.school_name ?? '',
        school_code: data?.school_code ?? null,
        class_name: student.class_name, section_name: student.section_name,
        total_questions: 0, items: [],
      });
    } finally {
      setQuestionLoading(false);
    }
  };

  const resetToExamList = () => {
    setSelectedExam(null); setExamAttemptsData(null);
    setSelectedStudent(null); setQuestionPerformanceData(null);
  };
  const resetToStudentList = () => {
    setSelectedStudent(null); setQuestionPerformanceData(null);
  };

  /* ─── Loading state ──────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 20, fontFamily: FONT }}>
        <div className="sl-skeleton" style={{ height: 180, borderRadius: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="sl-skeleton" style={{ height: 260, borderRadius: 20 }} />
          ))}
        </div>
      </div>
    );
  }

  /* ─── Question-level (student drill-in) view ────── */
  if (selectedExam && selectedStudent) {
    const examName = selectedExam.name || selectedExam.exam_name || `Exam #${selectedExam.exam_id}`;
    return (
      <div style={{ display: "grid", gap: 20, fontFamily: FONT }}>
        <InsightHero
          eyebrow="Student analytics"
          title={selectedStudent.student_name}
          insight={`Question-level performance for ${examName}. Review each question's marks, percentage, and gap analysis.`}
          onBack={resetToStudentList}
        />

        {/* Student mini profile card */}
        <Card padding="18px 22px" style={{ position: "relative", overflow: "hidden", boxShadow: "inset 5px 0 0 #6366F1, 0 1px 2px rgba(16,24,64,0.04), 0 12px 32px -18px rgba(16,24,64,0.18)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <Avatar name={selectedStudent.student_name} size={52} />
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.text.primary, letterSpacing: "-0.02em" }}>{selectedStudent.student_name}</div>
              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{ padding: "3px 9px", borderRadius: 7, background: T.color.brand.tint, color: T.color.brand[700], fontSize: 11, fontWeight: 800 }}>{examName}</span>
                {selectedStudent.class_name && <span style={{ padding: "3px 9px", borderRadius: 7, background: T.color.neutral[100], color: T.text.secondary, fontSize: 11, fontWeight: 700 }}>Class {selectedStudent.class_name}</span>}
                {selectedStudent.section_name && <span style={{ padding: "3px 9px", borderRadius: 7, background: T.color.neutral[100], color: T.text.secondary, fontSize: 11, fontWeight: 700 }}>Sec {selectedStudent.section_name}</span>}
                {selectedStudent.roll_number != null && <span style={{ padding: "3px 9px", borderRadius: 7, background: T.color.neutral[100], color: T.text.tertiary, fontSize: 11, fontWeight: 700 }}>Roll {selectedStudent.roll_number}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "stretch" }}>
              <button onClick={resetToExamList} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 12,
                border: "1px solid #E7E9F3", background: "#FFFFFF", color: T.text.secondary,
                fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: FONT,
              }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                All Exams
              </button>
              <div style={profilePill}>
                <div style={profilePillLabel}>Marks</div>
                <div style={{ ...NUM, fontSize: 18, fontWeight: 800, color: T.text.primary }}>{getAttemptScoreObtained(selectedStudent) ?? "—"} / {getAttemptMaxScore(selectedStudent) ?? "—"}</div>
              </div>
              <div style={{ ...profilePill, background: "linear-gradient(135deg, #EEF0FF, #E0E7FF)", borderColor: "#D5DAFE" }}>
                <div style={profilePillLabel}>Grade</div>
                <div style={{ ...NUM, fontSize: 18, fontWeight: 800, color: T.color.brand[700] }}>{String(selectedStudent.grade || "—")}</div>
              </div>
            </div>
          </div>
        </Card>

        {questionLoading ? (
          <CardShell><div style={{ textAlign: 'center', padding: '40px 0', color: T.text.tertiary }}>Loading question analytics…</div></CardShell>
        ) : questionRows.length === 0 ? (
          <CardShell><EmptyState title="No question-wise analytics" body="Detailed question analytics for this student haven't been processed yet." /></CardShell>
        ) : (() => {
          const isFull = (q: TeacherExamQuestionPerformanceItem) => {
            const max = Number(q.max_marks ?? 0);
            const got = Number(getQuestionObtainedMarks(q) ?? 0);
            return max > 0 ? got >= max : (q.percentage ?? 0) >= 100;
          };
          const countedRows = questionRows.filter(questionCounts);
          const gaps = [...countedRows.filter((q) => !isFull(q))].sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0));
          // Full-mark questions, then optional questions the student didn't choose
          const correct = [...countedRows.filter(isFull), ...questionRows.filter((q) => !questionCounts(q))];
          const unchosen = questionRows.length - countedRows.length;
          const visibleRows = showCorrect ? [...gaps, ...correct] : gaps;
          return (
          <>
          <StudentTopicChart questionRows={questionRows} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text.primary }}>
              Question analysis <span style={{ color: T.text.tertiary, fontWeight: 600, fontSize: 13 }}>· {gaps.length} question{gaps.length === 1 ? '' : 's'} lost marks, weakest first</span>
            </div>
          </div>
          <ResultsTable columns={['Question', 'Marks', 'Obtained', 'Percentage', 'Gap Analysis']}>
            {visibleRows.length === 0 && (
              <tr><td colSpan={5} style={{ ...tableCellStyle, textAlign: 'center', padding: '24px 16px', color: T.color.success.text, fontWeight: 700 }}>
                ✓ Every question answered with full marks — no gaps.
              </td></tr>
            )}
            {visibleRows.map((item, index) => {
              const p = item.percentage;
              const c = p == null ? T.text.tertiary : p >= 75 ? T.color.success.solid : p >= 50 ? T.color.warning.solid : T.color.danger.solid;
              const b = p == null ? T.color.neutral[100] : p >= 75 ? T.color.success.bg : p >= 50 ? T.color.warning.bg : T.color.danger.bg;
              const max = Number(item.max_marks ?? 0);
              const obtained = Number(getQuestionObtainedMarks(item) ?? 0);
              return (
                <tr key={String(item.id ?? item.question_number ?? index)} style={{
                  borderTop: `1px solid ${T.border.subtle}`,
                  background: '#FFFFFF',
                  transition: 'background 120ms',
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = T.color.neutral[25])}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                >
                  <td style={{ ...tableCellStyle, width: 90 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 44, height: 28, padding: '0 10px', borderRadius: 9,
                      background: 'linear-gradient(135deg, #7C3AED, #6366F1)', color: '#FFFFFF',
                      fontSize: 12.5, fontWeight: 800, letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums',
                      boxShadow: '0 6px 14px -8px rgba(67,56,202,0.8)',
                    }}>
                      Q{normQuestionNo(item.question_number)}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: T.text.primary, fontFamily: FONT_DISPLAY, letterSpacing: '-0.01em' }}>
                      {item.max_marks}
                    </span>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: c, fontFamily: FONT_DISPLAY, letterSpacing: '-0.01em' }}>
                        {getQuestionObtainedMarks(item) ?? '—'}
                      </span>
                      {max > 0 && <span style={{ fontSize: 11, color: T.text.tertiary, fontWeight: 600 }}>/ {max}</span>}
                    </div>
                  </td>
                  <td style={tableCellStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                      <div style={{ flex: 1, height: 8, borderRadius: 999, background: T.color.neutral[100], overflow: 'hidden', minWidth: 80 }}>
                        <div style={{
                          width: `${Math.max(0, Math.min(100, p ?? 0))}%`, height: '100%',
                          background: `linear-gradient(90deg, ${c}CC, ${c})`,
                          borderRadius: 999,
                          transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }} />
                      </div>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999,
                        background: b, color: c,
                        fontSize: 11, fontWeight: 800, minWidth: 54, textAlign: 'center',
                        border: `1px solid ${c}22`,
                      }}>{formatPercent(p)}</span>
                    </div>
                  </td>
                  <td style={{ ...tableCellStyle, minWidth: 320, lineHeight: 1.6, color: T.text.secondary, maxWidth: 460 }}>
                    {(item.error_type || (item.concepts_required?.length ?? 0) > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                        {item.error_type && (
                          <span style={{ padding: '1px 8px', borderRadius: 999, background: T.color.danger.bg, color: T.color.danger.text, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {String(item.error_type).replace(/_/g, ' ')}
                          </span>
                        )}
                        {(item.concepts_required ?? []).slice(0, 3).map((c, ci) => {
                          const label = typeof c === 'string' ? c : (c?.concept_name ?? (c as any)?.name ?? '');
                          return label ? (
                            <span key={ci} className="sl-rich" style={{ padding: '1px 8px', borderRadius: 999, background: T.color.brand.tint, color: T.color.brand[700], fontSize: 10, fontWeight: 700 }}><KaTeXText text={label} /></span>
                          ) : null;
                        })}
                      </div>
                    )}
                    {!questionCounts(item)
                      ? <span style={{ color: T.text.tertiary, fontStyle: 'italic' }}>Optional question — not chosen, not counted</span>
                      : item.gap_analysis
                        ? <span className="sl-rich" style={{ display: 'block' }}><KaTeXText text={item.gap_analysis} /></span>
                        : <span style={{ color: T.text.tertiary, fontStyle: 'italic' }}>{isFull(item) ? 'Full marks' : 'No gap identified'}</span>}
                  </td>
                </tr>
              );
            })}
            {correct.length > 0 && (
              <tr style={{ borderTop: `1px solid ${T.border.subtle}`, background: T.color.success.bg }}>
                <td colSpan={5} style={{ ...tableCellStyle, padding: '12px 16px' }}>
                  <button onClick={() => setShowCorrect((v) => !v)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer',
                    color: T.color.success.text, fontSize: 13, fontWeight: 700, fontFamily: FONT, padding: 0,
                  }}>
                    ✓ {correct.length - unchosen} question{correct.length - unchosen === 1 ? '' : 's'} with full marks
                    {unchosen > 0 && <span style={{ color: T.text.secondary, fontWeight: 600 }}>· {unchosen} optional not chosen</span>}
                    <span style={{ color: T.text.tertiary, fontWeight: 600 }}>· {showCorrect ? 'Hide' : 'Show'}</span>
                  </button>
                </td>
              </tr>
            )}
          </ResultsTable>
          <StudentFeedback attempt={selectedStudent} />
          </>
          );
        })()}
      </div>
    );
  }

  /* ─── Exam-level (students list) view ──────────── */
  if (selectedExam) {
    const attempts = examAttemptsData?.items ?? [];
    const examName = selectedExam.name || selectedExam.exam_name || `Exam #${selectedExam.exam_id}`;
    return (
      <div style={{ display: "grid", gap: 20, fontFamily: FONT }}>
        <InsightHero
          eyebrow="Exam results"
          title={examName}
          insight={`${liveRecord ? `${liveRecord.classLabel} · ${liveRecord.subjectLabel} · ` : ""}${(selectedExam.exam_type || "Exam")} · ${attempts.length || selectedExam.total_students || 0} student${attempts.length === 1 ? "" : "s"} · Processed ${formatDateTime(selectedExam.processed_at)}`}
          onBack={resetToExamList}
        />

        {attemptsLoading ? (
          <CardShell><div style={{ textAlign: 'center', padding: '40px 0', color: T.text.tertiary }}>Loading student results…</div></CardShell>
        ) : attempts.length === 0 ? (
          <CardShell><EmptyState title="No student results yet" body="Once students submit this exam, their scores will appear here." /></CardShell>
        ) : (() => {
          const ranked = [...attempts]
            .sort((a, b) => {
              const pa = attemptPct(a);
              const pb = attemptPct(b);
              // Nulls sink to the bottom
              if (pa == null && pb == null) return 0;
              if (pa == null) return 1;
              if (pb == null) return -1;
              return pb - pa;
            })
            .map((item, index) => ({ item, rank: index + 1 }));
          const segCounts = BANDS.reduce((acc, bd) => {
            acc[bd.key] = ranked.filter(({ item }) => { const p = attemptPct(item); return p != null && bandOf(p) === bd.key; }).length;
            return acc;
          }, {} as Record<BandKey, number>);
          const visible = segment === 'all' ? ranked : ranked.filter(({ item }) => { const p = attemptPct(item); return p != null && bandOf(p) === segment; });
          const MEDALS = ['linear-gradient(135deg, #FDE68A, #F59E0B)', 'linear-gradient(135deg, #F1F5F9, #94A3B8)', 'linear-gradient(135deg, #FED7AA, #EA580C)'];
          return (
          <>
          <ExamInsightPanel record={liveRecord} attempts={attempts} />

          <Card padding={0}>
            <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text.primary, letterSpacing: '-0.02em' }}>Student results</div>
                
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: 4, borderRadius: 12, background: '#F1F2F8' }}>
                {[{ key: 'all' as const, label: 'All', count: ranked.length, color: T.color.brand[600] }, ...BANDS.map((bd) => ({ key: bd.key, label: bd.label, count: segCounts[bd.key], color: bd.color }))].map((t) => {
                  const active = segment === t.key;
                  return (
                    <button key={t.key} onClick={() => setSegment(t.key)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 11px', borderRadius: 9, border: 'none',
                      background: active ? '#FFFFFF' : 'transparent', boxShadow: active ? '0 1px 3px rgba(16,24,64,0.12)' : 'none',
                      color: active ? T.text.primary : T.text.secondary, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                    }}>
                      {t.key !== 'all' && <span style={{ width: 8, height: 8, borderRadius: 2, background: t.color }} />}
                      {t.label}
                      <span style={{ ...NUM, padding: '0 6px', borderRadius: 999, background: active ? '#F1F2F8' : 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 800 }}>{t.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  <tr style={{ background: '#FAFAFE', borderTop: '1px solid #EEF0F7', borderBottom: '1px solid #EEF0F7' }}>
                    {['Rank', 'Student', 'Class · Section', 'Marks', 'Percentage', prevRecord ? `vs ${prevRecord.typeLabel}` : 'vs last exam', 'Grade', ''].map((h, i) => (
                      <th key={`${h}${i}`} style={{ ...tableHeaderStyle, padding: '12px 16px', fontSize: 10.5, textAlign: i === 7 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 && (
                    <tr><td colSpan={8} style={{ ...tableCellStyle, textAlign: 'center', padding: '24px 16px', color: T.text.tertiary }}>No students in this band.</td></tr>
                  )}
                  {visible.map(({ item, rank }) => {
                    const p = attemptPct(item);
                    const band = p == null ? null : bandMeta(bandOf(p));
                    const prevP = prevPctByStudent.get(item.student_id);
                    const itemMax = getAttemptMaxScore(item);
                    const differentPaper = commonMax != null && itemMax != null && Number(itemMax) !== Number(commonMax);
                    const cell: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: T.text.secondary, verticalAlign: 'middle', borderBottom: '1px solid #F1F2F8' };
                    return (
                      <tr key={item.student_result_id} className="sl-row" style={{ background: rank <= 3 ? 'linear-gradient(90deg, rgba(253,230,138,0.14), transparent 55%)' : '#FFFFFF', cursor: 'default' }}>
                        <td style={{ ...cell, width: 56 }}>
                          {rank <= 3 ? (
                            <span style={{ ...NUM, width: 28, height: 28, borderRadius: 999, background: MEDALS[rank - 1], color: rank === 2 ? '#1F2937' : rank === 1 ? '#78350F' : '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 800, boxShadow: '0 4px 10px -4px rgba(0,0,0,0.35)' }}>{rank}</span>
                          ) : (
                            <span style={{ ...NUM, display: 'inline-block', width: 28, textAlign: 'center', fontSize: 13, fontWeight: 700, color: T.text.tertiary }}>{rank}</span>
                          )}
                        </td>
                        <td style={cell}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary, letterSpacing: '-0.01em' }}>{item.student_name}</div>
                          {item.roll_number != null && (
                            <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 2, fontWeight: 600, letterSpacing: '0.02em' }}>ROLL · {item.roll_number}</div>
                          )}
                        </td>
                        <td style={cell}>
                          <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ padding: '3px 9px', borderRadius: 7, background: T.color.brand.tint, color: T.color.brand[700], fontSize: 11, fontWeight: 800 }}>{item.class_name || '—'}</span>
                            <span style={{ padding: '3px 9px', borderRadius: 7, background: T.color.neutral[100], color: T.text.secondary, fontSize: 11, fontWeight: 700 }}>Sec {item.section_name || '—'}</span>
                          </div>
                        </td>
                        <td style={cell}>
                          <span style={{ ...NUM, fontSize: 14, fontWeight: 800, color: T.text.primary }}>{getAttemptScoreObtained(item) ?? '—'}</span>
                          <span style={{ fontSize: 11.5, color: T.text.tertiary, fontWeight: 600 }}> / {itemMax ?? '—'}</span>
                          {differentPaper && (
                            <div title={`Most students were marked out of ${commonMax}. Check that this answer sheet was fully evaluated.`}
                              style={{ marginTop: 3, display: 'inline-block', padding: '1px 6px', borderRadius: 6, background: T.color.warning.bg, color: T.color.warning.text, fontSize: 10, fontWeight: 800, cursor: 'help' }}>
                              ⚠ out of {itemMax}, not {commonMax}
                            </div>
                          )}
                        </td>
                        <td style={{ ...cell, minWidth: 190 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, height: 6, borderRadius: 999, background: '#EEF0F7', overflow: 'hidden', minWidth: 90 }}>
                              <div style={{ width: `${Math.max(2, Math.min(100, p ?? 0))}%`, height: '100%', background: band?.color ?? T.color.neutral[300], borderRadius: 999 }} />
                            </div>
                            <span style={{ ...NUM, padding: '3px 10px', borderRadius: 999, background: band?.bg ?? T.color.neutral[100], color: band?.text ?? T.text.tertiary, fontSize: 12, fontWeight: 800, minWidth: 58, textAlign: 'center' }}>{formatPercent(p)}</span>
                          </div>
                        </td>
                        <td style={cell}>
                          {p != null && prevP != null
                            ? <DeltaBadge value={p - prevP} digits={0} />
                            : <span style={{ color: T.text.muted, fontSize: 12 }}>{prevRecord ? 'Absent' : '—'}</span>}
                        </td>
                        <td style={cell}>
                          {item.grade
                            ? <span style={{ ...NUM, display: 'inline-flex', minWidth: 32, justifyContent: 'center', padding: '5px 10px', borderRadius: 8, background: 'linear-gradient(135deg, #4F46E5, #4338CA)', color: '#FFFFFF', fontSize: 12.5, fontWeight: 800, boxShadow: '0 4px 10px -4px rgba(79,70,229,0.6)' }}>{item.grade}</span>
                            : <span style={{ color: T.text.tertiary }}>—</span>}
                        </td>
                        <td style={{ ...cell, textAlign: 'right' }}>
                          <button onClick={() => openStudentAnalytics(item)} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: 'none',
                            background: 'linear-gradient(135deg, #7C3AED, #6366F1)', color: '#FFFFFF',
                            fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: FONT, whiteSpace: 'nowrap',
                            boxShadow: '0 8px 16px -10px rgba(67,56,202,0.9)', transition: 'transform 150ms',
                          }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                          >
                            View Analytics
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          </>
          );
        })()}
      </div>
    );
  }


  /* ─── Empty state ────────────────────────────────── */
  if (exams.length === 0) {
    return (
      <div style={{ fontFamily: FONT }}>
        <HeroCard
          pill="Exam correction workspace"
          title={<>Exam Overview</>}
          subtitle="Choose an exam to see student results and question-wise analysis."
          counterLabel="TOTAL EXAMS"
          counterValue="0"
          showArt
        />
        <CardShell><EmptyState title="No corrected exams yet" body="Once exams are uploaded and processed, they'll appear here so you can review student performance and question-level gaps." /></CardShell>
      </div>
    );
  }

  /* ─── Overview ─── */
  return (
    <div style={{ display: 'grid', gap: 20, fontFamily: FONT }}>

      <InsightHero
        eyebrow="Exam correction workspace"
        title="Exam Overview"
        insight="Choose an exam to see student results and question-wise analysis."
        stats={[{ label: 'Total exams', value: String(data?.total_exams ?? exams.length) }]}
      />

      {/* Toolbar */}
      <Card padding="12px 16px">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: T.text.tertiary, fontWeight: 600 }}>
            Showing <span style={{ ...NUM, color: T.text.primary, fontWeight: 800, fontSize: 15 }}>{filteredExams.length}</span> of {exams.length} exams
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {classOptions.length > 1 && (
              <FilterSelect value={classFilter} onChange={setClassFilter}
                options={[{ value: 'all', label: 'All classes' }, ...classOptions.map(([k, l]) => ({ value: k, label: l }))]} />
            )}
            {subjectOptions.length > 1 && (
              <FilterSelect value={subjectFilter} onChange={setSubjectFilter}
                options={[{ value: 'all', label: 'All subjects' }, ...subjectOptions.map(([k, l]) => ({ value: k, label: l }))]} />
            )}
            <FilterSelect value={sortBy} onChange={(v) => setSortBy(v as any)} neutral
              options={[
                { value: 'newest', label: 'Sort: Newest first' },
                { value: 'oldest', label: 'Sort: Oldest first' },
                { value: 'high-score', label: 'Sort: Highest score' },
                { value: 'low-score', label: 'Sort: Lowest score' },
                { value: 'most-students', label: 'Sort: Most students' },
                { value: 'attention', label: 'Sort: Needs attention' },
              ]} />
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" fill="none" stroke={T.text.muted} strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exams…"
                style={{
                  width: 230, padding: '9px 12px 9px 34px', borderRadius: 10,
                  border: `1px solid ${T.border.subtle}`, background: '#FFFFFF',
                  fontSize: 13, fontFamily: FONT, color: T.text.primary, outline: 'none',
                  boxShadow: T.shadow.xs,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = T.color.brand[600]; e.currentTarget.style.boxShadow = T.shadow.focus; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = T.border.subtle; e.currentTarget.style.boxShadow = T.shadow.xs; }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Exam grid */}
      <div className="sl-stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 420px), 1fr))', gap: 20 }}>
        {filteredExams.map((exam, idx) => {
          const name = exam.name || exam.exam_name || `Exam #${exam.exam_id}`;
          const rec = recordById.get(exam.exam_id);
          const pending = isPending(exam);
          const avgScore = pending ? null : rec ? recordAvg(rec) : exam.average_score == null ? null : Number(exam.average_score);
          const type = exam.exam_type || 'Exam';
          const prev = rec && !pending ? previousComparable(rec, records) : null;
          const prevAvg = prev ? recordAvg(prev) : null;
          const stats = rec?.stats && rec.stats.n > 0 ? rec.stats : null;
          const studentCount = stats?.n ?? exam.total_students ?? 0;

          return (
            <div key={exam.exam_id} className="sl-lift sl-exam-card" style={{
              background: '#FFFFFF', borderRadius: 14, border: '1px solid #E7E9F3',
              boxShadow: '0 1px 2px rgba(16,24,64,0.04), 0 12px 32px -20px rgba(16,24,64,0.2)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              animation: `entrance-stagger 320ms ${T.motion.ease.spring} ${Math.min(idx, 20) * 35}ms both`,
            }}>
              {/* Gradient header band */}
              <div className="sl-exam-card-heading" style={{
                position: 'relative', overflow: 'hidden', padding: '18px 20px 18px',
                background: '#F8FAFD',
                color: '#18233D',
              }}>
                <span aria-hidden style={{ position: 'absolute', right: -30, top: -50, width: 140, height: 140, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }} />
                <span aria-hidden style={{ position: 'absolute', right: 70, bottom: -60, width: 110, height: 110, borderRadius: 999, background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                    background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.32)',
                    color: '#FFFFFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
                      <line x1="8" y1="13" x2="16" y2="13" strokeLinecap="round" />
                      <line x1="8" y1="17" x2="14" y2="17" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div title={name} style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 8px rgba(0,0,0,0.15)' }}>{name}</div>
                      <span style={{ ...NUM, fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', flexShrink: 0, padding: '2px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.16)' }}>#{exam.exam_id}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                      <span style={{ ...glassTag, background: 'rgba(255,255,255,0.95)', color: '#1E1B4B' }}>{type}</span>
                      {rec && rec.classKey !== 'unknown' && <span style={glassTag}>{rec.classLabel}</span>}
                      {rec && <span style={glassTag}>{rec.subjectLabel}</span>}
                      {rec?.supersededBy && (
                        <span title={`A newer upload of this ${rec.typeLabel} (${recordById.get(rec.supersededBy)?.name ?? ''}) is used in Analytics.`}
                          style={{ ...glassTag, background: '#FEF3C7', color: '#92400E', cursor: 'help' }}>
                          Older upload
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>

                {pending ? (
                  <div style={{ padding: '20px 16px', borderRadius: 14, textAlign: 'center', background: '#FAFAFE', border: '1px dashed #DADDEB' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: T.text.secondary }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: T.color.warning.solid, boxShadow: `0 0 0 4px ${T.color.warning.bg}` }} />
                      Awaiting results
                    </div>
                    <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 6, lineHeight: 1.5 }}>Answer sheets haven't been processed yet. Results will appear here automatically.</div>
                  </div>
                ) : (
                  <>
                    {/* Two mini-stat cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={miniStatBox}>
                        <div style={miniStatLabel}>
                          <span style={{ ...iconChip, background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" /></svg></span>
                          Total Students
                        </div>
                        <div style={{ ...NUM, fontSize: 30, fontWeight: 800, color: T.text.primary, lineHeight: 1 }}>{studentCount}</div>
                      </div>
                      <div style={miniStatBox}>
                        <div style={miniStatLabel}>
                          <span style={{ ...iconChip, background: 'linear-gradient(135deg, #14B8A6, #0EA5E9)' }}><svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                          Average Score
                        </div>
                        <div style={{ ...NUM, fontSize: 30, fontWeight: 800, lineHeight: 1, background: 'linear-gradient(135deg, #312E81, #6366F1)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{formatPercent(avgScore)}</div>
                        <div style={{ marginTop: 8, minHeight: 18 }}>
                          {prev && avgScore != null && prevAvg != null ? (
                            <span title={`Previous: ${prev.name} (${formatPercent(prevAvg)})`}><DeltaBadge value={avgScore - prevAvg} suffix={` vs ${prev.typeLabel}`} /></span>
                          ) : (
                            <span style={{ fontSize: 11, color: T.text.muted, fontWeight: 600 }}>First exam in series</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pass rate + score distribution */}
                    {stats && (
                      <div style={{ padding: '12px 14px 6px', borderRadius: 16, background: '#FAFAFE', border: '1px solid #EEF0F7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 12.5, color: T.text.secondary, fontWeight: 600 }}>
                            Pass rate <b style={{ ...NUM, color: T.text.primary, fontSize: 15 }}>{formatPercent(stats.passRate).replace('.0%', '%')}</b>
                          </span>
                          {stats.bands.support > 0 ? (
                            <span style={{ fontSize: 11, fontWeight: 800, color: T.color.danger.text, background: T.color.danger.bg, padding: '3px 9px', borderRadius: 999 }}>
                              {stats.bands.support} need support
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, fontWeight: 800, color: T.color.success.text, background: T.color.success.bg, padding: '3px 9px', borderRadius: 999 }}>
                              ✓ Everyone passed
                            </span>
                          )}
                        </div>
                        <BandMiniChart bands={stats.bands} total={stats.n} />
                      </div>
                    )}
                  </>
                )}

                {/* Processed at */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 12, borderTop: '1px solid #F1F2F8',
                  fontSize: 12, color: T.text.tertiary, fontWeight: 600, marginTop: 'auto',
                }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" /><line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Processed At
                  </span>
                  <span style={{ color: T.text.secondary, fontWeight: 700 }}>{formatDateTime(exam.processed_at)}</span>
                </div>

                {/* View Analytics button */}
                <button onClick={() => openExamAnalytics(exam)} style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  width: '100%', padding: '12px 16px', borderRadius: 14, border: 'none',
                  background: pending ? T.color.neutral[100] : 'linear-gradient(135deg, #7C3AED, #6366F1)',
                  color: pending ? T.text.secondary : '#FFFFFF',
                  fontSize: 14, fontWeight: 800, fontFamily: FONT, cursor: 'pointer',
                  boxShadow: pending ? 'none' : '0 12px 24px -12px rgba(124,58,237,0.75)',
                  transition: 'transform 150ms, box-shadow 180ms',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  View Analytics
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredExams.length === 0 && (
        <CardShell><EmptyState title="No exams match your search" body="Try a different keyword or clear the search to see all exams." /></CardShell>
      )}
    </div>
  );
};

const profilePill: React.CSSProperties = { padding: "9px 16px", borderRadius: 12, background: "#F8F9FE", border: "1px solid #EEF0F7" };
const profilePillLabel: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: T.text.tertiary, textTransform: "uppercase", letterSpacing: "0.08em" };

const glassTag: React.CSSProperties = {
  padding: '3px 9px', borderRadius: 7, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.03em',
  background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', color: '#FFFFFF',
};

const iconChip: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 8, color: '#FFFFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 6px 12px -6px rgba(79,70,229,0.7)',
};

const miniStatBox: React.CSSProperties = {
  padding: '14px 16px', borderRadius: 16,
  background: 'linear-gradient(180deg, #FFFFFF, #F8F9FE)', border: '1px solid #EEF0F7',
};
const miniStatLabel: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 10.5, fontWeight: 800, color: T.text.tertiary,
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
};


/* ─── Small helpers ───────────────────────────────── */

/** Score distribution for an exam card — one bar per performance band, with its % range underneath. */
const BandMiniChart: React.FC<{ bands: Record<BandKey, number>; total: number }> = ({ bands, total }) => {
  const data = BANDS.map((b) => ({ key: b.key, label: b.label, range: b.range, n: bands[b.key], color: b.color }));
  return (
    <div style={{ height: 150, marginTop: 6 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 0, bottom: 0, left: 0 }} barCategoryGap="22%">
          <BandGradients />
          <XAxis dataKey="label" axisLine={{ stroke: T.color.neutral[200] }} tickLine={false} interval={0} height={36}
            tick={(props: any) => {
              const { x, y, payload } = props;
              const b = data.find((d) => d.label === payload.value);
              return (
                <g transform={`translate(${x},${y})`}>
                  <text textAnchor="middle" dy={12} fontSize={10.5} fontWeight={700} fill={T.text.secondary} fontFamily={FONT}>{payload.value}</text>
                  <text textAnchor="middle" dy={25} fontSize={10} fontWeight={600} fill={T.text.tertiary} fontFamily={FONT}>{b?.range}</text>
                </g>
              );
            }} />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip cursor={{ fill: T.color.neutral[100] }}
            content={(props: any) => (
              <ChartTooltip {...props}
                title={(_, payload) => `${payload[0]?.payload?.label} (${payload[0]?.payload?.range})`}
                format={(v) => `${v} student${v === 1 ? '' : 's'} · ${total ? ((Number(v) / total) * 100).toFixed(0) : 0}%`} />
            )} />
          <Bar dataKey="n" name="Students" radius={[8, 8, 8, 8]} maxBarSize={40} isAnimationActive={false}
            background={{ fill: '#EEF0F8', radius: 8 } as any}>
            {data.map((d) => <Cell key={d.key} fill={bandFill(d.key as BandKey)} />)}
            <LabelList dataKey="n" position="top" style={{ fontSize: 11, fontWeight: 800, fill: T.text.primary, fontFamily: FONT }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const FilterSelect: React.FC<{ value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; neutral?: boolean }> = ({ value, onChange, options, neutral }) => (
  <div style={{ position: 'relative' }}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        appearance: 'none',
        padding: '9px 34px 9px 12px', borderRadius: 10,
        border: `1px solid ${neutral || value === 'all' ? T.border.subtle : T.color.brand[300]}`,
        background: neutral || value === 'all' ? '#FFFFFF' : T.color.brand[50],
        fontSize: 13, fontFamily: FONT, fontWeight: 600, color: T.text.primary, outline: 'none',
        boxShadow: T.shadow.xs, cursor: 'pointer',
      }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <svg width="12" height="12" fill="none" stroke={T.text.tertiary} strokeWidth="2.2" viewBox="0 0 24 24" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

const CardShell: React.FC<{ children: React.ReactNode; noPadding?: boolean; style?: React.CSSProperties }> = ({ children, noPadding, style }) => (
  <div style={{
    background: '#FFFFFF',
    borderRadius: 20,
    border: '1px solid #E7E9F3',
    boxShadow: '0 1px 2px rgba(16,24,64,0.04), 0 12px 32px -18px rgba(16,24,64,0.18)',
    overflow: 'hidden',
    padding: noPadding ? 0 : '22px 24px',
    ...style,
  }}>
    {children}
  </div>
);

/** Shared results table shell — clean, borderless header row, hover-friendly. */
const ResultsTable: React.FC<{
  columns: string[];
  rightAlignLast?: boolean;
  children: React.ReactNode;
}> = ({ columns, rightAlignLast, children }) => (
  <div style={{
    background: '#FFFFFF',
    borderRadius: 20,
    border: '1px solid #E7E9F3',
    boxShadow: '0 1px 2px rgba(16,24,64,0.04), 0 12px 32px -18px rgba(16,24,64,0.18)',
    overflow: 'hidden',
  }}>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
        <thead>
          <tr style={{
            background: '#FAFAFE',
            borderBottom: '1px solid #EEF0F7',
          }}>
            {columns.map((label, i) => (
              <th key={label || `c${i}`} style={{
                ...tableHeaderStyle,
                textAlign: rightAlignLast && i === columns.length - 1 ? 'right' : 'left',
                padding: '12px 16px', fontSize: 10.5,
              }}>{label || ''}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  </div>
);

const EmptyState: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div style={{ textAlign: 'center', padding: '32px 24px' }}>
    <div style={{ width: 52, height: 52, borderRadius: 14, background: T.color.brand.tint, color: T.color.brand[700], margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
    <div style={{ fontSize: 16, fontWeight: 700, color: T.text.primary, marginBottom: 6, fontFamily: FONT_DISPLAY, letterSpacing: '-0.01em' }}>{title}</div>
    <div style={{ fontSize: 13, color: T.text.tertiary, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>{body}</div>
  </div>
);

export default ExamCorrectionPanel;
