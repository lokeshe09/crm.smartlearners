import React, { useEffect, useMemo, useState } from 'react';
import {
  examAPI,
  TeacherExamsResponse,
  WorksheetProgressQuestionItem,
  WorksheetProgressRequest,
  WorksheetProgressResponse,
  WorksheetProgressRow,
  WorksheetProgressSummary,
} from '../services/api';
import { StudentEngagementSummary } from '../types';
import DashboardIcon from './DashboardIcon';
import WorkspaceHeader from './WorkspaceHeader';

const FONT = '"Plus Jakarta Sans", system-ui, sans-serif';
const PAGE_SIZE = 50;

const C = {
  card: '#FFFFFF',
  cardAlt: '#F8FAFC',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  purple: '#4F46E5',
  purpleSoft: 'rgba(124,58,237,0.08)',
  green: '#10B981',
  greenSoft: 'rgba(16,185,129,0.10)',
  amber: '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.10)',
  blue: '#3B82F6',
  blueSoft: 'rgba(59,130,246,0.10)',
  red: '#EF4444',
  redSoft: 'rgba(239,68,68,0.10)',
  shadow: '0 3px 12px rgba(15,23,42,0.05)',
  shadowSoft: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
};

interface WorksheetProgressPanelProps {
  examsData: TeacherExamsResponse | null;
  examsLoading: boolean;
  students: StudentEngagementSummary[];
}

interface StudentGroup {
  student_id: number;
  student_name: string;
  username: string | null;
  class_name: string | null;
  section_name: string | null;
  summary: WorksheetProgressSummary;
  solved_percent: number;
  not_started_count: number;
  rows: WorksheetProgressRow[];
}

const controlLabelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '12px',
  fontWeight: 700,
  color: C.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 16px',
  borderRadius: '10px',
  border: `1px solid ${C.borderStrong}`,
  background: '#FFFFFF',
  color: C.text,
  fontSize: '13px',
  fontFamily: FONT,
  boxSizing: 'border-box',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
};

const secondaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 16px',
  borderRadius: '14px',
  border: `1px solid ${C.borderStrong}`,
  background: '#FFFFFF',
  color: C.textSecondary,
  fontSize: '14px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: FONT,
};

const questionActionButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px 18px',
  borderRadius: '16px',
  border: `1px solid rgba(124,58,237,0.22)`,
  background: '#FFFFFF',
  color: C.purple,
  fontSize: '14px',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: FONT,
  boxShadow: '0 10px 24px rgba(124,58,237,0.10)',
};

const primaryButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '13px 18px',
  borderRadius: '15px',
  border: `1px solid rgba(124,58,237,0.18)`,
  background: 'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(168,85,247,0.12))',
  color: C.purple,
  fontSize: '14px',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: FONT,
  boxShadow: C.shadowSoft,
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelativeSubmission = (value?: string | null, opened?: boolean) => {
  if (!opened) return 'Not started';
  if (!value) return 'Opened, no submission yet';
  return `Last submitted ${formatDateTime(value)}`;
};

const parseClassName = (value?: string | null) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  const numberMatch = trimmed.match(/\d+/);
  return numberMatch ? numberMatch[0] : trimmed.replace(/^class\s+/i, '');
};

const parseSectionName = (value?: string | null) => {
  if (!value) return '';
  return String(value).trim().replace(/^section\s+/i, '');
};

const percentColor = (value: number) => {
  if (value >= 70) return C.green;
  if (value >= 40) return C.amber;
  return C.red;
};

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

type CompletionBucket = 'completed' | 'partial' | 'not-completed';

const getCompletionBucket = (summary: WorksheetProgressSummary): CompletionBucket | null => {
  const total = Number(summary.total ?? 0);
  const solved = Number(summary.solved ?? 0);
  const attempted = Number(summary.attempted ?? 0);

  if (total <= 0) return null;
  if (solved >= total) return 'completed';
  if (solved > 0 || attempted > 0) return 'partial';
  return 'not-completed';
};

const getCompletionRank = (bucket: CompletionBucket | null) => {
  if (bucket === 'completed') return 0;
  if (bucket === 'partial') return 1;
  if (bucket === 'not-completed') return 2;
  return 3;
};

const isNearProgressTarget = (percent: number, target: number | null) => {
  if (target === null) return true;
  return Math.abs(clampPercent(percent) - target) <= 10;
};

const getInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '')
  .join('');

const getStatusTone = (percent: number, summary: WorksheetProgressSummary) => {
  if (percent >= 75 || Number(summary.solved ?? 0) >= Number(summary.total ?? 0)) {
    return {
      label: 'Excellent',
      color: C.green,
      soft: C.greenSoft,
      border: 'rgba(16,185,129,0.28)',
      icon: 'star',
    };
  }

  if (percent >= 30 || Number(summary.attempted ?? 0) > 0) {
    return {
      label: 'In Progress',
      color: C.amber,
      soft: C.amberSoft,
      border: 'rgba(245,158,11,0.24)',
      icon: 'activity',
    };
  }

  return {
    label: 'Needs Attention',
    color: C.red,
    soft: C.redSoft,
    border: 'rgba(239,68,68,0.22)',
    icon: 'alert',
  };
};

const getHeaderDateLabel = () => new Date().toLocaleDateString('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const getWorksheetStatusText = (summary: WorksheetProgressSummary, worksheetOpened?: boolean) => {
  const total = Number(summary.total ?? 0);
  const solved = Number(summary.solved ?? 0);
  const attempted = Number(summary.attempted ?? 0);
  const assigned = Number(summary.assigned ?? 0);

  if (total <= 0) return 'No worksheet recommendations available yet';
  if (solved >= total && total > 0) return 'All recommended questions are currently in solved status';
  if (attempted > 0) return `${attempted} question${attempted === 1 ? '' : 's'} still in progress`;
  if (assigned > 0 && solved > 0) return `${assigned} question${assigned === 1 ? '' : 's'} still assigned and waiting to be solved`;
  if (assigned > 0) return worksheetOpened ? 'Worksheet opened, but questions are still not solved' : 'Recommended questions are assigned but not solved yet';
  if (solved > 0) return 'Some recommended questions are solved';
  return worksheetOpened ? 'Worksheet opened, no progress recorded yet' : 'No recommended questions solved yet';
};


const asRecord = (value: any): Record<string, any> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, any>;
};

const pickFirstNumber = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
};

const formatMarkNumber = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');

const getQuestionMarksMeta = (item: WorksheetProgressQuestionItem) => {
  const breakdown = asRecord(item.score_breakdown);
  const snapshot = asRecord(item.ai_response_snapshot);

  const obtained = pickFirstNumber(
    item.obtained_marks,
    breakdown?.obtained_marks,
    breakdown?.score_obtained,
    breakdown?.marks_obtained,
    breakdown?.awarded_marks,
    breakdown?.total_score,
    snapshot?.obtained_marks,
    snapshot?.score_obtained,
    snapshot?.marks_obtained,
    snapshot?.awarded_marks,
    snapshot?.total_score,
  );

  const max = pickFirstNumber(
    item.question_marks,
    item.total_marks,
    breakdown?.question_marks,
    breakdown?.total_marks,
    breakdown?.max_marks,
    snapshot?.question_marks,
    snapshot?.total_marks,
    snapshot?.max_marks,
  );

  return { obtained, max };
};

const formatQuestionMarks = (item: WorksheetProgressQuestionItem) => {
  const { obtained, max } = getQuestionMarksMeta(item);
  if (obtained == null || max == null) return '-';
  return `${formatMarkNumber(obtained)}/${formatMarkNumber(max)}`;
};

const normalizeSubject = (value?: string | null) => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

const canonicalizeSubject = (value?: string | null) => {
  const normalized = normalizeSubject(value);
  if (!normalized) return '';
  if (['MATH', 'MATHS', 'MATHEMATICS'].includes(normalized)) return 'MATHEMATICS';
  if (['SCI', 'SCIENCE', 'GENERAL SCIENCE'].includes(normalized)) return 'SCIENCE';
  if (['ENG', 'ENGLISH'].includes(normalized)) return 'ENGLISH';
  if (['SST', 'SOCIAL', 'SOCIAL STUDIES'].includes(normalized)) return 'SOCIAL STUDIES';
  if (['EVS', 'ENVIRONMENTAL STUDIES'].includes(normalized)) return 'ENVIRONMENTAL STUDIES';
  if (['COMP', 'COMPUTER', 'COMPUTER SCIENCE'].includes(normalized)) return 'COMPUTER SCIENCE';
  return normalized;
};

const subjectMatches = (left?: string | null, right?: string | null) => {
  const a = canonicalizeSubject(left);
  const b = canonicalizeSubject(right);
  if (!a || !b) return false;
  return a === b;
};

const ProgressBar: React.FC<{ percent: number; tone?: string }> = ({ percent, tone }) => {
  const value = clampPercent(percent);
  const fill = tone ?? (value >= 70 ? C.green : value >= 30 ? C.amber : C.red);

  return (
    <div style={{ width: '100%', height: '10px', borderRadius: '999px', overflow: 'hidden', background: '#D7DEEE' }}>
      <div style={{ width: `${value}%`, height: '100%', borderRadius: '999px', background: fill, transition: 'width 0.25s ease' }} />
    </div>
  );
};

const WorksheetProgressPanel: React.FC<WorksheetProgressPanelProps> = ({ examsData, examsLoading, students }) => {
  const [scopeMode, setScopeMode] = useState<'exam' | 'class'>('exam');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [studentFilterId, setStudentFilterId] = useState<string>('');
  const [progressSliderValue, setProgressSliderValue] = useState(30);
  const [progressTarget, setProgressTarget] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [response, setResponse] = useState<WorksheetProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [activeWorksheetIndex, setActiveWorksheetIndex] = useState<number>(0);
  const [detailFilter, setDetailFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
  const [progressCache, setProgressCache] = useState<Record<number, WorksheetProgressQuestionItem[]>>({});
  const [progressLoadingRowId, setProgressLoadingRowId] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);


  const exams = useMemo(() => {
    return [...(examsData?.items ?? [])].sort((a, b) => (b.processed_at ?? b.created_at ?? '').localeCompare(a.processed_at ?? a.created_at ?? ''));
  }, [examsData]);

  const classOptions = useMemo(() => Array.from(new Set(
    students.map((student) => parseClassName(student.grade)).filter(Boolean),
  )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students]);

  const sectionOptions = useMemo(() => Array.from(new Set(
    students
      .filter((student) => !selectedClassName || parseClassName(student.grade) === selectedClassName)
      .map((student) => parseSectionName(student.section))
      .filter(Boolean),
  )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students, selectedClassName]);

  const filteredStudentOptions = useMemo(() => students
    .filter((student) => !selectedClassName || parseClassName(student.grade) === selectedClassName)
    .filter((student) => !selectedSection || parseSectionName(student.section) === selectedSection)
    .sort((a, b) => a.full_name.localeCompare(b.full_name)), [students, selectedClassName, selectedSection]);

  const subjectOptions = useMemo(() => {
    const labels = new Map<string, string>();
    [
      ...(exams.map((exam) => exam.subject).filter(Boolean) as string[]),
      ...((response?.rows ?? []).map((row) => row.exam?.subject).filter(Boolean) as string[]),
    ].forEach((subject) => {
      const canonical = canonicalizeSubject(subject);
      if (canonical && !labels.has(canonical)) labels.set(canonical, subject);
    });
    return Array.from(labels.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map((entry) => entry[1]);
  }, [exams, response]);

  const orderedExamOptions = useMemo(() => {
    const sortedExams = [...exams].sort((a, b) => (b.processed_at ?? b.created_at ?? '').localeCompare(a.processed_at ?? a.created_at ?? ''));
    if (!selectedSubject) return sortedExams;
    const matching: typeof sortedExams = [];
    const remaining: typeof sortedExams = [];
    sortedExams.forEach((exam) => {
      if (subjectMatches(exam.subject, selectedSubject)) matching.push(exam);
      else remaining.push(exam);
    });
    return [...matching, ...remaining];
  }, [exams, selectedSubject]);

  useEffect(() => {
    if (scopeMode === 'exam' && !selectedExamId && orderedExamOptions.length > 0) setSelectedExamId(orderedExamOptions[0].exam_id);
  }, [scopeMode, selectedExamId, orderedExamOptions]);

  useEffect(() => {
    if (scopeMode !== 'exam') return;
    if (selectedExamId && !orderedExamOptions.some((exam) => exam.exam_id === selectedExamId)) {
      setSelectedExamId(orderedExamOptions[0]?.exam_id ?? null);
    }
  }, [scopeMode, selectedExamId, orderedExamOptions]);

  useEffect(() => {
    if (scopeMode === 'class' && !selectedClassName && classOptions.length > 0) setSelectedClassName(classOptions[0]);
  }, [scopeMode, selectedClassName, classOptions]);

  useEffect(() => {
    if (scopeMode !== 'class' || !selectedClassName) return;
    if (!selectedSection && sectionOptions.length > 0) setSelectedSection(sectionOptions[0]);
    if (selectedSection && !sectionOptions.includes(selectedSection)) setSelectedSection(sectionOptions[0] ?? '');
  }, [scopeMode, selectedClassName, selectedSection, sectionOptions]);

  const requestParams = useMemo<WorksheetProgressRequest | null>(() => {
    const base: WorksheetProgressRequest = {
      page,
      page_size: PAGE_SIZE,
      include_progress: true,
      student_id: studentFilterId ? Number(studentFilterId) : undefined,
    };

    if (scopeMode === 'exam') {
      if (!selectedExamId) return null;
      return { ...base, exam_id: selectedExamId };
    }

    if (!selectedClassName || !selectedSection) return null;
    return { ...base, class_name: selectedClassName, section: selectedSection, subject: selectedSubject || undefined };
  }, [scopeMode, selectedExamId, selectedClassName, selectedSection, selectedSubject, studentFilterId, page]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      if (!requestParams) {
        setResponse(null);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const data = await examAPI.getWorksheetProgress(requestParams);
        if (!isCancelled) {
          setResponse(data);
          setExpandedRowId(null);
        }
      } catch (err: any) {
        if (!isCancelled) {
          const message = err?.response?.data?.detail || err?.message || 'Failed to load worksheet progress.';
          setError(message);
          setResponse(null);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    run();
    return () => {
      isCancelled = true;
    };
  }, [requestParams, refreshNonce]);

  const effectiveRows = useMemo(() => response?.rows ?? [], [response]);

  const sortedRows = useMemo(() => {
    const rows = [...effectiveRows]
      .filter((row) => Number(row.summary?.total ?? 0) > 0);

    return rows.sort((a, b) => {
      const rankDiff = getCompletionRank(getCompletionBucket(a.summary)) - getCompletionRank(getCompletionBucket(b.summary));
      if (rankDiff !== 0) return rankDiff;
      if (a.solved_percent !== b.solved_percent) return b.solved_percent - a.solved_percent;
      return a.student_name.localeCompare(b.student_name);
    });
  }, [effectiveRows]);

  const groupedRows = useMemo<StudentGroup[]>(() => {
    const groups = new Map<number, StudentGroup>();

    sortedRows.forEach((row) => {
      const existing = groups.get(row.student_id);
      if (!existing) {
        groups.set(row.student_id, {
          student_id: row.student_id,
          student_name: row.student_name,
          username: row.username,
          class_name: response?.scope.class_name ?? null,
          section_name: response?.scope.section ?? null,
          summary: { ...row.summary },
          solved_percent: row.solved_percent,
          not_started_count: row.worksheet_opened ? 0 : 1,
          rows: [row],
        });
        return;
      }

      existing.rows.push(row);
      existing.summary.total += Number(row.summary?.total ?? 0);
      existing.summary.assigned += Number(row.summary?.assigned ?? 0);
      existing.summary.attempted += Number(row.summary?.attempted ?? 0);
      existing.summary.solved += Number(row.summary?.solved ?? 0);
      existing.not_started_count += row.worksheet_opened ? 0 : 1;
      existing.solved_percent = existing.summary.total ? Math.round((existing.summary.solved / existing.summary.total) * 100) : 0;
    });

    return Array.from(groups.values()).sort((a, b) => {
      const rankDiff = getCompletionRank(getCompletionBucket(a.summary)) - getCompletionRank(getCompletionBucket(b.summary));
      if (rankDiff !== 0) return rankDiff;
      if (a.solved_percent !== b.solved_percent) return b.solved_percent - a.solved_percent;
      return a.student_name.localeCompare(b.student_name);
    });
  }, [sortedRows, response]);

  const visibleRows = useMemo(() => sortedRows.filter((row) => isNearProgressTarget(row.solved_percent, progressTarget)), [sortedRows, progressTarget]);

  const visibleGroups = useMemo(() => groupedRows.filter((group) => isNearProgressTarget(group.solved_percent, progressTarget)), [groupedRows, progressTarget]);

  const totalPages = useMemo(() => {
    const totalRows = response?.total_rows ?? 0;
    return totalRows > 0 ? Math.ceil(totalRows / PAGE_SIZE) : 1;
  }, [response]);

  const examLookup = useMemo(() => {
    const map = new Map<number, string>();
    exams.forEach((exam) => {
      map.set(exam.exam_id, exam.name || exam.exam_name || `Exam #${exam.exam_id}`);
    });
    return map;
  }, [exams]);

  const toggleScope = (nextScope: 'exam' | 'class') => {
    setScopeMode(nextScope);
    setPage(1);
    setExpandedRowId(null);
    setError('');
  };

  const handleExamChange = (value: string) => {
    setSelectedExamId(value ? Number(value) : null);
    setPage(1);
    setExpandedRowId(null);
  };

  const handleClassChange = (value: string) => {
    setSelectedClassName(value);
    setSelectedSection('');
    setStudentFilterId('');
    setPage(1);
    setExpandedRowId(null);
  };

  const handleSectionChange = (value: string) => {
    setSelectedSection(value);
    setStudentFilterId('');
    setPage(1);
    setExpandedRowId(null);
  };

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setStudentFilterId('');
    if (scopeMode === 'exam') {
      const sortedExams = [...exams].sort((a, b) => (b.processed_at ?? b.created_at ?? '').localeCompare(a.processed_at ?? a.created_at ?? ''));
      const matchingExams = !value ? sortedExams : sortedExams.filter((exam) => subjectMatches(exam.subject, value));
      const currentExamStillValid = sortedExams.some((exam) => exam.exam_id === selectedExamId);
      if (matchingExams.length > 0) {
        setSelectedExamId(matchingExams[0].exam_id);
      } else if (!currentExamStillValid) {
        setSelectedExamId(sortedExams[0]?.exam_id ?? null);
      }
    }
    setPage(1);
    setExpandedRowId(null);
    setProgressCache({});
  };

  const handleStudentChange = (value: string) => {
    setStudentFilterId(value);
    setPage(1);
    setExpandedRowId(null);
  };

  const handleProgressSliderChange = (value: string) => {
    const numeric = Number(value);
    setProgressSliderValue(numeric);
    setProgressTarget(numeric);
    setPage(1);
    setExpandedRowId(null);
  };

  const clearProgressFilter = () => {
    setProgressTarget(null);
    setExpandedRowId(null);
  };

  const handleRefresh = () => {
    setProgressCache({});
    setExpandedRowId(null);
    setRefreshNonce((current) => current + 1);
  };

  const handleExport = () => {
    const rows = scopeMode === 'exam'
      ? visibleRows.map((row) => [row.student_name, row.username ? `@${row.username}` : '-', clampPercent(row.solved_percent), row.summary.assigned, row.summary.attempted, row.summary.solved, formatDateTime(row.last_submitted_at)])
      : visibleGroups.map((group) => [group.student_name, group.username ? `@${group.username}` : '-', group.class_name ?? '-', group.section_name ?? '-', clampPercent(group.solved_percent), group.summary.assigned, group.summary.attempted, group.summary.solved]);

    const header = scopeMode === 'exam'
      ? ['Student Name', 'Username', 'Solved %', 'Assigned', 'Attempted', 'Solved', 'Last Submitted']
      : ['Student Name', 'Username', 'Class', 'Section', 'Solved %', 'Assigned', 'Attempted', 'Solved'];

    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `worksheet-progress-${scopeMode}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const loadRowProgress = async (row: WorksheetProgressRow) => {
    if (expandedRowId === row.student_result_id) {
      setExpandedRowId(null);
      return;
    }

    setExpandedRowId(row.student_result_id);
    if (row.progress) {
      setProgressCache((current) => ({ ...current, [row.student_result_id]: row.progress ?? [] }));
      return;
    }
    if (progressCache[row.student_result_id] || !requestParams) return;

    try {
      setProgressLoadingRowId(row.student_result_id);
      const data = await examAPI.getWorksheetProgress({
        ...requestParams,
        include_progress: true,
        page: 1,
        page_size: PAGE_SIZE,
      });
      const match = (data.rows ?? []).find((item) => item.student_result_id === row.student_result_id);
      setProgressCache((current) => ({ ...current, [row.student_result_id]: match?.progress ?? [] }));
    } catch (err) {
      console.error('Failed to load worksheet progress detail:', err);
      setProgressCache((current) => ({ ...current, [row.student_result_id]: [] }));
    } finally {
      setProgressLoadingRowId(null);
    }
  };

  const renderSummaryChips = (summary: WorksheetProgressSummary) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      <span style={{ ...chipStyle, background: '#EEF2F7', color: C.textSecondary }}>Assigned {summary.assigned}</span>
      <span style={{ ...chipStyle, background: C.amberSoft, color: C.amber }}>Attempted {summary.attempted}</span>
      <span style={{ ...chipStyle, background: C.greenSoft, color: C.green }}>Solved {summary.solved}</span>
    </div>
  );

  const renderProgressDetail = (row: WorksheetProgressRow) => {
    if (expandedRowId !== row.student_result_id) return null;
    if (progressLoadingRowId === row.student_result_id) {
      return <div style={{ padding: '16px 18px', color: C.textMuted, fontSize: '13px' }}>Loading question-level progress...</div>;
    }

    const progressItems = progressCache[row.student_result_id] ?? row.progress ?? [];
    if (progressItems.length === 0) {
      return <div style={{ padding: '16px 18px', color: C.textMuted, fontSize: '13px', borderTop: `1px solid ${C.border}` }}>No question-level worksheet progress found for this worksheet.</div>;
    }

    return (
      <div style={{ borderTop: `1px solid ${C.border}`, background: C.cardAlt }}>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: C.text }}>Question Progress</div>
          <div style={{ fontSize: '13px', color: C.textMuted, fontWeight: 700 }}>{progressItems.length} questions</div>
        </div>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', tableLayout: 'auto' }}>
            <thead>
              <tr style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: '#F8FAFC' }}>
                {['Question ID', 'Topic', 'Status', 'Submission Attempts', 'Marks', 'Last Submitted'].map((label) => (
                  <th key={label} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {progressItems.map((item, index) => {
                const marksText = formatQuestionMarks(item);
                const statusTone = item.status === 'solved' ? C.green : item.status === 'attempted' ? C.amber : C.textMuted;
                const statusBg = item.status === 'solved' ? C.greenSoft : item.status === 'attempted' ? C.amberSoft : '#EEF2F7';
                return (
                  <tr key={`${row.student_result_id}-${item.question_id}-${index}`} style={{ borderBottom: index < progressItems.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: C.text, fontWeight: 700, whiteSpace: 'nowrap' }}>{item.question_id}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: C.textSecondary, lineHeight: 1.5, minWidth: '260px' }}>{item.topic_name || '-'}</td>
                    <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                      <span style={{ ...chipStyle, background: statusBg, color: statusTone, textTransform: 'capitalize', padding: '8px 12px', fontSize: '12px', fontWeight: 800 }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: C.textSecondary, whiteSpace: 'nowrap' }}>{item.attempt_count ?? 0}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: C.textSecondary, fontWeight: 700, whiteSpace: 'nowrap' }}>{marksText}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: C.textSecondary, whiteSpace: 'nowrap' }}>{formatDateTime(item.last_submitted_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderWorksheetRow = (row: WorksheetProgressRow, showExamMeta: boolean, compactExamCard: boolean = false) => {
    const solvedPercent = clampPercent(row.solved_percent);
    const statusTone = getStatusTone(solvedPercent, row.summary);
    const examName = row.exam?.name || examLookup.get(row.exam?.id) || `Exam #${row.exam?.id ?? row.student_result_id}`;
    const titleText = compactExamCard ? examName : row.student_name;

    const metricBlock = (label: string, value: number, tone: 'assigned' | 'attempted' | 'solved') => {
      const config = tone === 'assigned'
        ? { color: C.purple, bg: C.purpleSoft }
        : tone === 'attempted'
          ? { color: C.amber, bg: C.amberSoft }
          : { color: C.green, bg: C.greenSoft };

      return (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 999,
          background: config.bg, color: config.color,
          fontSize: 11, fontWeight: 700,
          border: `1px solid ${config.color}22`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: config.color }} />
          {label}
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em' }}>{value}</span>
        </div>
      );
    };

    if (compactExamCard) {
      return (
        <div key={row.student_result_id} style={{
          background: C.card,
          borderRadius: '22px',
          border: `1px solid ${C.border}`,
          boxShadow: C.shadow,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: expandedRowId === row.student_result_id ? 'auto' : '430px',
          gridColumn: expandedRowId === row.student_result_id ? '1 / -1' : undefined,
        }}>
          <div style={{ padding: '20px 20px 16px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{titleText}</div>
                <div style={{ display: 'grid', gap: '10px', marginTop: '12px' }}>
                  {showExamMeta ? (
                    <div style={{ display: 'flex', gap: '10px', minHeight: '32px' }}>
                      <span style={{ ...chipStyle, padding: '7px 12px', background: C.purpleSoft, color: C.purple, fontSize: '12px', whiteSpace: 'nowrap' }}>{`Exam ID #${row.exam?.id ?? row.student_result_id}`}</span>
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap', minHeight: '32px' }}>
                    {row.exam?.subject ? <span style={{ ...chipStyle, padding: '7px 12px', background: '#EEF2FF', color: '#4338CA', fontSize: '12px', whiteSpace: 'nowrap' }}>{row.exam.subject}</span> : null}
                    {row.exam?.exam_date ? <span style={{ ...chipStyle, padding: '7px 12px', background: '#F8FAFC', color: C.textMuted, fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDate(row.exam.exam_date)}</span> : null}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', justifyItems: 'end', gap: '10px', minWidth: '110px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '999px', background: statusTone.soft, color: statusTone.color, fontSize: '12px', fontWeight: 800 }}>
                  <DashboardIcon name={statusTone.icon} size={13} color={statusTone.color} />
                  {statusTone.label === 'In Progress' ? 'In Progress' : statusTone.label}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: statusTone.color, lineHeight: 1 }}>{solvedPercent}%</div>
                  <div style={{ marginTop: '4px', fontSize: '12px', color: C.textSecondary, fontWeight: 700 }}>Solved</div>
                </div>
              </div>
            </div>

            <ProgressBar percent={solvedPercent} tone={statusTone.color} />

            <div style={{ display: 'grid', gap: '10px', alignContent: 'start', flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, lineHeight: 1.35 }}>
                {row.summary.solved} of {row.summary.total} solved
              </div>
              <div style={{ fontSize: '13px', color: row.summary.attempted > 0 ? C.amber : C.textSecondary, lineHeight: 1.6, minHeight: '42px' }}>
                {getWorksheetStatusText(row.summary, row.worksheet_opened)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: C.textMuted, fontWeight: 600 }}>
                <DashboardIcon name='clock' size={13} color={C.textMuted} />
                {formatRelativeSubmission(row.last_submitted_at, row.worksheet_opened)}
              </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'grid', gap: '16px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {metricBlock('Assigned', row.summary.assigned, 'assigned')}
                {metricBlock('Attempted', row.summary.attempted, 'attempted')}
                {metricBlock('Solved', row.summary.solved, 'solved')}
              </div>
              {row.summary.total > 0 ? (
                <button onClick={() => loadRowProgress(row)} style={{
                  ...questionActionButtonStyle,
                  alignSelf: 'center',
                  minWidth: '250px',
                  padding: '12px 20px',
                  background: expandedRowId === row.student_result_id ? C.purple : 'linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%)',
                  color: '#FFFFFF',
                  border: '1px solid transparent',
                }}>
                  <DashboardIcon name={expandedRowId === row.student_result_id ? 'chevDown' : 'monitor'} size={15} color='#FFFFFF' />
                  {expandedRowId === row.student_result_id ? 'Hide question progress' : 'View question progress'}
                </button>
              ) : null}
            </div>
          </div>
          {renderProgressDetail(row)}
        </div>
      );
    }

    // ─── Derive display values matching the reference image ───────────
    const isExcellent = solvedPercent >= 75;
    const isInProgress = solvedPercent > 0 && solvedPercent < 75;
    const ringColor = isExcellent ? C.green : isInProgress ? C.amber : C.red;
    const centerLabel = solvedPercent >= 100 ? 'Completed'
      : solvedPercent > 0 ? 'In Progress'
      : 'Not Started';

    const statusPill = isExcellent
      ? { label: 'Excellent', color: '#059669', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)' }
      : { label: 'Needs Attention', color: '#B45309', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)' };

    const description = isExcellent
      ? 'Excellent Performance! All questions solved accurately.'
      : isInProgress
        ? 'Keep going! You’re making progress.'
        : 'Get started by attempting the assigned questions.';

    // Deterministic avatar color per student
    const avatarPalette = ['#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#14B8A6'];
    const nameHash = (row.student_name || 'S').split('').reduce((h, c) => h + c.charCodeAt(0), 0);
    const avatarColor = avatarPalette[nameHash % avatarPalette.length];

    // Segmented progress bar count
    const segCount = 16;
    const totalCount = Math.max(row.summary.total, 1);
    const solvedSegs = Math.min(segCount, Math.round((row.summary.solved / totalCount) * segCount));

    const ringR = 38;
    const ringCirc = 2 * Math.PI * ringR;

    return (
      <div key={row.student_result_id} className="sl-worksheet-card" style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        boxShadow: C.shadowSoft,
        overflow: 'hidden',
        transition: 'transform 180ms, box-shadow 180ms, border-color 180ms',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.borderColor = ringColor + '44'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = C.shadowSoft; e.currentTarget.style.borderColor = C.border; }}
      >
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}>

          {/* ── Section 1: Avatar + name ─────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: '1 1 200px', minWidth: 180 }}>
            <div style={{
              width: 54, height: 54, borderRadius: 999,
              background: avatarColor, color: '#FFFFFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, letterSpacing: '0.02em',
              boxShadow: `0 4px 12px ${avatarColor}55`,
              flexShrink: 0,
            }}>
              {(titleText || 'S').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {titleText}
              </div>
              {row.username && (
                <div style={{ fontSize: 12, color: C.purple, fontWeight: 600, marginTop: 3 }}>
                  @{row.username}
                </div>
              )}
              {row.exam?.subject && (
                <div style={{
                  fontSize: 10, color: C.purple, fontWeight: 700,
                  marginTop: 4, letterSpacing: '0.10em', textTransform: 'uppercase',
                }}>
                  {row.exam.subject}
                </div>
              )}
            </div>
          </div>

          {/* ── Section 2: Circular ring gauge ───────────────── */}
          <div style={{
            position: 'relative',
            width: 100, height: 100,
            flex: '0 0 100px',
          }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={ringR} fill="none" stroke="#F1F5F9" strokeWidth="8" />
              <circle
                cx="50" cy="50" r={ringR}
                fill="none"
                stroke={ringColor}
                strokeWidth="8"
                strokeDasharray={ringCirc}
                strokeDashoffset={(1 - solvedPercent / 100) * ringCirc}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                fontSize: 22, fontWeight: 800, color: C.text,
                fontFamily: FONT,
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>{solvedPercent}%</div>
              <div style={{
                marginTop: 4,
                fontSize: 10, fontWeight: 700, color: ringColor,
                letterSpacing: '0.02em',
              }}>{centerLabel}</div>
            </div>
          </div>

          {/* ── Section 3: Status pill + description ─────────── */}
          <div style={{ flex: '1 1 200px', minWidth: 180 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 999,
              background: statusPill.bg,
              color: statusPill.color,
              border: `1px solid ${statusPill.border}`,
              fontSize: 12, fontWeight: 700,
              marginBottom: 8,
            }}>
              {isExcellent ? (
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M12 9v4M12 17h.01M4.93 19.07l14.14-14.14M5 5l14 14" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {statusPill.label}
            </div>
            <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.55, fontWeight: 500 }}>
              {description}
            </div>
          </div>

          {/* ── Section 4: Metrics + segmented bar ───────────── */}
          <div style={{ flex: '1.5 1 300px', minWidth: 280 }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 10 }}>
              {[
                {
                  label: 'Assigned', value: row.summary.assigned,
                  color: C.purple, bg: C.purpleSoft,
                  icon: (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 9h6M9 13h6M9 17h4" strokeLinecap="round" />
                    </svg>
                  ),
                },
                {
                  label: 'Attempted', value: row.summary.attempted,
                  color: C.amber, bg: C.amberSoft,
                  icon: (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M6 2h12M6 22h12M6 2v6l6 4-6 4v6M18 2v6l-6 4 6 4v6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  label: 'Solved', value: row.summary.solved,
                  color: C.green, bg: C.greenSoft,
                  icon: (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
              ].map((m) => (
                <div key={m.label} style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: m.bg, color: m.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{m.icon}</div>
                    <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 700 }}>{m.label}</span>
                  </div>
                  <div style={{
                    marginLeft: 4,
                    fontSize: 20, fontWeight: 800, color: C.text,
                    fontFamily: FONT,
                    letterSpacing: '-0.01em', lineHeight: 1,
                  }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Segmented progress bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                {Array.from({ length: segCount }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 10, borderRadius: 2,
                    background: i < solvedSegs ? ringColor : '#E5E7EB',
                    transition: 'background 240ms ease',
                  }} />
                ))}
              </div>
              <span style={{
                fontSize: 11, color: C.textMuted, fontWeight: 700,
                whiteSpace: 'nowrap', letterSpacing: '0.02em',
              }}>
                {row.summary.solved} / {row.summary.total} Completed
              </span>
            </div>
          </div>

          {/* ── Section 5: Last Activity + View Details ────── */}
          <div style={{ flex: '0 0 150px', textAlign: 'right' }}>
            <div style={{
              fontSize: 11, color: C.textMuted, fontWeight: 700,
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: 4,
            }}>Last Activity</div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontWeight: 600, lineHeight: 1.4 }}>
              {row.last_submitted_at
                ? new Date(row.last_submitted_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Not started yet'}
            </div>
            {row.summary.total > 0 && (
              <button onClick={() => loadRowProgress(row)} style={{
                marginTop: 10,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 10,
                border: `1px solid ${expandedRowId === row.student_result_id ? 'transparent' : 'rgba(124,58,237,0.28)'}`,
                background: expandedRowId === row.student_result_id ? 'linear-gradient(135deg, #6366F1, #4338CA)' : '#FFFFFF',
                color: expandedRowId === row.student_result_id ? '#FFFFFF' : C.purple,
                fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                boxShadow: expandedRowId === row.student_result_id ? '0 4px 10px rgba(79,70,229,0.28)' : 'none',
                transition: 'all 150ms',
              }}>
                {expandedRowId === row.student_result_id ? 'Hide' : 'View Details'}
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
        {renderProgressDetail(row)}
      </div>
    );
  };

  /* ─── Detailed worksheet view (used by both class-mode groups and exam-mode single rows) ─── */
  const renderGroupDetail = (group: StudentGroup, onBackOverride?: () => void) => {
    const totalWs = group.rows.length;
    const safeIdx = Math.max(0, Math.min(activeWorksheetIndex, totalWs - 1));
    const currentRow = group.rows[safeIdx];
    if (!currentRow) return null;

    const examTitle = currentRow.exam?.name || examLookup.get(currentRow.exam?.id) || `Exam #${currentRow.exam?.id ?? currentRow.student_result_id}`;
    const examId = currentRow.exam?.id ?? currentRow.student_result_id;

    const progressItems = progressCache[currentRow.student_result_id] ?? currentRow.progress ?? [];
    const solvedCount = progressItems.filter((q) => q.status === 'solved').length;
    const unsolvedCount = progressItems.filter((q) => q.status !== 'solved').length;
    const filteredItems = progressItems.filter((q) => {
      if (detailFilter === 'solved') return q.status === 'solved';
      if (detailFilter === 'unsolved') return q.status !== 'solved';
      return true;
    });

    const currentSolved = currentRow.summary.solved ?? 0;
    const currentTotal = currentRow.summary.total ?? 0;
    const currentWorksheetPct = currentTotal > 0 ? Math.round((currentSolved / currentTotal) * 100) : 0;

    // ─── Topic-wise aggregation ───────────────────────────
    const topicMap = new Map<string, { total: number; solved: number; attempted: number }>();
    progressItems.forEach((q) => {
      const name = (q.topic_name || '').trim() || 'Untagged';
      const cur = topicMap.get(name) ?? { total: 0, solved: 0, attempted: 0 };
      cur.total += 1;
      if (q.status === 'solved') cur.solved += 1;
      else if (q.status === 'attempted') cur.attempted += 1;
      topicMap.set(name, cur);
    });
    const topicStats = Array.from(topicMap.entries())
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        solved: stats.solved,
        attempted: stats.attempted,
        pct: stats.total > 0 ? Math.round((stats.solved / stats.total) * 100) : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    const goToWorksheet = (i: number) => {
      const next = Math.max(0, Math.min(totalWs - 1, i));
      setActiveWorksheetIndex(next);
    };

    const filterPills = [
      { key: 'all', label: 'All', count: progressItems.length, color: C.purple, bg: C.purpleSoft },
      { key: 'solved', label: 'Solved', count: solvedCount, color: C.green, bg: C.greenSoft },
      { key: 'unsolved', label: 'Unsolved', count: unsolvedCount, color: C.red, bg: C.redSoft },
    ] as const;

    return (
      <div style={{ display: 'grid', gap: 14 }}>

        {/* ── Top bar: breadcrumb + navigation arrows ── */}
        <div style={{
          background: '#FFFFFF',
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '14px 18px',
          boxShadow: C.shadowSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <button
              onClick={() => (onBackOverride ? onBackOverride() : setExpandedGroupId(null))}
              aria-label="Back"
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: '#F1F5F9', border: 'none',
                color: C.textSecondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#E2E8F0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>{group.student_name}</span>
            <svg width="14" height="14" fill="none" stroke={C.textMuted} strokeWidth="2.4" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span style={{ fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>{examTitle}</span>
            <span style={{
              padding: '3px 10px', borderRadius: 999,
              background: C.purpleSoft, color: C.purple,
              fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
              flexShrink: 0,
            }}>Exam ID #{examId}</span>
          </div>

          {/* Navigation arrows + dots (only when multiple worksheets) */}
          {totalWs > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <button
              onClick={() => goToWorksheet(safeIdx - 1)}
              disabled={safeIdx === 0}
              aria-label="Previous worksheet"
              style={{
                width: 34, height: 34, borderRadius: 999,
                background: safeIdx === 0 ? '#F1F5F9' : '#FFFFFF',
                border: `1px solid ${C.border}`,
                color: safeIdx === 0 ? C.textMuted : C.text,
                cursor: safeIdx === 0 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: safeIdx === 0 ? 0.5 : 1,
                boxShadow: safeIdx === 0 ? 'none' : C.shadowSoft,
                transition: 'all 150ms',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {group.rows.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToWorksheet(i)}
                  aria-label={`Go to worksheet ${i + 1}`}
                  style={{
                    width: i === safeIdx ? 22 : 8, height: 8, borderRadius: 999, border: 'none',
                    background: i === safeIdx ? C.purple : '#CBD5E1',
                    cursor: 'pointer', padding: 0,
                    transition: 'width 200ms cubic-bezier(0.16, 1, 0.3, 1), background 150ms',
                  }}
                />
              ))}
            </div>
            <button
              onClick={() => goToWorksheet(safeIdx + 1)}
              disabled={safeIdx === totalWs - 1}
              aria-label="Next worksheet"
              style={{
                width: 34, height: 34, borderRadius: 999,
                background: safeIdx === totalWs - 1 ? '#F1F5F9' : '#FFFFFF',
                border: `1px solid ${C.border}`,
                color: safeIdx === totalWs - 1 ? C.textMuted : C.text,
                cursor: safeIdx === totalWs - 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: safeIdx === totalWs - 1 ? 0.5 : 1,
                boxShadow: safeIdx === totalWs - 1 ? 'none' : C.shadowSoft,
                transition: 'all 150ms',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          )}
        </div>

        {/* ── Tabs row + Date + Export ── */}
        <div style={{
          background: '#FFFFFF',
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: '10px 16px',
          boxShadow: C.shadowSoft,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {([
              { key: 'question-progress', label: 'Question Progress', icon: 'M9.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.5M12 2l10 10-6 6L6 8l6-6z' },
              { key: 'performance-analytics', label: 'Performance Analytics', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
            ] as const).map((t) => {
              const active = t.key === 'question-progress';
              return (
                <div
                  key={t.key}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'transparent',
                    color: active ? C.purple : C.textMuted,
                    fontSize: 13, fontWeight: 700, fontFamily: FONT,
                    cursor: active ? 'default' : 'not-allowed',
                    position: 'relative',
                    transition: 'color 150ms',
                    opacity: active ? 1 : 0.6,
                  }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d={t.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t.label}
                  {active && <span style={{ position: 'absolute', left: 12, right: 12, bottom: -1, height: 3, borderRadius: 999, background: C.purple }} />}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 10,
              background: '#FFFFFF', border: `1px solid ${C.border}`,
              color: C.text, fontSize: 12, fontWeight: 700,
              boxShadow: C.shadowSoft,
            }}>
              <svg width="14" height="14" fill="none" stroke={C.textSecondary} strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                <line x1="3" y1="10" x2="21" y2="10" strokeLinecap="round" />
              </svg>
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            <button
              onClick={handleExport}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '9px 16px', borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: '#FFFFFF', color: C.text,
                fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                boxShadow: C.shadowSoft,
                transition: 'all 150ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Export Report
            </button>
          </div>
        </div>

        {/* ── Overall Progress Metric Strip (blue ring) ── */}
        {(() => {
          const totalQ = currentRow.summary.total ?? 0;
          const solvedQ = currentRow.summary.solved ?? 0;
          const attemptedQ = currentRow.summary.attempted ?? 0;
          const unsolvedQ = Math.max(0, totalQ - solvedQ - attemptedQ);
          const overallPct = totalQ > 0 ? Math.round((solvedQ / totalQ) * 100) : 0;
          const solvedPct = totalQ > 0 ? Math.round((solvedQ / totalQ) * 100) : 0;
          const inProgressPct = totalQ > 0 ? Math.round((attemptedQ / totalQ) * 100) : 0;
          const unsolvedPct = totalQ > 0 ? Math.round((unsolvedQ / totalQ) * 100) : 0;
          const RING_R = 40;
          const RING_C = 2 * Math.PI * RING_R;
          const RING_BLUE = C.purple;

          return (
            <div style={{
              background: '#FFFFFF',
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: '20px 24px',
              boxShadow: C.shadowSoft,
              display: 'grid',
              gap: 14,
            }}>
              {/* Stats row + Ring */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center', flex: 1 }}>
                  {/* Worksheet name */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.02em', marginBottom: 4 }}>Worksheet</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.01em', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={examTitle}>
                      {examTitle}
                    </div>
                  </div>

                  {/* Total */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.02em', marginBottom: 4 }}>Total Questions</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: C.text, fontFamily: FONT, letterSpacing: '-0.02em', lineHeight: 1 }}>
                      {totalQ}
                    </div>
                  </div>

                  {/* Solved */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 999,
                      background: C.greenSoft, color: C.green,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.02em' }}>Solved</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: FONT, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                        {solvedQ} <span style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, fontFamily: FONT }}>({solvedPct}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* In Progress */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 999,
                      background: C.amberSoft, color: C.amber,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2h12M6 22h12M6 2v6l6 4-6 4v6M18 2v6l-6 4 6 4v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.02em' }}>In Progress</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: FONT, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                        {attemptedQ} <span style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, fontFamily: FONT }}>({inProgressPct}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Unsolved */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 999,
                      background: C.redSoft, color: C.red,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" strokeLinecap="round" /><line x1="17" y1="8" x2="22" y2="13" strokeLinecap="round" /><line x1="22" y1="8" x2="17" y2="13" strokeLinecap="round" /></svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: '0.02em' }}>Unsolved</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: C.text, fontFamily: FONT, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                        {unsolvedQ} <span style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, fontFamily: FONT }}>({unsolvedPct}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Blue/Purple Overall Ring */}
                <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
                  <svg width="108" height="108" viewBox="0 0 108 108">
                    <circle cx="54" cy="54" r={RING_R} fill="none" stroke="#F1F5F9" strokeWidth="8" />
                    <circle
                      cx="54" cy="54" r={RING_R}
                      fill="none" stroke={RING_BLUE} strokeWidth="8"
                      strokeDasharray={RING_C}
                      strokeDashoffset={(1 - overallPct / 100) * RING_C}
                      strokeLinecap="round"
                      transform="rotate(-90 54 54)"
                      style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                    />
                  </svg>
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <div style={{
                      fontSize: 22, fontWeight: 800, color: C.text,
                      fontFamily: FONT,
                      letterSpacing: '-0.02em', lineHeight: 1,
                    }}>{overallPct}%</div>
                    <div style={{
                      marginTop: 3,
                      fontSize: 9, fontWeight: 700, color: C.textMuted,
                      letterSpacing: '0.02em', textAlign: 'center',
                    }}>Overall<br />Completion</div>
                  </div>
                </div>
              </div>

              {/* Overall progress bar */}
              <div>
                <div style={{ height: 10, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{
                    width: `${overallPct}%`, height: '100%',
                    background: `linear-gradient(90deg, ${RING_BLUE}CC, ${RING_BLUE})`,
                    borderRadius: 999,
                    transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }} />
                </div>
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: C.textSecondary }}>
                  {solvedQ} of {totalQ} questions solved
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Topic-wise Performance ─────────────────────── */}
        {topicStats.length > 0 && progressLoadingRowId !== currentRow.student_result_id && (
          <div style={{
            background: '#FFFFFF',
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '18px 20px',
            boxShadow: C.shadowSoft,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.14), rgba(59,130,246,0.14))',
                  color: C.purple,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>
                    Topic-wise Performance
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, marginTop: 2 }}>
                    Completion aggregated per topic across the {progressItems.length} question{progressItems.length === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 700, color: C.textSecondary }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: C.green }} /> Mastered
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: '#F59E0B' }} /> In Progress
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: C.red }} /> Needs Work
                </span>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}>
              {topicStats.map((t, ti) => {
                // Color thresholds: >=60% green, 30-60% orange, <30% red
                const tone = t.pct >= 60
                  ? { color: C.green, bg: 'rgba(16,185,129,0.08)', ring: 'rgba(16,185,129,0.28)', label: 'Mastered', labelColor: C.green, labelBg: C.greenSoft }
                  : t.pct >= 30
                    ? { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', ring: 'rgba(245,158,11,0.28)', label: 'In Progress', labelColor: C.amber, labelBg: C.amberSoft }
                    : { color: C.red, bg: 'rgba(239,68,68,0.08)', ring: 'rgba(239,68,68,0.28)', label: 'Needs Work', labelColor: C.red, labelBg: C.redSoft };

                const R = 24;
                const CIRC = 2 * Math.PI * R;

                return (
                  <div key={t.name + ti} style={{
                    background: '#FFFFFF',
                    borderRadius: 14,
                    border: `1px solid ${C.border}`,
                    padding: '14px 16px',
                    transition: 'transform 150ms, box-shadow 150ms, border-color 150ms',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.borderColor = tone.ring; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = C.border; }}
                  >
                    {/* Top row: topic name + small ring */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0, flex: 1 }}>
                        <span style={{
                          width: 8, height: 8, borderRadius: 999, background: tone.color, flexShrink: 0,
                          marginTop: 6,
                        }} />
                        <span style={{
                          fontSize: 14, fontWeight: 700, color: C.text, lineHeight: 1.3,
                          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }} title={t.name}>{t.name}</span>
                      </div>
                      {/* Small ring gauge with percentage */}
                      <div style={{ position: 'relative', width: 62, height: 62, flexShrink: 0 }}>
                        <svg width="62" height="62" viewBox="0 0 62 62">
                          <circle cx="31" cy="31" r={R} fill="none" stroke="#F1F5F9" strokeWidth="5" />
                          <circle
                            cx="31" cy="31" r={R}
                            fill="none" stroke={tone.color} strokeWidth="5"
                            strokeDasharray={CIRC}
                            strokeDashoffset={(1 - t.pct / 100) * CIRC}
                            strokeLinecap="round"
                            transform="rotate(-90 31 31)"
                            style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                          />
                        </svg>
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 14, fontWeight: 800, color: tone.color,
                          fontFamily: FONT,
                          letterSpacing: '-0.02em',
                        }}>{t.pct}%</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 6, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden', marginBottom: 10 }}>
                      <div style={{
                        width: `${t.pct}%`, height: '100%',
                        background: tone.color,
                        borderRadius: 999,
                        transition: 'width 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                      }} />
                    </div>

                    {/* Bottom row: solved count + status pill */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary }}>
                        {t.solved} / {t.total} Solved
                      </span>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999,
                        background: tone.labelBg, color: tone.labelColor,
                        border: `1px solid ${tone.ring}`,
                        fontSize: 11, fontWeight: 700,
                      }}>{tone.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Questions in this Worksheet section (title + filters) ── */}
        {progressLoadingRowId !== currentRow.student_result_id && progressItems.length > 0 && (
          <div style={{
            background: '#FFFFFF',
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: '18px 20px',
            boxShadow: C.shadowSoft,
            display: 'flex', flexWrap: 'wrap', gap: 14,
            alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>
                Questions in this Worksheet
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginTop: 2 }}>
                Detailed question-level progress
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {(() => {
                const attemptedCount = progressItems.filter(q => q.status === 'attempted').length;
                const pending = progressItems.length - solvedCount - attemptedCount;
                const filters = [
                  { key: 'all', label: 'All', count: progressItems.length, color: C.purple, bg: C.purpleSoft, icon: null },
                  { key: 'solved', label: 'Solved', count: solvedCount, color: C.green, bg: C.greenSoft, icon: (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) },
                  { key: 'attempted', label: 'In Progress', count: attemptedCount, color: C.amber, bg: C.amberSoft, icon: (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M6 2h12M6 22h12M6 2v6l6 4-6 4v6M18 2v6l-6 4 6 4v6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) },
                  { key: 'unsolved', label: 'Unsolved', count: pending, color: C.red, bg: C.redSoft, icon: (
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" /><path d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" strokeLinecap="round" /><line x1="17" y1="8" x2="22" y2="13" strokeLinecap="round" /><line x1="22" y1="8" x2="17" y2="13" strokeLinecap="round" /></svg>
                  ) },
                ] as const;
                return filters.map((f) => {
                  const active = detailFilter === f.key || (f.key === 'attempted' && detailFilter === 'unsolved' && attemptedCount === 0);
                  return (
                    <button
                      key={f.key}
                      onClick={() => {
                        if (f.key === 'attempted') setDetailFilter('unsolved');
                        else setDetailFilter(f.key as any);
                      }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 999,
                        border: `1px solid ${active ? f.color : f.color + '44'}`,
                        background: active ? f.color : f.bg,
                        color: active ? '#FFFFFF' : f.color,
                        fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                        boxShadow: active ? `0 4px 10px ${f.color}44` : 'none',
                        transition: 'all 150ms',
                      }}
                    >
                      {f.icon}
                      {f.label} ({f.count})
                    </button>
                  );
                });
              })()}
              <button
                aria-label="Filter"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', borderRadius: 10,
                  border: `1px solid ${C.border}`, background: '#FFFFFF',
                  color: C.text, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  boxShadow: C.shadowSoft,
                }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Filter
              </button>
            </div>
          </div>
        )}

        {/* ── Question Progress table — attractive & modern ── */}
        {progressLoadingRowId === currentRow.student_result_id ? (
          <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: 'center', color: C.textMuted, boxShadow: C.shadowSoft }}>
            Loading question progress…
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: 'center', color: C.textMuted, boxShadow: C.shadowSoft }}>
            {progressItems.length === 0 ? 'No question progress available for this worksheet yet.' : 'No questions match the selected filter.'}
          </div>
        ) : (
          <div style={{
            background: '#FFFFFF', border: `1px solid ${C.border}`, borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 8px 24px -8px rgba(15,23,42,0.10)',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                <thead>
                  <tr style={{
                    background: `linear-gradient(180deg, ${C.purpleSoft}, rgba(124,58,237,0.04))`,
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    {['Q. ID', 'Topic', 'Status', 'Attempts', 'Marks', 'Last Submitted', 'Action'].map((label, i) => (
                      <th key={label} style={{
                        padding: '14px 20px',
                        textAlign: i === 6 ? 'right' : 'left',
                        fontSize: 11, fontWeight: 700, color: C.purple,
                        textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap',
                      }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, index) => {
                    const marksText = formatQuestionMarks(item);
                    const solved = item.status === 'solved';
                    const attempted = item.status === 'attempted';
                    const stColor = solved ? C.green : attempted ? C.amber : '#94A3B8';
                    const stBg = solved ? 'rgba(16,185,129,0.10)' : attempted ? 'rgba(245,158,11,0.10)' : '#F1F5F9';
                    const stBorder = solved ? 'rgba(16,185,129,0.28)' : attempted ? 'rgba(245,158,11,0.28)' : 'rgba(148,163,184,0.28)';
                    const marksMeta = getQuestionMarksMeta(item);
                    const marksPct = marksMeta.obtained != null && marksMeta.max != null && marksMeta.max > 0
                      ? Math.round((marksMeta.obtained / marksMeta.max) * 100)
                      : null;
                    const marksColor = marksPct == null ? C.textSecondary
                      : marksPct >= 100 ? C.green
                      : marksPct >= 50 ? C.amber
                      : C.red;

                    return (
                      <tr key={`${currentRow.student_result_id}-${item.question_id}-${index}`}
                        style={{
                          borderTop: `1px solid ${C.border}`,
                          background: index % 2 === 0 ? '#FFFFFF' : '#FBFBFD',
                          transition: 'background 120ms, box-shadow 120ms',
                          position: 'relative',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = C.purpleSoft)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = index % 2 === 0 ? '#FFFFFF' : '#FBFBFD')}
                      >
                        {/* Question ID */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 10,
                          }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10,
                              background: `linear-gradient(135deg, ${C.purple}, #4338CA)`,
                              color: '#FFFFFF',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 800,
                              boxShadow: `0 4px 10px rgba(79,70,229,0.28)`,
                            }}>Q</div>
                            <div style={{
                              fontSize: 15, fontWeight: 800, color: C.text,
                              fontFamily: FONT,
                              letterSpacing: '-0.02em',
                            }}>{item.question_id}</div>
                          </div>
                        </td>

                        {/* Topic */}
                        <td style={{ padding: '16px 20px', fontSize: 13, color: C.text, lineHeight: 1.5, minWidth: 240, fontWeight: 600 }}>
                          {item.topic_name || <span style={{ color: C.textMuted, fontStyle: 'italic', fontWeight: 500 }}>Untagged</span>}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 999,
                            background: stBg, color: stColor,
                            border: `1px solid ${stBorder}`,
                            fontSize: 12, fontWeight: 700, textTransform: 'capitalize',
                          }}>
                            {solved ? (
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : attempted ? (
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            ) : (
                              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
                            )}
                            {item.status || 'pending'}
                          </span>
                        </td>

                        {/* Attempts */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          {(item.attempt_count ?? 0) > 0 ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: 26, height: 26, padding: '0 8px', borderRadius: 8,
                                background: '#F1F5F9', color: C.text,
                                fontSize: 13, fontWeight: 800, fontFamily: FONT,
                                letterSpacing: '-0.01em',
                              }}>{item.attempt_count}</span>
                              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Best attempt</span>
                            </div>
                          ) : (
                            <span style={{ color: C.textMuted, fontSize: 12, fontWeight: 500 }}>—</span>
                          )}
                        </td>

                        {/* Marks — with mini gradient bar */}
                        <td style={{ padding: '16px 20px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 110 }}>
                            <span style={{
                              fontSize: 15, fontWeight: 800, color: marksColor,
                              fontFamily: FONT,
                              letterSpacing: '-0.01em',
                            }}>{marksText}</span>
                            {marksPct != null && marksMeta.max != null && marksMeta.max > 0 && (
                              <div style={{ width: 40, height: 4, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
                                <div style={{
                                  width: `${marksPct}%`, height: '100%',
                                  background: `linear-gradient(90deg, ${marksColor}CC, ${marksColor})`,
                                  borderRadius: 999,
                                }} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Last Submitted */}
                        <td style={{ padding: '16px 20px', fontSize: 12, color: C.textSecondary, whiteSpace: 'nowrap', fontWeight: 600 }}>
                          {item.last_submitted_at ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <svg width="12" height="12" fill="none" stroke={C.textMuted} strokeWidth="2" viewBox="0 0 24 24">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
                                <line x1="8" y1="2" x2="8" y2="6" strokeLinecap="round" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {formatDateTime(item.last_submitted_at)}
                            </div>
                          ) : (
                            <span style={{ color: C.textMuted, fontStyle: 'italic', fontWeight: 500 }}>Not submitted</span>
                          )}
                        </td>

                        {/* Action */}
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button
                            aria-label={`View question ${item.question_id}`}
                            style={{
                              width: 32, height: 32, borderRadius: 8, border: 'none',
                              background: C.purpleSoft, color: C.purple,
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', transition: 'background 150ms',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.20)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = C.purpleSoft; }}
                          >
                            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinecap="round" strokeLinejoin="round" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };


  /* ─── Compact per-student card for By Exam mode ─── */
  const renderExamCompactCard = (row: WorksheetProgressRow, idx: number) => {
    const solvedPercent = clampPercent(row.solved_percent);
    const isExcellent = solvedPercent >= 75;
    const isMidHigh = solvedPercent >= 50 && solvedPercent < 75;
    const isMidLow = solvedPercent > 0 && solvedPercent < 50;
    const isNotStarted = solvedPercent === 0;

    const ringColor = isExcellent ? C.green
      : isMidHigh ? C.blue
      : isMidLow ? C.amber
      : '#94A3B8';

    const centerLabel = solvedPercent >= 100 ? 'Completed'
      : solvedPercent > 0 ? 'Solved'
      : 'Solved';

    // Status pill
    const statusPill = isExcellent
      ? { label: 'Excellent', color: '#059669', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)' }
      : isMidHigh
        ? { label: 'In Progress', color: '#2563EB', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.28)' }
        : isMidLow
          ? { label: 'Needs Attention', color: '#B45309', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.28)' }
          : { label: 'Not Started', color: '#475569', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.28)' };

    // Alternating violet/blue accent for button/avatar
    const CARD_ACCENTS = [
      { solid: '#7C3AED', grad: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', soft: 'rgba(124,58,237,0.10)' },
      { solid: '#3B82F6', grad: 'linear-gradient(135deg, #60A5FA, #2563EB)', soft: 'rgba(59,130,246,0.10)' },
    ];
    const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];

    const ringR = 42;
    const ringCirc = 2 * Math.PI * ringR;

    const classSection = [
      response?.scope.class_name ? `Class ${response.scope.class_name}` : null,
      response?.scope.section ? response.scope.section : null,
    ].filter(Boolean).join(' - ');

    return (
      <div key={row.student_result_id} className="sl-worksheet-card" style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        boxShadow: C.shadowSoft,
        overflow: 'hidden',
        transition: 'transform 180ms, box-shadow 180ms, border-color 180ms',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.borderColor = accent.solid + '44'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = C.shadowSoft; e.currentTarget.style.borderColor = C.border; }}
      >
        {/* Header: name + class + status pill */}
        <div style={{ padding: '18px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                {row.student_name}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: C.textSecondary, fontWeight: 600 }}>
                {row.username && <span style={{ color: C.purple }}>@{row.username}</span>}
                {row.username && classSection && <span style={{ color: C.textMuted }}> · </span>}
                {classSection && <span>{classSection}</span>}
              </div>
              {row.exam?.subject && (
                <div style={{
                  marginTop: 3, fontSize: 10, color: accent.solid, fontWeight: 700,
                  letterSpacing: '0.10em', textTransform: 'uppercase',
                }}>{row.exam.subject}</div>
              )}
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 999,
            background: statusPill.bg, color: statusPill.color,
            border: `1px solid ${statusPill.border}`,
            fontSize: 11, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
            marginTop: 2,
          }}>
            {isExcellent ? (
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : isMidHigh ? (
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : isMidLow ? (
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {statusPill.label}
          </span>
        </div>

        {/* Ring + 3 metrics row */}
        <div style={{ padding: '14px 18px 6px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
            <svg width="108" height="108" viewBox="0 0 108 108">
              <circle cx="54" cy="54" r={ringR} fill="none" stroke="#F1F5F9" strokeWidth="8" />
              <circle
                cx="54" cy="54" r={ringR}
                fill="none" stroke={ringColor} strokeWidth="8"
                strokeDasharray={ringCirc}
                strokeDashoffset={(1 - solvedPercent / 100) * ringCirc}
                strokeLinecap="round"
                transform="rotate(-90 54 54)"
                style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}>
              <div style={{
                fontSize: 22, fontWeight: 800, color: C.text,
                fontFamily: FONT,
                letterSpacing: '-0.02em', lineHeight: 1,
              }}>{solvedPercent}%</div>
              <div style={{
                marginTop: 3,
                fontSize: 10, fontWeight: 700, color: ringColor,
                letterSpacing: '0.02em',
              }}>{centerLabel}</div>
            </div>
          </div>

          {/* 3 metrics stacked */}
          <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
            {[
              {
                label: 'Assigned', value: row.summary.assigned,
                color: C.purple, bg: C.purpleSoft,
                icon: (<svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 9h6M9 13h6M9 17h4" strokeLinecap="round" /></svg>),
              },
              {
                label: 'Attempted', value: row.summary.attempted,
                color: C.amber, bg: C.amberSoft,
                icon: (<svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2h12M6 22h12M6 2v6l6 4-6 4v6M18 2v6l-6 4 6 4v6" strokeLinecap="round" strokeLinejoin="round" /></svg>),
              },
              {
                label: 'Solved', value: row.summary.solved,
                color: C.green, bg: C.greenSoft,
                icon: (<svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>),
              },
            ].map((m) => (
              <div key={m.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                padding: '5px 10px', borderRadius: 10, background: '#F8FAFC', border: `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: m.bg, color: m.color, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{m.icon}</div>
                  <span style={{ fontSize: 11, color: C.textSecondary, fontWeight: 700 }}>{m.label}</span>
                </div>
                <span style={{
                  fontSize: 16, fontWeight: 800, color: C.text,
                  fontFamily: FONT,
                  letterSpacing: '-0.01em', lineHeight: 1,
                }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '6px 18px 8px' }}>
          <div style={{ height: 8, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
            <div style={{
              width: `${solvedPercent}%`, height: '100%',
              background: `linear-gradient(90deg, ${ringColor}CC, ${ringColor})`,
              borderRadius: 999,
              transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
            }} />
          </div>
          <div style={{
            marginTop: 6, textAlign: 'center',
            fontSize: 12, fontWeight: 600, color: C.textSecondary,
          }}>
            {row.summary.solved} of {row.summary.total} questions solved
          </div>
        </div>

        {/* Last Activity strip */}
        <div style={{
          padding: '8px 18px', margin: '0 14px', borderRadius: 10,
          background: '#F8FAFC', border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 11, color: C.textSecondary, fontWeight: 600,
        }}>
          <svg width="12" height="12" fill="none" stroke={C.textMuted} strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ color: C.textMuted, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 10 }}>Last activity:</span>
          <span style={{ color: C.text }}>
            {row.last_submitted_at
              ? new Date(row.last_submitted_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : 'Not started yet'}
          </span>
        </div>

        {/* View question progress button — alternating violet/blue */}
        <div style={{ padding: '10px 14px 14px' }}>
          <button
            onClick={() => {
              setExpandedRowId(row.student_result_id);
              setDetailFilter('all');
            }}
            style={{
              width: '100%',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 14px', borderRadius: 10, border: 'none',
              background: accent.grad,
              color: '#FFFFFF',
              fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
              boxShadow: `0 6px 14px ${accent.soft}`,
              transition: 'transform 150ms, box-shadow 180ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 10px 22px ${accent.soft}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 14px ${accent.soft}`; }}
          >
            View question progress
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gap: '20px', fontFamily: FONT, width: '100%', minWidth: 0, overflowX: 'hidden' }}>

      <WorkspaceHeader eyebrow="Learning follow-up" title="Worksheet Progress"
        description="Review assigned, attempted, and solved questions. Open a student to explore their worksheet progress."
        actions={<>
          <span className="sl-header-date"><DashboardIcon name="calendar" size={15} />{getHeaderDateLabel()}</span>
          <button className="sl-header-back" onClick={handleRefresh} aria-label="Refresh worksheet progress"><DashboardIcon name="refresh" size={16} /></button>
        </>}
      />

      <div style={{ background: C.card, borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: C.shadow, padding: '20px', display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {([
              { key: 'exam', label: 'By Exam' },
              { key: 'class', label: 'By Class & Section' },
            ] as const).map((item) => {
              const active = scopeMode === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => toggleScope(item.key)}
                  style={{
                    ...secondaryButtonStyle,
                    height: '44px',
                    padding: '0 18px',
                    borderColor: active ? 'rgba(124,58,237,0.26)' : C.borderStrong,
                    background: active ? C.purpleSoft : '#FFFFFF',
                    color: active ? C.purple : C.textSecondary,
                    boxShadow: active ? '0 8px 20px rgba(124,58,237,0.10)' : 'none',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <button onClick={handleExport} style={primaryButtonStyle}>
            <DashboardIcon name="download" size={16} color={C.purple} />
            Export Report
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: scopeMode === 'exam' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))', gap: '14px', width: '100%', minWidth: 0 }}>
          {scopeMode === 'exam' ? (
            <>
              <div style={{ minWidth: 0 }}>
                <label style={controlLabelStyle}>Exam</label>
                <select value={selectedExamId ?? ''} onChange={(e) => handleExamChange(e.target.value)} style={inputStyle}>
                  {orderedExamOptions.map((exam) => (
                    <option key={exam.exam_id} value={exam.exam_id}>{exam.name || exam.exam_name || `Exam #${exam.exam_id}`}</option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={controlLabelStyle}>Subject</label>
                <select value={selectedSubject} onChange={(e) => handleSubjectChange(e.target.value)} style={inputStyle}>
                  <option value="">All subjects</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{ minWidth: 0 }}>
                <label style={controlLabelStyle}>Class</label>
                <select value={selectedClassName} onChange={(e) => handleClassChange(e.target.value)} style={inputStyle}>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={controlLabelStyle}>Section</label>
                <select value={selectedSection} onChange={(e) => handleSectionChange(e.target.value)} style={inputStyle}>
                  {sectionOptions.map((sectionName) => (
                    <option key={sectionName} value={sectionName}>{sectionName}</option>
                  ))}
                </select>
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={controlLabelStyle}>Subject</label>
                <select value={selectedSubject} onChange={(e) => handleSubjectChange(e.target.value)} style={inputStyle}>
                  <option value="">All subjects</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div style={{ minWidth: 0 }}>
            <label style={controlLabelStyle}>Student</label>
            <select value={studentFilterId} onChange={(e) => handleStudentChange(e.target.value)} style={inputStyle}>
              <option value="">All students</option>
              {filteredStudentOptions.map((student) => (
                <option key={student.student_id} value={student.student_id}>{student.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', paddingTop: '4px' }}>
          <div style={{ minWidth: '260px', flex: '1 1 360px', display: 'grid', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.textSecondary, fontWeight: 700 }}>
              <span>Progress Focus</span>
              <span>{progressTarget === null ? 'All students' : `Near ${progressTarget}%`}</span>
            </div>
            <input type="range" min="0" max="100" step="5" value={progressSliderValue} onChange={(e) => handleProgressSliderChange(e.target.value)} style={{ width: '100%', accentColor: C.purple, cursor: 'pointer' }} />
          </div>
          <button onClick={clearProgressFilter} style={{ ...secondaryButtonStyle, height: '44px', padding: '0 16px' }}>
            Show All
          </button>
        </div>
      </div>

      {examsLoading && scopeMode === 'exam' && exams.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: C.textMuted }}>Loading exams for worksheet progress...</div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '56px 0', color: C.textMuted }}>Loading worksheet progress...</div>
      ) : error ? (
        <div style={{ background: C.card, borderRadius: '18px', border: `1px solid ${C.redSoft}`, padding: '22px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '16px', fontWeight: 800, color: C.red, marginBottom: '6px' }}>Unable to load worksheet progress</div>
          <div style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.6 }}>{error}</div>
        </div>
      ) : !response || (scopeMode === 'exam' ? visibleRows.length === 0 : visibleGroups.length === 0) ? (
        <div style={{ background: C.card, borderRadius: '18px', border: `1px solid ${C.border}`, padding: '48px 24px', textAlign: 'center', boxShadow: C.shadow }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.purpleSoft }}>
            <DashboardIcon name="grid" size={24} color={C.purple} />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: C.text, marginBottom: '6px' }}>No worksheet progress found</div>
          <div style={{ fontSize: '14px', color: C.textMuted, lineHeight: 1.6 }}>
            No worksheet recommendations with progress are available for this selection.
          </div>
        </div>
      ) : scopeMode === 'exam' ? (
        expandedRowId != null && visibleRows.find(r => r.student_result_id === expandedRowId) ? (
          (() => {
            const row = visibleRows.find(r => r.student_result_id === expandedRowId)!;
            const asGroup: StudentGroup = {
              student_id: row.student_id,
              student_name: row.student_name,
              username: row.username,
              class_name: response?.scope.class_name ?? null,
              section_name: response?.scope.section ?? null,
              summary: { ...row.summary },
              solved_percent: row.solved_percent,
              not_started_count: row.worksheet_opened ? 0 : 1,
              rows: [row],
            };
            return renderGroupDetail(asGroup, () => setExpandedRowId(null));
          })()
        ) : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {visibleRows.map((row, idx) => renderExamCompactCard(row, idx))}
          </div>
        )
      ) : expandedGroupId != null && visibleGroups.find(g => g.student_id === expandedGroupId) ? (
        renderGroupDetail(visibleGroups.find(g => g.student_id === expandedGroupId)!)
      ) : (
        <div style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        }}>
          {visibleGroups.map((group, idx) => {
            const solvedPercent = clampPercent(group.solved_percent);
            const totalWorksheets = group.rows.length;
            const completedWorksheets = group.rows.filter(r => Number(r.summary.solved ?? 0) >= Number(r.summary.total ?? 0) && Number(r.summary.total ?? 0) > 0).length;

            const isExcellent = solvedPercent >= 75;
            const isInProgress = solvedPercent > 0 && solvedPercent < 75;
            const ringColor = isExcellent ? C.green : isInProgress ? C.amber : C.red;
            const centerLabel = solvedPercent >= 100 ? 'Completed'
              : solvedPercent > 0 ? 'In Progress'
              : 'Not Started';

            const statusPill = isExcellent
              ? { label: 'Excellent', color: '#059669', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.28)' }
              : isInProgress
                ? { label: 'In Progress', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.28)' }
                : { label: 'Not Started', color: '#64748B', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.28)' };

            // Alternating violet/blue accent based on position
            const CARD_ACCENTS = [
              { solid: '#7C3AED', grad: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', soft: 'rgba(124,58,237,0.10)' },
              { solid: '#3B82F6', grad: 'linear-gradient(135deg, #60A5FA, #2563EB)', soft: 'rgba(59,130,246,0.10)' },
            ];
            const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];

            const ringR = 42;
            const ringCirc = 2 * Math.PI * ringR;

            return (
              <div key={group.student_id} className="sl-worksheet-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  border: `1px solid ${C.border}`,
                  boxShadow: C.shadowSoft,
                  overflow: 'hidden',
                  transition: 'transform 180ms, box-shadow 180ms, border-color 180ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = C.shadow; e.currentTarget.style.borderColor = accent.solid + '44'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = C.shadowSoft; e.currentTarget.style.borderColor = C.border; }}
              >
                {/* Header: name + class + status pill */}
                <div style={{ padding: '18px 18px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                      {group.student_name}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 11, color: C.textSecondary, fontWeight: 600 }}>
                      {group.username && <span style={{ color: C.purple }}>@{group.username}</span>}
                      {group.username && (group.class_name || group.section_name) && <span style={{ color: C.textMuted }}> · </span>}
                      {group.class_name && <span>Class {group.class_name}</span>}
                      {group.class_name && group.section_name && <span> - {group.section_name}</span>}
                      {!group.class_name && group.section_name && <span>Section {group.section_name}</span>}
                    </div>
                  </div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 999,
                    background: statusPill.bg, color: statusPill.color,
                    border: `1px solid ${statusPill.border}`,
                    fontSize: 11, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {isExcellent ? (
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : isInProgress ? (
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <path d="M23 6l-9.5 9.5-5-5L1 18" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M17 6h6v6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {statusPill.label}
                  </span>
                </div>

                {/* Ring + Total Worksheets row */}
                <div style={{ padding: '16px 18px 6px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0 }}>
                    <svg width="108" height="108" viewBox="0 0 108 108">
                      <circle cx="54" cy="54" r={ringR} fill="none" stroke="#F1F5F9" strokeWidth="8" />
                      <circle
                        cx="54" cy="54" r={ringR}
                        fill="none" stroke={ringColor} strokeWidth="8"
                        strokeDasharray={ringCirc}
                        strokeDashoffset={(1 - solvedPercent / 100) * ringCirc}
                        strokeLinecap="round"
                        transform="rotate(-90 54 54)"
                        style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1)' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center',
                      pointerEvents: 'none',
                    }}>
                      <div style={{
                        fontSize: 22, fontWeight: 800, color: C.text,
                        fontFamily: FONT,
                        letterSpacing: '-0.02em', lineHeight: 1,
                      }}>{solvedPercent}%</div>
                      <div style={{
                        marginTop: 3,
                        fontSize: 10, fontWeight: 700, color: ringColor,
                        letterSpacing: '0.02em',
                      }}>{centerLabel}</div>
                    </div>
                  </div>

                  {/* Total Worksheets big label */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 999,
                      background: accent.soft, color: accent.solid,
                      fontSize: 10, fontWeight: 700,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      marginBottom: 6,
                    }}>
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M9 9h6M9 13h6M9 17h4" strokeLinecap="round" />
                      </svg>
                      Total Worksheets
                    </div>
                    <div style={{
                      fontSize: 34, fontWeight: 800, color: C.text,
                      fontFamily: FONT,
                      letterSpacing: '-0.02em', lineHeight: 1,
                    }}>{totalWorksheets}</div>
                    <div style={{ marginTop: 4, fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                      Assigned to this student
                    </div>
                  </div>
                </div>

                {/* Progress bar + completion label */}
                <div style={{ padding: '4px 18px 14px' }}>
                  <div style={{ height: 8, borderRadius: 999, background: '#F1F5F9', overflow: 'hidden' }}>
                    <div style={{
                      width: `${solvedPercent}%`, height: '100%',
                      background: `linear-gradient(90deg, ${ringColor}CC, ${ringColor})`,
                      borderRadius: 999,
                      transition: 'width 400ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }} />
                  </div>
                  <div style={{
                    marginTop: 8, textAlign: 'center',
                    fontSize: 12, fontWeight: 600, color: C.textSecondary,
                  }}>
                    {completedWorksheets} of {totalWorksheets} worksheets completed
                  </div>
                </div>

                {/* View All Worksheets button — alternating violet/blue */}
                <div style={{ padding: '0 14px 14px' }}>
                  <button
                    onClick={() => {
                      setExpandedGroupId(group.student_id);
                      setActiveWorksheetIndex(0);
                      setDetailFilter('all');
                    }}
                    style={{
                      width: '100%',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '10px 14px', borderRadius: 10, border: 'none',
                      background: accent.grad,
                      color: '#FFFFFF',
                      fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                      boxShadow: `0 6px 14px ${accent.soft}`,
                      transition: 'transform 150ms, box-shadow 180ms',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 10px 22px ${accent.soft}`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 14px ${accent.soft}`; }}
                  >
                    View All Worksheets
                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(response?.total_rows ?? 0) > PAGE_SIZE ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '14px 16px', boxShadow: C.shadow }}>
          <div style={{ fontSize: '13px', color: C.textMuted }}>
            Showing page {response?.page ?? page} of {totalPages}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} style={{ ...secondaryButtonStyle, opacity: page <= 1 ? 0.5 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
              <DashboardIcon name="chevL" size={14} color={C.textSecondary} />
              Previous
            </button>
            <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} style={{ ...primaryButtonStyle, opacity: page >= totalPages ? 0.5 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>
              Next
              <DashboardIcon name="chevR" size={14} color="#FFFFFF" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WorksheetProgressPanel;
