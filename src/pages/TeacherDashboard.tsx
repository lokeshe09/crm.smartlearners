import React, { useState, useEffect, useMemo, useRef } from 'react';
import { dashboardAPI, alertAPI, activityAPI, challengeAPI, quizAPI, examAPI, ScheduledAssignmentItem, QuizHomeworkItem, QuizSubmissionItem, TeacherExamsResponse, MockExamItem, MockExamResultItem } from '../services/api';
import { TeacherDashboardData, ActivityOverview, TestPrepItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../context/DashboardContext';
import StudentTable from '../components/StudentTable';
import SendAlertModal from '../components/SendAlertModal';
import SendChallengeModal from '../components/SendChallengeModal';
import StudentDetailModal from '../components/StudentDetailModal';
import ActivityFeed from '../components/ActivityFeed';
import ExamCorrectionPanel from '../components/ExamCorrectionPanel';
import TeacherAnalyticsPanel from '../components/TeacherAnalyticsPanel';
import { AttemptsByExam, buildExamRecords, loadAttemptsForExams } from '../utils/examAnalytics';
import WorksheetProgressPanel from '../components/WorksheetProgressPanel';
import MockExamResults, { CompareMockExams } from '../components/MockExamResults';
import MockExamAnalysis from '../components/MockExamAnalysis';
import StudentTrackGrid, { TrackPreloadData } from '../components/StudentTrackGrid';
import ScheduledAssignmentsPanel from '../components/ScheduledAssignmentsPanel';
import DashboardIcon from '../components/DashboardIcon';
import SmartLoadingScreen from '../components/SmartLoadingScreen';
import T from '../theme/tokens';

const FONT = T.font.sans;
const FONT_SERIF = T.font.display;
const LOADING_SCREEN_MIN_MS = 300;

const C = {
  bg: T.surface.canvas, cardBg: T.color.neutral[0], cardAlt: T.color.neutral[50],
  border: T.border.subtle, borderLight: T.border.strong,
  text: T.text.primary, textSecondary: T.text.secondary, textMuted: T.text.tertiary,
  teal: T.color.brand[600], tealDark: T.color.brand[700], tealSoft: T.color.brand.tint,
  green: T.color.success.solid, greenSoft: T.color.success.bg,
  amber: T.color.warning.solid, amberSoft: T.color.warning.bg,
  blue: T.color.info.solid, blueSoft: T.color.info.bg,
  red: T.color.danger.solid, redSoft: T.color.danger.bg,
  card: T.color.neutral[0],
  shadow: T.shadow.sm,
  shadowLg: T.shadow.lg,
};


const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const { setDashboardData: shareDashboardData } = useDashboard();

  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGreeting, setShowGreeting] = useState(false);

  const [activeTab, setActiveTab] = useState<'analytics' | 'track-status' | 'assignments' | 'students' | 'daily-quizzes' | 'exam-correction' | 'worksheet-progress' | 'mock-exams' | 'mock-exam-analysis' | 'compare-mock-exams' | 'jee-exams' | 'pre-assessment' | 'activity'>('analytics');
  const [activityData, setActivityData] = useState<ActivityOverview | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [testPrepData, setTestPrepData] = useState<TestPrepItem[] | null>(null);
  const [testPrepLoading, setTestPrepLoading] = useState(false);

  const [quizHomeworks, setQuizHomeworks] = useState<QuizHomeworkItem[] | null>(null);
  const [quizHomeworksLoading, setQuizHomeworksLoading] = useState(false);
  const [selectedHomeworkId, setSelectedHomeworkId] = useState<number | null>(null);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<QuizSubmissionItem[] | null>(null);
  const [homeworkSubmissionsLoading, setHomeworkSubmissionsLoading] = useState(false);

  const [teacherExamsData, setTeacherExamsData] = useState<TeacherExamsResponse | null>(null);
  const [teacherExamsLoading, setTeacherExamsLoading] = useState(false);
  const [examAttempts, setExamAttempts] = useState<AttemptsByExam>({});
  const [attemptsProgress, setAttemptsProgress] = useState<{ done: number; total: number } | null>(null);
  const [focusExamId, setFocusExamId] = useState<number | null>(null);
  const examsRequested = useRef(false);

  const [mockExams, setMockExams] = useState<MockExamItem[] | null>(null);
  const [mockExamsLoading, setMockExamsLoading] = useState(false);
  const [selectedMockExamId, setSelectedMockExamId] = useState<number | null>(null);
  const [mockExamResults, setMockExamResults] = useState<MockExamResultItem[] | null>(null);
  const [mockExamResultsLoading, setMockExamResultsLoading] = useState(false);
  const [mockExamClassFilter, setMockExamClassFilter] = useState('All');
  const [mockExamSectionFilter, setMockExamSectionFilter] = useState('All');

  const [analysisExamId, setAnalysisExamId] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<MockExamResultItem[] | null>(null);
  const [analysisResultsLoading, setAnalysisResultsLoading] = useState(false);

  const [compareExamIds, setCompareExamIds] = useState<[number, number] | null>(null);
  const [compareResults, setCompareResults] = useState<{ exam1: MockExamResultItem[]; exam2: MockExamResultItem[] } | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const [prepChapterFilter, setPrepChapterFilter] = useState<string>('All');
  const [prepClassFilter, setPrepClassFilter] = useState<string>('All');
  const [prepSectionFilter, setPrepSectionFilter] = useState<string>('All');
  const [prepMinAttempts, setPrepMinAttempts] = useState<number>(1);
  const [prepMinScore, setPrepMinScore] = useState<number>(0);

  const [trackPreload, setTrackPreload] = useState<TrackPreloadData | undefined>(undefined);
  const [scheduledAssignments, setScheduledAssignments] = useState<ScheduledAssignmentItem[] | null>(null);

  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [trackTopic, setTrackTopic] = useState<string>('All');
  const trackGridRef = useRef<HTMLDivElement>(null);

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeStudentId, setChallengeStudentId] = useState<number | null>(null);
  const [viewStudentId, setViewStudentId] = useState<number | null>(null);

  const teacherUsername = user?.username;

  const dayFilterOptions = [
    { label: 'All', value: null },
    { label: 'Today', value: 0 },
    { label: '1 Day', value: 1 },
    { label: '2 Days', value: 2 },
    { label: '7 Days', value: 7 },
  ] as const;

  const getMockExamClassCode = (value?: string | null) => {
    if (!value) return '';
    const trimmed = String(value).trim();
    const numberMatch = trimmed.match(/\d+/);
    return numberMatch ? numberMatch[0] : trimmed.replace(/^class\s+/i, '');
  };

  const getMockExamSectionName = (value?: string | null) => {
    if (!value) return '';
    return String(value).trim().replace(/^section\s+/i, '');
  };

  const loadDashboard = async () => {
    if (!teacherUsername) {
      setError('No teacher username provided. Please log in again.');
      setLoading(false);
      return;
    }

    const loadingStartedAt = Date.now();

    try {
      setLoading(true);
      const data = await dashboardAPI.getTeacherDashboardByUsername(teacherUsername);
      setDashboardData(data);
      shareDashboardData(data);
      setError('');
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Unknown error';
      setError(`Failed to load dashboard: ${message}`);
    } finally {
      const elapsed = Date.now() - loadingStartedAt;
      if (elapsed < LOADING_SCREEN_MIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, LOADING_SCREEN_MIN_MS - elapsed));
      }
      setLoading(false);
    }
  };

  const loadScheduledAssignments = async () => {
    if (!teacherUsername) return;
    try {
      const data = await quizAPI.getHomeworks(teacherUsername, 500);
      const items = (data.items ?? []).map((item) => ({
        assignment_id: String(item.id),
        assignment_code: item.homework_code ?? null,
        title: item.title ?? null,
        status: null,
        scheduled_date: item.date_assigned ?? null,
        due_date: item.due_date ?? null,
        class_id: null,
        class_name: item.description_data?.class_name ?? null,
        section_id: null,
        section_name: null,
        subject_id: null,
        subject_name: item.description_data?.subject_name ?? item.description_data?.subject ?? null,
        topic_id: null,
        topic_name: item.description_data?.chapters?.[0]?.replace(/_/g, ' ') ?? null,
        subtopic_code: null,
        question_count: item.description_data?.questions_per_chapter ?? 0,
        assigned_count: 0,
        viewed_count: 0,
        submitted_count: item.total_submissions ?? 0,
        missed_count: 0,
        cancelled_count: 0,
      }));
      setScheduledAssignments(items);
    } catch (err) {
      console.error('Failed to load scheduled assignments:', err);
      setScheduledAssignments([]);
    }
  };

  const loadActivity = async () => {
    if (activityData || !user?.school_id) return;
    try {
      setActivityLoading(true);
      const data = await activityAPI.getSchoolActivity(user.school_id);
      setActivityData(data);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadTestPrep = async () => {
    if (testPrepData) return;
    const schoolCode = user?.school_code || 'ELP';
    try {
      setTestPrepLoading(true);
      const result = await dashboardAPI.getTestPrepBySchoolCode(schoolCode);
      setTestPrepData(result.items ?? []);
    } catch (err) {
      console.error('Failed to load test prep:', err);
      setTestPrepData([]);
    } finally {
      setTestPrepLoading(false);
    }
  };

  const loadQuizHomeworks = async () => {
    if (quizHomeworks || !teacherUsername) return;
    try {
      setQuizHomeworksLoading(true);
      const data = await quizAPI.getHomeworks(teacherUsername);
      setQuizHomeworks(data.items);
    } catch (err) {
      console.error('Failed to load quiz homeworks:', err);
      setQuizHomeworks([]);
    } finally {
      setQuizHomeworksLoading(false);
    }
  };

  const loadTeacherExams = async () => {
    if (teacherExamsData || !teacherUsername || examsRequested.current) return;
    examsRequested.current = true;
    try {
      setTeacherExamsLoading(true);
      const data = await examAPI.getTeacherExams(teacherUsername);
      setTeacherExamsData(data);
      loadAllExamAttempts(data.items ?? []);
    } catch (err) {
      console.error('Failed to load teacher exams:', err);
      setTeacherExamsData(null);
      examsRequested.current = false;
      setAttemptsProgress({ done: 0, total: 0 });
    } finally {
      setTeacherExamsLoading(false);
    }
  };

  // Pull every exam's student results in the background — powers Analytics
  // and the "vs last exam" comparisons in Exam Correction.
  const loadAllExamAttempts = async (items: TeacherExamsResponse['items']) => {
    const withResults = items.filter((e) => Number(e.total_students ?? 0) > 0).length;
    setAttemptsProgress({ done: 0, total: withResults });
    let done = 0;
    await loadAttemptsForExams(
      items,
      async (examId) => {
        const res = await examAPI.getTeacherExamAttempts(examId, 1000);
        done += 1;
        setAttemptsProgress({ done, total: withResults });
        return res.items ?? [];
      },
      (partial) => setExamAttempts(partial),
    );
    setAttemptsProgress({ done: withResults, total: withResults });
  };

  const examRecords = useMemo(
    () => buildExamRecords(teacherExamsData?.items ?? [], examAttempts),
    [teacherExamsData, examAttempts],
  );

  const loadMockExams = async (classFilter = mockExamClassFilter, sectionFilter = mockExamSectionFilter, force = false) => {
    if (mockExams && !force && classFilter === mockExamClassFilter && sectionFilter === mockExamSectionFilter) return;
    if (!teacherUsername) return;
    try {
      setMockExamsLoading(true);
      const schoolCode = user?.school_code || 'ELP';
      let items: MockExamItem[];
      if (classFilter !== 'All') {
        const data = await examAPI.getMockExamsByClassSection({
          school_code: schoolCode,
          class_code: classFilter,
          ...(sectionFilter !== 'All' ? { section_name: sectionFilter } : {}),
          limit: 100,
        });
        items = data.items ?? [];
      } else {
        // Fetch by-class-section for each known class (preserves chapters field)
        const classes = Array.from(new Set((dashboardData?.students ?? []).map(s => getMockExamClassCode(s.grade)).filter(Boolean)));
        if (classes.length > 0) {
          const responses = await Promise.all(
            classes.map(cls =>
              examAPI.getMockExamsByClassSection({ school_code: schoolCode, class_code: cls, limit: 100 })
                .then(d => d.items ?? [])
                .catch(() => [] as MockExamItem[])
            )
          );
          // Deduplicate by homework_id
          const seen = new Map<number, MockExamItem>();
          for (const batch of responses) {
            for (const exam of batch) {
              if (!seen.has(exam.homework_id)) seen.set(exam.homework_id, exam);
            }
          }
          items = Array.from(seen.values()).sort((a, b) =>
            (b.date_assigned ?? '').localeCompare(a.date_assigned ?? '')
          );
        } else {
          items = [];
        }
      }
      setMockExams(items);
      setSelectedMockExamId(null);
      setMockExamResults(null);
    } catch (err) {
      console.error('Failed to load mock exams:', err);
      setMockExams([]);
    } finally {
      setMockExamsLoading(false);
    }
  };

  const handleMockExamFiltersChange = (classFilter: string, sectionFilter: string) => {
    setMockExamClassFilter(classFilter);
    setMockExamSectionFilter(sectionFilter);
    loadMockExams(classFilter, sectionFilter, true);
  };

  const handleSelectMockExam = async (homeworkId: number) => {
    if (homeworkId === 0) {
      setSelectedMockExamId(null);
      setMockExamResults(null);
      return;
    }
    setSelectedMockExamId(homeworkId);
    setMockExamResults(null);
    try {
      setMockExamResultsLoading(true);
      const data = await examAPI.getMockExamResults(homeworkId);
      setMockExamResults(data.items ?? []);
    } catch (err) {
      console.error('Failed to load mock exam results:', err);
      setMockExamResults([]);
    } finally {
      setMockExamResultsLoading(false);
    }
  };

  const handleCompareExams = async (id1: number, id2: number, _cls?: string, _sec?: string) => {
    setCompareExamIds([id1, id2]);
    setCompareResults(null);
    try {
      setCompareLoading(true);
      const [r1, r2] = await Promise.all([
        examAPI.getMockExamResults(id1, 500),
        examAPI.getMockExamResults(id2, 500),
      ]);
      setCompareResults({ exam1: r1.items ?? [], exam2: r2.items ?? [] });
    } catch (err) {
      console.error('Failed to load compare results:', err);
      setCompareResults({ exam1: [], exam2: [] });
    } finally {
      setCompareLoading(false);
    }
  };

  const handleSelectAnalysisExam = async (id: number | null) => {
    if (id === null || id === analysisExamId) {
      setAnalysisExamId(null);
      setAnalysisResults(null);
      return;
    }
    setAnalysisExamId(id);
    setAnalysisResults(null);
    try {
      setAnalysisResultsLoading(true);
      const data = await examAPI.getMockExamResults(id);
      setAnalysisResults(data.items ?? []);
    } catch {
      setAnalysisResults([]);
    } finally {
      setAnalysisResultsLoading(false);
    }
  };

  const handleExitCompare = () => {
    setCompareExamIds(null);
    setCompareResults(null);
  };

  const fetchMockExamsForSection = async (classCode: string, sectionName?: string): Promise<MockExamItem[]> => {
    const schoolCode = user?.school_code || 'ELP';
    try {
      const data = await examAPI.getMockExamsByClassSection({
        school_code: schoolCode,
        class_code: classCode,
        ...(sectionName ? { section_name: sectionName } : {}),
        limit: 200,
      });
      return data.items ?? [];
    } catch {
      return [];
    }
  };

  const loadHomeworkSubmissions = async (homeworkId: number) => {
    setSelectedHomeworkId(homeworkId);
    setHomeworkSubmissions(null);
    try {
      setHomeworkSubmissionsLoading(true);
      const data = await quizAPI.getSubmissions(homeworkId);
      setHomeworkSubmissions(data.items);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      setHomeworkSubmissions([]);
    } finally {
      setHomeworkSubmissionsLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); loadScheduledAssignments(); loadTestPrep(); loadTeacherExams(); }, [teacherUsername]);

  // Pre-fetch StudentTrackGrid Wave 1 data during the greeting screen so the
  // skeleton resolves faster once the main dashboard is ready.
  useEffect(() => {
    if (!teacherUsername || !user?.school_code) return;
    const sc = user.school_code;
    const base = process.env.REACT_APP_API_URL || 'https://crm.smartlearners.ai/backend-api/';
    Promise.all([
      fetch(`${base}api/external-data/user-sessions/by-school-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_code: sc, limit: 5000 }),
      }),
      fetch(`${base}api/external-data/quiz-homework/by-username`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: teacherUsername, limit: 500 }),
      }),
      fetch(`${base}api/external-data/teacher-exams/by-username`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: teacherUsername, limit: 5 }),
      }),
    ])
      .then(([r1, r2, r3]) => Promise.all([r1.json(), r2.json(), r3.json()]))
      .then(([sessionData, homeworkData, examData]) => {
        setTrackPreload({
          sessions: sessionData.items ?? [],
          homeworks: homeworkData.items ?? [],
          exams: examData.items ?? [],
          resolvedSchoolCode: homeworkData.school_code || sc,
        });
      })
      .catch(() => { /* silent — StudentTrackGrid falls back to its own fetch */ });
  }, [teacherUsername, user?.school_code]);

  const handleSendAlert = (studentId: number) => {
    setSelectedStudentId(studentId);
    setShowAlertModal(true);
  };

  const handleSendAlertSubmit = async (studentId: number) => {
    await alertAPI.sendAlert({ student_id: studentId });
    await loadDashboard();
  };

  const handleSendChallenge = (studentId: number) => {
    setChallengeStudentId(studentId);
    setShowChallengeModal(true);
  };

  const handleSendChallengeSubmit = async (studentId: number, subject: string, numQuestions: number, concept?: string) => {
    await challengeAPI.sendChallenge(studentId, subject, numQuestions, concept);
  };

  const handleSendBulkAlert = async () => {
    if (selectedIds.size === 0) { alert('No students selected.'); return; }
    const confirmed = window.confirm(`Send WhatsApp alerts to ${selectedIds.size} selected students?`);
    if (!confirmed) return;
    try {
      setRefreshing(true);
      const results = await alertAPI.sendBulkAlert({ student_ids: Array.from(selectedIds) });
      const sent = results.filter((r) => r.success).length;
      setSelectedIds(new Set());
      await loadDashboard();
      alert(`Alerts sent: ${sent}/${selectedIds.size} students.`);
    } catch (err) {
      alert('Failed to send bulk alerts');
    } finally {
      setRefreshing(false);
    }
  };

  // ── Test prep helpers ──────────────────────────────────────────────────────

  const getPrepItemScore = (item: TestPrepItem) =>
    Number(item.graph_data?.score_pct ?? item.analysis?.analysis?.score_pct ?? item.analysis?.prediction?.score_pct ?? 0);

  const getItemChapters = (item: TestPrepItem): string[] => {
    const breakdown: any[] = item.graph_data?.chapter_breakdown ?? [];
    if (breakdown.length > 0) {
      const chapters = breakdown.map((e: any) => String(e.chapter || '')).filter(Boolean);
      if (chapters.length > 0) return chapters;
    }
    return (item.questions ?? []).map((q: any) => String(q.chapter || '')).filter(Boolean);
  };

  const usernameByStudentId = useMemo(() => {
    const map = new Map<number, string>();
    (testPrepData ?? []).forEach((item) => {
      if (item.student_id && item.username) map.set(item.student_id, item.username);
    });
    return map;
  }, [testPrepData, dashboardData]);

  const testPrepByStudentId = useMemo(() => {
    const map = new Map<number, TestPrepItem[]>();
    if (!testPrepData || !dashboardData) return map;
    const teacherStudentIds = new Set(dashboardData.students.map((s) => s.student_id));
    for (const item of testPrepData) {
      if (!item.student_id || !teacherStudentIds.has(item.student_id)) continue;
      const list = map.get(item.student_id) ?? [];
      list.push(item);
      map.set(item.student_id, list);
    }
    return map;
  }, [testPrepData, dashboardData]);

  const prepChapterOptions = useMemo(() => {
    if (!testPrepData) return ['All'];
    const chapters = new Set<string>();
    testPrepByStudentId.forEach((items) => items.forEach((item) => getItemChapters(item).forEach((ch) => chapters.add(ch))));
    return ['All', ...Array.from(chapters).sort((a, b) => a.localeCompare(b))];
  }, [testPrepByStudentId]);

  const prepClassOptions = useMemo(() => {
    if (!testPrepData) return ['All'];
    const classes = new Set<string>();
    testPrepByStudentId.forEach((items) => items.forEach((item) => { if (item.class_name) classes.add(String(item.class_name)); }));
    return ['All', ...Array.from(classes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }, [testPrepByStudentId]);

  const prepSectionOptions = useMemo(() => {
    const sections = new Set<string>();
    testPrepByStudentId.forEach((items) => items.forEach((item) => {
      if (prepClassFilter !== 'All' && String(item.class_name) !== prepClassFilter) return;
      if (item.section_name) sections.add(String(item.section_name));
    }));
    return ['All', ...Array.from(sections).sort()];
  }, [testPrepByStudentId, prepClassFilter]);

  const prepFilteredStudents = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.students.filter((student) => {
      let items = testPrepByStudentId.get(student.student_id) ?? [];
      if (prepChapterFilter !== 'All') items = items.filter((item) => getItemChapters(item).includes(prepChapterFilter));
      if (prepClassFilter !== 'All') items = items.filter((item) => String(item.class_name) === prepClassFilter);
      if (prepSectionFilter !== 'All') items = items.filter((item) => String(item.section_name) === prepSectionFilter);
      if (items.length < prepMinAttempts) return false;
      if (prepMinScore > 0 && !items.some((item) => getPrepItemScore(item) >= prepMinScore)) return false;
      return true;
    });
  }, [dashboardData, testPrepByStudentId, prepChapterFilter, prepClassFilter, prepSectionFilter, prepMinAttempts, prepMinScore]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.full_name || user?.username || 'Teacher';
  const initials = displayName.split(/\s+|@/).filter(Boolean).slice(0, 2).map((w: string) => w[0].toUpperCase()).join('');



  if (loading) {
    return <SmartLoadingScreen durationMs={LOADING_SCREEN_MIN_MS} />;
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', fontFamily: FONT, background: T.surface.canvas, padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 36, background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: T.shadow.lg }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.color.danger.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="26" height="26" fill="none" stroke={T.color.danger.solid} strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
            </svg>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: C.text, fontFamily: FONT_SERIF, letterSpacing: '-0.01em' }}>Connection Error</h2>
          <p style={{ margin: '0 0 22px', fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>{error}</p>
          <button onClick={loadDashboard} style={{ padding: '11px 22px', borderRadius: 12, border: 'none', background: `linear-gradient(180deg, ${T.color.brand[600]}, ${T.color.brand[700]})`, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, boxShadow: T.shadow.brand }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;


  const filteredStudents = dayFilter === null
    ? dashboardData.students
    : dashboardData.students.filter((u) => {
        if (u.auth_provider === 'google') return true;
        if (u.days_since_login === null || u.days_since_login === undefined) return false;
        return u.days_since_login <= dayFilter;
      });

  const mockExamClassOptions = ['All', ...Array.from(new Set(dashboardData.students.map((student) => getMockExamClassCode(student.grade)).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  const mockExamSectionOptions = [
    'All',
    ...Array.from(new Set(
      dashboardData.students
        .filter((student) => mockExamClassFilter === 'All' || getMockExamClassCode(student.grade) === mockExamClassFilter)
        .map((student) => getMockExamSectionName(student.section))
        .filter(Boolean)
    )).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  ];

  const scoreColor = (s: number) => s >= 70 ? '#10B981' : s >= 50 ? '#F59E0B' : '#F43F5E';


  const navSections = [
    {
      title: 'Performance & Insights',
      items: [
        { key: 'analytics' as const, label: 'Class Performance', icon: 'bar' },
        { key: 'track-status' as const, label: 'Topic Mastery Track', icon: 'target' },
        { key: 'activity' as const, label: 'Learning Activity', icon: 'activity' },
      ],
    },
    {
      title: 'Exams & Evaluations',
      items: [
        { key: 'exam-correction' as const, label: 'Exam Correction', icon: 'file' },
        { key: 'worksheet-progress' as const, label: 'Remedial Worksheets', icon: 'grid' },
        { key: 'mock-exams' as const, label: 'Mock Exam Scores', icon: 'sparkle' },
        { key: 'mock-exam-analysis' as const, label: 'Diagnostic Analysis', icon: 'pie' },
        { key: 'compare-mock-exams' as const, label: 'Compare Exams', icon: 'trending' },
      ],
    },
    {
      title: 'Students & Coursework',
      items: [
        { key: 'students' as const, label: 'Student Directory', icon: 'users' },
        { key: 'assignments' as const, label: 'Scheduled Homework', icon: 'calendar' },
        { key: 'daily-quizzes' as const, label: 'Daily MCQ Quizzes', icon: 'quiz' },
        { key: 'pre-assessment' as const, label: 'Spot Check (Prep)', icon: 'check' },
      ],
    },
  ];

  const openExamFromAnalytics = (examId: number) => {
    setFocusExamId(examId);
    setActiveTab('exam-correction');
  };

  const handleNavClick = (key: typeof activeTab) => {
    setActiveTab(key);
    if (key === 'activity') loadActivity();
    if (key === 'students') loadTestPrep();
    if (key === 'pre-assessment') loadTestPrep();
    if (key === 'daily-quizzes') loadQuizHomeworks();
    if (key === 'exam-correction' || key === 'analytics') loadTeacherExams();
    if (key === 'worksheet-progress') loadTeacherExams();
    if (key === 'mock-exams') loadMockExams();
    if (key === 'mock-exam-analysis') loadMockExams();
    if (key === 'compare-mock-exams') loadMockExams();
  };

  const sectionTitles: Record<typeof activeTab, string> = {
    'analytics': 'Class Performance Analytics',
    'track-status': 'Topic Mastery Track',
    'assignments': 'Scheduled Homework & Assignments',
    'students': 'Student Directory',
    'daily-quizzes': 'Daily MCQ Quizzes',
    'exam-correction': 'Exam Correction & Evaluation',
    'worksheet-progress': 'Remedial Worksheet Progress',
    'mock-exams': 'Mock Exam Results & Rosters',
    'mock-exam-analysis': 'Mock Exam Diagnostic Analysis',
    'compare-mock-exams': 'Exam Comparison Matrix',
    'jee-exams': 'JEE Format',
    'pre-assessment': 'Spot Check & Diagnostic Records',
    'activity': 'Learning Activity Feed',
  };

  const teacherName = user?.full_name || user?.username || 'Teacher';
  const hourNow = new Date().getHours();
  const greetingText = hourNow < 12 ? 'Good morning' : hourNow < 17 ? 'Good afternoon' : 'Good evening';
  const formattedToday = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="sl-teacher-layout" style={{
      display: 'flex',
      minHeight: 'calc(100vh - 64px)',
      fontFamily: FONT,
      background: '#F8FAFC',
      width: '100%',
      overflowX: 'clip',
    }}>

      {/* ── Sidebar ──────────────────────────────────────────────────────────── */}
      <aside className="sl-teacher-sidebar" style={{
        width: 260,
        flexShrink: 0,
        background: '#090D16',
        borderRight: '1px solid #1E293B',
        position: 'sticky',
        top: 64,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        padding: '20px 14px',
        boxSizing: 'border-box',
        gap: 18,
        alignSelf: 'flex-start',
        overflowY: 'auto',
        color: '#FFFFFF',
      }}>
        {/* Brand block */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 6px 14px', borderBottom: '1px solid #1E293B' }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: '#FFFFFF', padding: 4, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}>
            <img src="/smartlearners-logo.png" alt="SmartLearners.ai" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.015em' }}>Smartlearners.ai</div>
            <div style={{ marginTop: 2, fontSize: 11, fontWeight: 700, color: '#818CF8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {user?.school_code ? `School ${user.school_code}` : 'Teacher Portal'}
            </div>
          </div>
        </div>

        {/* Quick status bar */}
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: 'linear-gradient(180deg, #111827 0%, #0F172A 100%)',
          border: '1px solid #1F2937',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Assigned Cohort</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2, marginTop: 2 }}>
              {dashboardData.students.length} Students
            </div>
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 999,
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34D399', fontSize: 11, fontWeight: 700,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
            Live
          </span>
        </div>

        {/* Grouped Nav */}
        <div style={{ display: 'grid', gap: 18 }}>
          {navSections.map((section) => (
            <div key={section.title}>
              <div style={{ padding: '0 10px 8px', fontSize: 10, fontWeight: 800, color: '#64748B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {section.title}
              </div>
              <nav style={{ display: 'grid', gap: 3 }}>
                {section.items.map((item) => {
                  const isActive = activeTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavClick(item.key)}
                      style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', gap: 11,
                        padding: '9px 12px',
                        borderRadius: 10,
                        border: 'none',
                        borderLeft: isActive ? '3px solid #6366F1' : '3px solid transparent',
                        background: isActive ? 'rgba(99,102,241,0.14)' : 'transparent',
                        color: isActive ? '#FFFFFF' : '#94A3B8',
                        fontSize: 13,
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: FONT,
                        textAlign: 'left',
                        transition: 'all 120ms ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          e.currentTarget.style.color = '#FFFFFF';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#94A3B8';
                        }
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? '#818CF8' : '#64748B' }}>
                        <DashboardIcon name={item.icon} size={16} color={isActive ? '#818CF8' : '#94A3B8'} />
                      </span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Teacher profile in sidebar footer */}
        <div style={{
          marginTop: 'auto', paddingTop: 14,
          borderTop: '1px solid #1E293B',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #4F46E5, #6366F1)', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12.5, fontWeight: 800, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(79,70,229,0.3)',
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.school_code ? `Teacher · ${user.school_code}` : 'Educator'}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content area with sticky top bar ────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
        
        {/* Sticky Top Header Bar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 6,
              background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              Workspace
            </div>
            <span style={{ color: '#CBD5E1', fontSize: 14 }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {sectionTitles[activeTab]}
            </span>
            <span style={{ color: '#E2E8F0', margin: '0 2px' }}>·</span>
            <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>
              {formattedToday}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => {
                setRefreshing(true);
                loadDashboard();
                if (activeTab === 'exam-correction' || activeTab === 'analytics') loadTeacherExams();
                if (activeTab === 'mock-exams' || activeTab === 'mock-exam-analysis') loadMockExams();
                setTimeout(() => setRefreshing(false), 800);
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid #E2E8F0', background: '#FFFFFF',
                color: '#334155', fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: FONT,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'all 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              <DashboardIcon name="refresh" size={13} color="#475569" />
              {refreshing ? 'Syncing...' : 'Refresh'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="sl-teacher-content" style={{
          padding: '24px 28px 40px',
          flex: 1, minWidth: 0, overflowX: 'hidden',
          position: 'relative',
        }}>

        {/* ── Track Status — always mounted to prevent reload on tab switch ── */}
        <div style={{ display: activeTab === 'track-status' ? 'block' : 'none' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: C.text, fontFamily: FONT_SERIF, lineHeight: 1.2 }}>
              Track status of students in a topic
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: C.textMuted, fontWeight: 500 }}>
              Select an assignment topic below to see how each student is performing.
            </p>
          </div>
          <div ref={trackGridRef}>
            <StudentTrackGrid
              students={dashboardData.students}
              schoolCode={user?.school_code ?? ''}
              teacherUsername={teacherUsername ?? ''}
              externalTopic={trackTopic}
              onExternalTopicChange={setTrackTopic}
              scheduledAssignments={scheduledAssignments ?? []}
              preload={trackPreload}
            />
          </div>
        </div>

        {/* ── Scheduled Assignments ─────────────────────────────────────────── */}
        {activeTab === 'assignments' && (
          <ScheduledAssignmentsPanel
            assignments={scheduledAssignments ?? []}
            loading={scheduledAssignments === null}
            activeTopic={trackTopic}
            onTopicClick={(topic: string) => {
              setTrackTopic(topic);
              setActiveTab('track-status');
            }}
          />
        )}

        {/* ── Students ─────────────────────────────────────────────────────── */}
        {activeTab === 'students' && (
          <div>
            <StudentTable students={filteredStudents} onSendAlert={handleSendAlert} onSendChallenge={handleSendChallenge} onViewDetails={(studentId) => setViewStudentId(studentId)} selectedIds={selectedIds} onSelectionChange={setSelectedIds} usernameByStudentId={usernameByStudentId} />
          </div>
        )}

        {/* ── Daily Quizzes ─────────────────────────────────────────────────── */}
        {activeTab === 'daily-quizzes' && (
            quizHomeworksLoading ? (
              <div style={{ textAlign: 'center', padding: '64px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4F46E5', animation: `dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Loading quizzes and assignments...</p>
              </div>
            ) : selectedHomeworkId !== null ? (
              <div style={{ display: 'grid', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { setSelectedHomeworkId(null); setHomeworkSubmissions(null); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '8px 16px', borderRadius: '10px', border: '1px solid #E2E8F0',
                      background: '#FFFFFF', color: '#0F172A', fontSize: '13px', fontWeight: 700,
                      cursor: 'pointer', fontFamily: FONT, boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 140ms ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Back to All Quizzes
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Total Submissions:</span>
                    <span style={{ padding: '3px 10px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', fontSize: 13, fontWeight: 800 }}>
                      {homeworkSubmissions?.length ?? 0}
                    </span>
                  </div>
                </div>

                {homeworkSubmissionsLoading ? (
                  <div style={{ textAlign: 'center', padding: '64px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                      {[0, 1, 2].map((i) => (
                        <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4F46E5', animation: `dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Loading student submissions...</p>
                  </div>
                ) : !homeworkSubmissions || homeworkSubmissions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', color: '#64748B', fontSize: '14px' }}>
                    No student submissions found for this quiz yet.
                  </div>
                ) : (
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
                    <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#F8FAFC' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.015em' }}>
                          {quizHomeworks?.find((h) => h.id === selectedHomeworkId)?.title ?? 'Quiz Submissions'}
                        </span>
                        <span style={{ padding: '3px 10px', borderRadius: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', fontSize: '11.5px', fontWeight: 700, color: '#059669' }}>
                          Evaluated Roster
                        </span>
                      </div>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: FONT }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                          {['Student Name', 'Class & Section', 'Submission Timestamp', 'Status'].map((h) => (
                            <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {homeworkSubmissions.map((sub, i) => (
                          <tr key={sub.id} style={{ borderBottom: i < homeworkSubmissions.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                            <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0F172A' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                                  {sub.student_name ? sub.student_name[0].toUpperCase() : 'S'}
                                </div>
                                <span>{sub.student_name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 20px', color: '#475569' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', fontWeight: 600, fontSize: 12 }}>
                                {sub.class_name ? `Class ${sub.class_name}` : '—'} {sub.section_name ? `· Sec ${sub.section_name}` : ''}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px', color: '#64748B', fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>
                              {sub.created_at ? new Date(sub.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: '#ECFDF5', color: '#059669', fontSize: 11.5, fontWeight: 700 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                                Received
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : !quizHomeworks || quizHomeworks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', color: '#64748B', fontSize: '14px' }}>
                No daily quizzes scheduled.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 18 }}>
                {/* Header card */}
                <div style={{
                  background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '22px 24px',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
                }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Formative Quizzes
                    </div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                      Daily MCQ Quizzes & Assessments
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                      Assigned diagnostic multiple-choice question assessments. Click any quiz to inspect student submissions.
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Active Modules:</span>
                    <span style={{ padding: '4px 12px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', fontSize: 13, fontWeight: 800 }}>
                      {quizHomeworks.length} Quizzes
                    </span>
                  </div>
                </div>

                {/* Quizzes Table Card */}
                <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: FONT }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                        {['Quiz Title', 'Subject', 'Covered Chapters', 'Assigned Date', 'Due Date', 'Submissions', 'Actions'].map((h, i) => (
                          <th key={h} style={{ padding: '12px 18px', textAlign: i === 6 ? 'right' : 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {quizHomeworks.map((hw, i) => {
                        const dd = hw.description_data;
                        const subject = dd?.subject_name ?? dd?.subject ?? '—';
                        const chapters = dd?.chapters ?? [];
                        return (
                          <tr
                            key={hw.id}
                            onClick={() => loadHomeworkSubmissions(hw.id)}
                            style={{
                              borderBottom: i < quizHomeworks.length - 1 ? '1px solid #F1F5F9' : 'none',
                              cursor: 'pointer',
                              transition: 'background 120ms ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0F172A' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>{hw.title ?? hw.homework_code ?? `Quiz #${hw.id}`}</span>
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ padding: '3px 8px', borderRadius: 6, background: '#EEF2FF', color: '#4F46E5', fontWeight: 700, fontSize: 12 }}>
                                {subject}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {chapters.slice(0, 2).map((ch) => (
                                  <span key={ch} style={{ padding: '2px 8px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155', fontSize: '11.5px', fontWeight: 600 }}>
                                    {ch.replace(/_/g, ' ')}
                                  </span>
                                ))}
                                {chapters.length > 2 && (
                                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
                                    +{chapters.length - 2} more
                                  </span>
                                )}
                                {chapters.length === 0 && <span style={{ color: '#94A3B8' }}>—</span>}
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px', color: '#64748B', fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>
                              {hw.date_assigned ? new Date(hw.date_assigned).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '14px 18px', color: '#64748B', fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>
                              {hw.due_date ? new Date(hw.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ fontWeight: 800, color: '#4F46E5', fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>
                                {hw.total_submissions}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); loadHomeworkSubmissions(hw.id); }}
                                style={{
                                  padding: '5px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
                                  background: '#FFFFFF', color: '#4F46E5', fontSize: 12, fontWeight: 700,
                                  cursor: 'pointer', fontFamily: FONT,
                                }}
                              >
                                Submissions &rarr;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

        {/* ── Exams ────────────────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <TeacherAnalyticsPanel
            records={examRecords}
            examsLoading={teacherExamsLoading || (teacherExamsData === null && attemptsProgress === null)}
            attemptsProgress={attemptsProgress}
            onOpenExam={openExamFromAnalytics}
          />
        )}

        {activeTab === 'exam-correction' && (
          <ExamCorrectionPanel
            data={teacherExamsData}
            loading={teacherExamsLoading}
            records={examRecords}
            focusExamId={focusExamId}
            onFocusHandled={() => setFocusExamId(null)}
          />
        )}

        {activeTab === 'worksheet-progress' && (
          <WorksheetProgressPanel
            examsData={teacherExamsData}
            examsLoading={teacherExamsLoading}
            students={dashboardData.students}
          />
        )}

        {activeTab === 'mock-exams' && (
          <MockExamResults
            exams={mockExams ?? []}
            loading={mockExamsLoading}
            examClassOptions={mockExamClassOptions}
            examSectionOptions={mockExamSectionOptions}
            examClassFilter={mockExamClassFilter}
            examSectionFilter={mockExamSectionFilter}
            onExamFiltersChange={handleMockExamFiltersChange}
            selectedHomeworkId={selectedMockExamId}
            onSelectExam={handleSelectMockExam}
            results={mockExamResults}
            resultsLoading={mockExamResultsLoading}
            onFetchExamsForSection={fetchMockExamsForSection}
          />
        )}

        {/* ── Compare Mock Exams ───────────────────────────────────────────── */}
        {activeTab === 'compare-mock-exams' && (
          <CompareMockExams
            exams={mockExams ?? []}
            examClassOptions={mockExamClassOptions}
            examSectionOptions={mockExamSectionOptions}
            onFetchExamsForSection={fetchMockExamsForSection}
            compareExamIds={compareExamIds}
            compareResults={compareResults}
            compareLoading={compareLoading}
            onCompare={handleCompareExams}
            onExitCompare={handleExitCompare}
            teacherUsername={teacherUsername ?? ''}
          />
        )}

        {/* ── Mock Exam Analysis ───────────────────────────────────────────── */}
        {activeTab === 'mock-exam-analysis' && (
          <MockExamAnalysis
            exams={mockExams ?? []}
            loading={mockExamsLoading}
            selectedExamId={analysisExamId}
            onSelectExam={handleSelectAnalysisExam}
            examResults={analysisResults}
            resultsLoading={analysisResultsLoading}
            roster={dashboardData.students}
            onRefreshExams={() => loadMockExams()}
          />
        )}

        {/* ── Activity ─────────────────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          activityLoading ? (
            <div style={{ textAlign: 'center', padding: '64px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                {[0, 1, 2].map((i) => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', animation: `dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />)}
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Loading activity stream...</p>
            </div>
          ) : activityData ? <ActivityFeed data={activityData} /> : (
            <div style={{ textAlign: 'center', padding: '64px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', color: '#64748B', fontSize: '14px' }}>
              No learning activity recorded yet.
            </div>
          )
        )}

        {/* ── Pre-Assessment ───────────────────────────────────────────────── */}
        {activeTab === 'pre-assessment' && (
            testPrepLoading ? (
              <div style={{ textAlign: 'center', padding: '64px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4F46E5', animation: `dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#64748B', fontWeight: 600 }}>Loading spot check & diagnostic records...</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 18 }}>
                {/* Header Banner */}
                <div style={{
                  background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '22px 24px',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
                }}>
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                      Diagnostic Records
                    </div>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                      Spot Check & Diagnostic History
                    </h2>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
                      Review chapter mastery, peak test prep scores, and student assessment frequencies.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Matching Cohort:</span>
                    <span style={{ padding: '4px 12px', borderRadius: 8, background: '#EEF2FF', color: '#4F46E5', fontSize: 13, fontWeight: 800 }}>
                      {prepFilteredStudents.length} Students
                    </span>
                  </div>
                </div>

                {/* Filter bar */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Topic</span>
                      <select value={prepChapterFilter} onChange={(e) => setPrepChapterFilter(e.target.value)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '12.5px', fontFamily: FONT, cursor: 'pointer', outline: 'none' }}>
                        {prepChapterOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Min Attempts</span>
                      <select value={prepMinAttempts} onChange={(e) => setPrepMinAttempts(Number(e.target.value))} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '12.5px', fontFamily: FONT, cursor: 'pointer', outline: 'none' }}>
                        {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}+</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Min Score</span>
                      <select value={prepMinScore} onChange={(e) => setPrepMinScore(Number(e.target.value))} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '12.5px', fontFamily: FONT, cursor: 'pointer', outline: 'none' }}>
                        <option value={0}>Any Score</option>
                        {[40, 50, 60, 70, 80, 90].map((n) => <option key={n} value={n}>{n}%</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Class</span>
                      <select value={prepClassFilter} onChange={(e) => { setPrepClassFilter(e.target.value); setPrepSectionFilter('All'); }} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '12.5px', fontFamily: FONT, cursor: 'pointer', outline: 'none' }}>
                        {prepClassOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Section</span>
                      <select value={prepSectionFilter} onChange={(e) => setPrepSectionFilter(e.target.value)} style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#0F172A', fontSize: '12.5px', fontFamily: FONT, cursor: 'pointer', outline: 'none' }}>
                        {prepSectionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => { setPrepChapterFilter('All'); setPrepClassFilter('All'); setPrepSectionFilter('All'); setPrepMinAttempts(1); setPrepMinScore(0); }}
                    style={{
                      padding: '7px 14px', borderRadius: '8px', border: '1px solid #E2E8F0',
                      background: '#F8FAFC', color: '#475569', fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: FONT,
                    }}
                  >
                    Reset Filters
                  </button>
                </div>

                {/* Pre-Assessment Table */}
                {prepFilteredStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', color: '#64748B', fontSize: '14px' }}>
                    No student diagnostic attempts match the selected criteria.
                  </div>
                ) : (
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: FONT }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                          {['Student', 'Class', 'Tested Chapters', 'Attempts', 'Peak Score', 'Average Performance', 'Recent Attempt'].map((h) => (
                            <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prepFilteredStudents.map((student, i) => {
                          let items = testPrepByStudentId.get(student.student_id) ?? [];
                          if (prepChapterFilter !== 'All') items = items.filter((item) => getItemChapters(item).includes(prepChapterFilter));
                          const scores = items.map(getPrepItemScore);
                          const bestScore = scores.length ? Math.max(...scores) : 0;
                          const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                          const chapters = [...new Set(items.flatMap(getItemChapters))];
                          const lastAttempt = items.length
                            ? items.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
                            : null;
                          const classLabel = items[0]?.class_name ?? student.grade ?? '—';

                          return (
                            <tr key={student.student_id} style={{ borderBottom: i < prepFilteredStudents.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                              <td style={{ padding: '14px 18px' }}>
                                <button onClick={() => setViewStudentId(student.student_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{student.full_name}</div>
                                  <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>{student.section ? `Section ${student.section}` : student.email}</div>
                                </button>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{ padding: '3px 8px', borderRadius: 6, background: '#F1F5F9', fontWeight: 700, color: '#0F172A', fontSize: 12 }}>
                                  {classLabel}
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {chapters.slice(0, 3).map((ch) => (
                                    <span key={ch} style={{ padding: '2px 8px', borderRadius: '6px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#334155', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      {ch}
                                    </span>
                                  ))}
                                  {chapters.length > 3 && (
                                    <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', fontSize: '11px', fontWeight: 600 }}>
                                      +{chapters.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px', fontWeight: 800, color: '#0F172A', fontVariantNumeric: 'tabular-nums' }}>
                                {items.length}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 8px', borderRadius: 6,
                                  background: bestScore >= 70 ? '#ECFDF5' : bestScore >= 50 ? '#FFFBEB' : '#FFF1F2',
                                  color: scoreColor(bestScore), fontWeight: 800, fontSize: '13px', fontVariantNumeric: 'tabular-nums',
                                }}>
                                  {bestScore}%
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#F1F5F9', minWidth: '70px', overflow: 'hidden' }}>
                                    <div style={{ width: `${avgScore}%`, height: '100%', borderRadius: '999px', background: scoreColor(avgScore) }} />
                                  </div>
                                  <span style={{ fontWeight: 700, color: scoreColor(avgScore), minWidth: '36px', fontVariantNumeric: 'tabular-nums' }}>
                                    {avgScore}%
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 18px', color: '#64748B', fontSize: '12px', fontVariantNumeric: 'tabular-nums' }}>
                                {lastAttempt ? new Date(lastAttempt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          )}

        </div>{/* end page content */}
      </div>{/* end main area */}

      {/* Modals */}
      {viewStudentId !== null && (
        <StudentDetailModal studentId={viewStudentId} onClose={() => setViewStudentId(null)} />
      )}
      {showAlertModal && selectedStudentId && (
        <SendAlertModal
          studentId={selectedStudentId}
          studentName={dashboardData.students.find((s) => s.student_id === selectedStudentId)?.full_name}
          onClose={() => { setShowAlertModal(false); setSelectedStudentId(null); }}
          onSend={handleSendAlertSubmit}
        />
      )}
      {showChallengeModal && challengeStudentId && (
        <SendChallengeModal
          studentId={challengeStudentId}
          studentName={dashboardData.students.find((s) => s.student_id === challengeStudentId)?.full_name}
          studentGrade={dashboardData.students.find((s) => s.student_id === challengeStudentId)?.grade || undefined}
          onClose={() => { setShowChallengeModal(false); setChallengeStudentId(null); }}
          onSend={handleSendChallengeSubmit}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;
