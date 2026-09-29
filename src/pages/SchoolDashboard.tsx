import React, { useState, useEffect, useRef, useMemo } from 'react';
import { dashboardAPI, alertAPI, activityAPI } from '../services/api';
import { SchoolDashboardData, ActivityOverview, StudentEngagementSummary, TestPrepItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../context/DashboardContext';
import MetricsCards from '../components/MetricsCards';
import StudentTable from '../components/StudentTable';
import SendAlertModal from '../components/SendAlertModal';
import ActivityFeed from '../components/ActivityFeed';
import StudentDetailModal from '../components/StudentDetailModal';
import { SchoolAnalytics } from '../components/AnalyticsSections';
import TimelineUpload from '../components/TimelineUpload';
import SmartLoadingScreen from '../components/SmartLoadingScreen';
import T from '../theme/tokens';
import DashboardIcon from '../components/DashboardIcon';

const FONT = T.font.sans;
const FONT_SERIF = T.font.display;

/* ─── Reusable helpers scoped to this page ────────────────────────── */
const scoreColor = (s: number) =>
  s >= 70 ? T.color.success.solid : s >= 50 ? T.color.warning.solid : T.color.danger.solid;

const eyebrowStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: T.text.tertiary,
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 10,
  border: `1px solid ${T.border.subtle}`, background: '#FFFFFF',
  color: T.text.primary, fontSize: 13, fontWeight: 500,
  fontFamily: FONT, cursor: 'pointer', outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
};

const SchoolDashboard: React.FC = () => {
  const { user } = useAuth();
  const { setDashboardData } = useDashboard();
  const lastSchoolDashboardRequestRef = useRef<string | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [viewStudentId, setViewStudentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'activity' | 'pre-assessment' | 'timeline'>('students');
  const [activityData, setActivityData] = useState<ActivityOverview | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [testPrepData, setTestPrepData] = useState<TestPrepItem[] | null>(null);
  const [testPrepLoading, setTestPrepLoading] = useState(false);
  const [prepChapterFilter, setPrepChapterFilter] = useState<string>('All');
  const [prepClassFilter, setPrepClassFilter] = useState<string>('All');
  const [prepSectionFilter, setPrepSectionFilter] = useState<string>('All');
  const [prepMinAttempts, setPrepMinAttempts] = useState<number>(1);
  const [prepMinScore, setPrepMinScore] = useState<number>(0);
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const schoolCode = user?.school_code || '';

  const dayFilterOptions = [
    { label: 'All', value: null },
    { label: 'Today', value: 0 },
    { label: '1 Day', value: 1 },
    { label: '2 Days', value: 2 },
    { label: '7 Days', value: 7 },
  ] as const;

  const filterByDays = (users: StudentEngagementSummary[]) => {
    if (dayFilter === null) return users;
    return users.filter((u) => {
      if (u.auth_provider === 'google') return true;
      if (u.days_since_login === null || u.days_since_login === undefined) return false;
      return u.days_since_login <= dayFilter;
    });
  };

  const loadDashboard = async () => {
    if (!schoolCode) {
      setError('No school code provided. Please log in again with a valid school code.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await dashboardAPI.getSchoolDashboardByCode(schoolCode);
      setSchoolData(data);
      setDashboardData(data);
      setError('');
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError(`School code "${schoolCode}" not found. Please check your school code and try again.`);
      } else {
        setError('Failed to load dashboard. Please check if the API is running.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    if (activityData || !schoolData) return;
    try {
      setActivityLoading(true);
      const data = await activityAPI.getSchoolActivity(schoolData.school_id);
      setActivityData(data);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadTestPrep = async () => {
    if (testPrepData || !schoolCode) return;
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

  const testPrepByStudentId = useMemo(() => {
    const map = new Map<number, TestPrepItem[]>();
    if (!testPrepData) return map;
    for (const item of testPrepData) {
      if (!item.student_id) continue;
      const list = map.get(item.student_id) ?? [];
      list.push(item);
      map.set(item.student_id, list);
    }
    return map;
  }, [testPrepData]);

  const getPrepItemScore = (item: TestPrepItem) =>
    Number(item.graph_data?.score_pct ?? item.analysis?.analysis?.score_pct ?? item.analysis?.prediction?.score_pct ?? 0);

  const getItemChapters = (item: TestPrepItem): string[] => {
    const breakdown: any[] = item.graph_data?.chapter_breakdown ?? [];
    if (breakdown.length > 0) {
      const chapters = breakdown.map((e: any) => String(e.chapter || '')).filter(Boolean);
      if (chapters.length > 0) return chapters;
    }
    const qChapters = (item.questions ?? [])
      .map((q: any) => String(q.chapter || ''))
      .filter(Boolean);
    if (qChapters.length > 0) return [...new Set(qChapters)];
    return [];
  };

  const prepChapterOptions = useMemo(() => {
    if (!testPrepData) return ['All'];
    const chapters = new Set<string>();
    for (const item of testPrepData) {
      for (const ch of getItemChapters(item)) chapters.add(ch);
    }
    return ['All', ...Array.from(chapters).sort((a, b) => a.localeCompare(b))];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testPrepData]);

  const prepClassOptions = useMemo(() => {
    if (!testPrepData) return ['All'];
    const classes = new Set<string>();
    for (const item of testPrepData) {
      if (item.class_name) classes.add(String(item.class_name));
    }
    return ['All', ...Array.from(classes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
  }, [testPrepData]);

  const prepSectionOptions = useMemo(() => {
    if (!testPrepData) return ['All'];
    const sections = new Set<string>();
    for (const item of testPrepData) {
      if (prepClassFilter !== 'All' && String(item.class_name) !== prepClassFilter) continue;
      if (item.section_name) sections.add(String(item.section_name));
    }
    return ['All', ...Array.from(sections).sort()];
  }, [testPrepData, prepClassFilter]);

  const prepFilteredStudents = useMemo(() => {
    if (!testPrepData || !schoolData) return [];
    return schoolData.students.filter((student) => {
      if (!student.student_id) return false;
      let items = testPrepByStudentId.get(student.student_id) ?? [];
      if (prepChapterFilter !== 'All') {
        items = items.filter((item) => getItemChapters(item).includes(prepChapterFilter));
      }
      if (prepClassFilter !== 'All') {
        items = items.filter((item) => String(item.class_name) === prepClassFilter);
      }
      if (prepSectionFilter !== 'All') {
        items = items.filter((item) => String(item.section_name) === prepSectionFilter);
      }
      if (items.length < prepMinAttempts) return false;
      if (prepMinScore > 0) {
        const hasPassingScore = items.some((item) => getPrepItemScore(item) >= prepMinScore);
        if (!hasPassingScore) return false;
      }
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testPrepData, schoolData, testPrepByStudentId, prepChapterFilter, prepClassFilter, prepSectionFilter, prepMinAttempts, prepMinScore]);

  useEffect(() => {
    if (!schoolCode) return;
    if (lastSchoolDashboardRequestRef.current === schoolCode) return;
    lastSchoolDashboardRequestRef.current = schoolCode;
    loadDashboard();
  }, [schoolCode]);

  const handleSendAlert = (studentId: number) => {
    setSelectedStudentId(studentId);
    setShowAlertModal(true);
  };

  const handleSendAlertSubmit = async (studentId: number) => {
    await alertAPI.sendAlert({ student_id: studentId });
    await loadDashboard();
  };

  const handleSendBulkAlert = async () => {
    if (selectedIds.size === 0) {
      alert('No students selected. Use the checkboxes to select students.');
      return;
    }
    const confirmed = window.confirm(`Send WhatsApp alerts to ${selectedIds.size} selected students?`);
    if (!confirmed) return;
    try {
      setBulkSending(true);
      const results = await alertAPI.sendBulkAlert({ student_ids: Array.from(selectedIds) });
      const sent = results.filter((r) => r.success).length;
      setSelectedIds(new Set());
      await loadDashboard();
      alert(`Alerts sent: ${sent}/${selectedIds.size} students.`);
    } catch (err) {
      alert('Failed to send bulk alerts');
      console.error(err);
    } finally {
      setBulkSending(false);
    }
  };

  /* ─── Loading state ─────────────────────────────────────────── */
  if (loading) {
    return <SmartLoadingScreen durationMs={4200} />;
  }

  if (error || !schoolData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)', fontFamily: FONT, background: T.surface.canvas, padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 420, padding: 36, background: '#FFFFFF', borderRadius: 20, border: `1px solid ${T.border.subtle}`, boxShadow: T.shadow.lg }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.color.danger.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <svg width="26" height="26" fill="none" stroke={T.color.danger.solid} strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
            </svg>
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: T.text.primary, fontFamily: FONT_SERIF, letterSpacing: '-0.01em' }}>Connection Error</h2>
          <p style={{ margin: '0 0 22px', fontSize: 14, color: T.text.secondary, lineHeight: 1.6 }}>{error}</p>
          <button onClick={loadDashboard} style={{
            padding: '11px 22px', borderRadius: 12, border: 'none',
            background: `linear-gradient(180deg, ${T.color.brand[600]}, ${T.color.brand[700]})`,
            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            boxShadow: T.shadow.brand,
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredStudentsList = filterByDays(schoolData.students);
  const filteredTeachersList = filterByDays(schoolData.teachers);
  const allUsers = [...schoolData.students, ...schoolData.teachers];
  const displayUsers = activeTab === 'students' ? filteredStudentsList : filteredTeachersList;

  const tabs = [
    { key: 'students' as const, label: 'Students', count: filteredStudentsList.length },
    { key: 'pre-assessment' as const, label: 'Spot Check', count: testPrepData ? prepFilteredStudents.length : null },
    { key: 'activity' as const, label: 'Activity', count: null },
    { key: 'timeline' as const, label: 'Timeline', count: null },
  ];

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="sl-school-layout" style={{ minHeight: 'calc(100vh - 64px)', fontFamily: FONT, background: T.surface.canvas }}>
      <aside className="sl-school-sidebar" aria-label="School navigation">
        <div className="sl-school-identity">
          <span className="sl-school-mark"><DashboardIcon name="cap" size={24} /></span>
          <div><strong>School workspace</strong><span>{schoolCode}</span></div>
        </div>
        <div className="sl-nav-caption">WORKSPACE</div>
        <button className="sl-school-nav" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <DashboardIcon name="grid" size={18} /><span>Overview</span>
        </button>
        <div className="sl-nav-caption" style={{ marginTop: 24 }}>MANAGEMENT</div>
        {tabs.map((tab) => (
          <button key={tab.key} className="sl-school-nav" aria-current={activeTab === tab.key ? 'page' : undefined}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'activity') loadActivity();
              if (tab.key === 'pre-assessment') loadTestPrep();
              document.getElementById('school-records')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}>
            <DashboardIcon name={tab.key === 'activity' ? 'clock' : tab.key === 'timeline' ? 'calendar' : tab.key === 'pre-assessment' ? 'target' : 'users'} size={18} />
            <span>{tab.label}</span>
            {tab.count !== null && <small>{tab.count}</small>}
          </button>
        ))}
        <div className="sl-school-sidebar-note"><DashboardIcon name="cap" size={20} /><strong>Every learner matters.</strong><span>A clearer view of learning, engagement, and progress.</span></div>
      </aside>
      <main className="sl-school-main">

      {/* ─── Page header ─────────────────────────────────────── */}
      <div className="sl-school-header" style={{
        borderBottom: `1px solid ${T.border.subtle}`,
        background: '#FFFFFF',
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px 22px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {dateLabel}
              </div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: T.text.primary, letterSpacing: '-0.035em', fontFamily: FONT, lineHeight: 1.25 }}>
                {schoolData.school_name}
              </h1>
              <p style={{ margin: '8px 0 14px', color: T.text.tertiary, fontSize: 13 }}>Your school at a glance. Explore engagement, learning outcomes, and student activity.</p>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '4px 10px 4px 8px', borderRadius: 999,
                  background: '#FFFFFF', border: `1px solid ${T.border.subtle}`,
                  fontSize: 12, fontWeight: 600, color: T.text.secondary,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: T.color.info.solid }} />
                  {schoolData.students.length} Students
                </span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '4px 10px 4px 8px', borderRadius: 999,
                  background: '#FFFFFF', border: `1px solid ${T.border.subtle}`,
                  fontSize: 12, fontWeight: 600, color: T.text.secondary,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: T.color.success.solid, boxShadow: `0 0 0 3px ${T.color.success.bg}` }} />
                  {schoolData.active_this_week} Active this week
                </span>
              </div>
            </div>
            <button onClick={loadDashboard} style={{
              padding: '10px 16px', borderRadius: 12,
              border: `1px solid ${T.border.subtle}`,
              background: '#FFFFFF',
              color: T.text.primary,
              fontSize: 13, fontWeight: 700, fontFamily: FONT,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: T.shadow.xs,
              transition: `transform 150ms ${T.motion.ease.spring}, box-shadow 150ms`,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = T.shadow.sm; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadow.xs; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────── */}
      <div className="sl-school-content" style={{ maxWidth: 1440, margin: '0 auto', padding: '24px' }}>

        <MetricsCards
          totalStudents={schoolData.total_students}
          activeStudents={schoolData.active_this_week}
          activeSessions={schoolData.active_sessions}
          atRiskStudents={schoolData.at_risk_count}
          inactiveStudents={schoolData.inactive_count}
          totalSessions={schoolData.total_sessions_this_week}
          trend={schoolData.engagement_trend}
          students={schoolData.students}
        />

        <div style={{ marginTop: 24 }}>
          <SchoolAnalytics students={schoolData.students} trend={schoolData.engagement_trend} />
        </div>

        {/* Tabs + filter row */}
        <div id="school-records" style={{ marginTop: 28, scrollMarginTop: 88 }}>
          <div style={{ marginBottom: 16 }}><h2 style={{ margin: 0, fontSize: 19, letterSpacing: '-0.025em' }}>School directory & activity</h2><p style={{ margin: '5px 0 0', fontSize: 13, color: T.text.tertiary }}>Find people, review participation, and manage follow-up.</p></div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 14,
          }}>
            {/* Tab pill group */}
            <div style={{
              display: 'inline-flex', flexWrap: 'wrap', padding: 4, borderRadius: 12,
              background: '#FFFFFF', border: `1px solid ${T.border.subtle}`,
              boxShadow: T.shadow.xs,
            }}>
              {tabs.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => {
                      setActiveTab(t.key);
                      if (t.key === 'activity') loadActivity();
                      if (t.key === 'pre-assessment') loadTestPrep();
                    }}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: isActive ? T.color.brand[600] : 'transparent',
                      color: isActive ? '#FFFFFF' : T.text.secondary,
                      fontSize: 13, fontWeight: 700, fontFamily: FONT,
                      cursor: 'pointer', transition: 'background 150ms, color 150ms',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {t.label}
                    {t.count !== null && (
                      <span style={{
                        padding: '1px 7px', borderRadius: 999,
                        background: isActive ? 'rgba(255,255,255,0.22)' : T.color.neutral[100],
                        color: isActive ? '#FFFFFF' : T.text.tertiary,
                        fontSize: 11, fontWeight: 700,
                      }}>{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {selectedIds.size > 0 && activeTab === 'students' && (
                <button onClick={handleSendBulkAlert} disabled={bulkSending} style={{
                  padding: '8px 14px', borderRadius: 10, border: 'none',
                  background: `linear-gradient(180deg, ${T.color.success.solid}, #059669)`,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: bulkSending ? 'wait' : 'pointer', fontFamily: FONT,
                  opacity: bulkSending ? 0.65 : 1,
                  boxShadow: '0 6px 14px rgba(16,185,129,0.28)',
                }}>
                  {bulkSending ? 'Sending…' : `Alert ${selectedIds.size} selected`}
                </button>
              )}

              {activeTab !== 'activity' && activeTab !== 'pre-assessment' && (
                <div style={{
                  display: 'inline-flex', padding: 4, borderRadius: 10,
                  background: '#FFFFFF', border: `1px solid ${T.border.subtle}`, boxShadow: T.shadow.xs,
                }}>
                  {dayFilterOptions.map((opt) => {
                    const isActive = dayFilter === opt.value;
                    return (
                      <button key={String(opt.value)} onClick={() => setDayFilter(opt.value)} style={{
                        padding: '6px 12px', borderRadius: 7, border: 'none',
                        background: isActive ? T.color.brand.tint : 'transparent',
                        color: isActive ? T.color.brand[700] : T.text.tertiary,
                        fontSize: 12, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
                        transition: 'background 150ms, color 150ms',
                      }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tab content */}
          {activeTab === 'activity' ? (
            activityLoading ? (
              <LoadingBlock label="Loading activity…" color={T.color.success.solid} />
            ) : activityData ? (
              <ActivityFeed data={activityData} />
            ) : (
              <EmptyBlock title="No activity yet" body="Activity will appear here as students engage with the platform." />
            )
          ) : activeTab === 'pre-assessment' ? (
            testPrepLoading ? (
              <LoadingBlock label="Loading spot check data…" />
            ) : (
              <div>
                {/* Filter bar */}
                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end',
                  justifyContent: 'space-between', padding: '18px 20px',
                  background: '#FFFFFF', borderRadius: 14, border: `1px solid ${T.border.subtle}`,
                  marginBottom: 16, boxShadow: T.shadow.xs,
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end', minWidth: 0, maxWidth: '100%' }}>
                    <div style={{ minWidth: 0, maxWidth: '100%' }}>
                      <div style={eyebrowStyle}>Chapter</div>
                      <select value={prepChapterFilter} onChange={(e) => setPrepChapterFilter(e.target.value)} style={{ ...selectStyle, width: 260, maxWidth: '100%' }}>
                        {prepChapterOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={eyebrowStyle}>Min Attempts</div>
                      <select value={prepMinAttempts} onChange={(e) => setPrepMinAttempts(Number(e.target.value))} style={selectStyle}>
                        {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}+</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={eyebrowStyle}>Score ≥</div>
                      <select value={prepMinScore} onChange={(e) => setPrepMinScore(Number(e.target.value))} style={selectStyle}>
                        <option value={0}>Any score</option>
                        {[40, 50, 60, 70, 80, 90].map((n) => <option key={n} value={n}>{n}%</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
                    <div>
                      <div style={eyebrowStyle}>Class</div>
                      <select value={prepClassFilter} onChange={(e) => { setPrepClassFilter(e.target.value); setPrepSectionFilter('All'); }} style={{ ...selectStyle, minWidth: 110 }}>
                        {prepClassOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={eyebrowStyle}>Section</div>
                      <select value={prepSectionFilter} onChange={(e) => setPrepSectionFilter(e.target.value)} style={{ ...selectStyle, minWidth: 110 }}>
                        {prepSectionOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 11, color: T.text.tertiary, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Matches</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: T.color.brand[700], fontFamily: FONT_SERIF }}>{prepFilteredStudents.length}</span>
                      </div>
                      <button
                        onClick={() => { setPrepChapterFilter('All'); setPrepClassFilter('All'); setPrepSectionFilter('All'); setPrepMinAttempts(1); setPrepMinScore(0); }}
                        style={{
                          padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.border.subtle}`,
                          background: '#FFFFFF', color: T.text.secondary, fontSize: 12, fontWeight: 700,
                          cursor: 'pointer', fontFamily: FONT,
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {prepFilteredStudents.length === 0 ? (
                  <EmptyBlock title="No students match" body="Try loosening the chapter, class, or score filters above." />
                ) : (
                  <div style={{ background: '#FFFFFF', borderRadius: 14, border: `1px solid ${T.border.subtle}`, overflowX: 'auto', boxShadow: T.shadow.sm }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: FONT }}>
                      <thead>
                        <tr style={{ background: T.color.neutral[50] }}>
                          {['Student', 'Class', 'Chapters', 'Attempts', 'Best', 'Average', 'Last Attempt'].map((h) => (
                            <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {prepFilteredStudents.map((student, i) => {
                          let items = testPrepByStudentId.get(student.student_id) ?? [];
                          if (prepChapterFilter !== 'All') {
                            items = items.filter((item) => getItemChapters(item).includes(prepChapterFilter));
                          }
                          const scores = items.map((item) => getPrepItemScore(item));
                          const bestScore = scores.length ? Math.max(...scores) : 0;
                          const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                          const chapters = [...new Set(items.flatMap((item) => getItemChapters(item)))];
                          const lastAttempt = items.length ? items.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at : null;
                          const classLabel = items[0]?.class_name ?? student.grade ?? '—';

                          return (
                            <tr key={student.student_id} style={{
                              borderTop: `1px solid ${T.border.subtle}`,
                              background: '#FFFFFF',
                              transition: 'background 120ms',
                            }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = T.color.neutral[25])}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                            >
                              <td style={{ padding: '14px 16px' }}>
                                <button onClick={() => setViewStudentId(student.student_id)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                                  <div style={{ fontWeight: 700, color: T.text.primary, fontSize: 14 }}>{student.full_name}</div>
                                  <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 2 }}>{student.section ?? ''}</div>
                                </button>
                              </td>
                              <td style={{ padding: '14px 16px', color: T.text.secondary }}>{classLabel}</td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {chapters.slice(0, 3).map((ch) => (
                                    <span key={ch} style={{ padding: '3px 8px', borderRadius: 999, background: T.color.brand.tint, color: T.color.brand[700], fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>{ch}</span>
                                  ))}
                                  {chapters.length > 3 && <span style={{ padding: '3px 8px', borderRadius: 999, background: T.color.neutral[100], color: T.text.tertiary, fontSize: 11, fontWeight: 700 }}>+{chapters.length - 3}</span>}
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', fontWeight: 700, color: T.text.primary }}>{items.length}</td>
                              <td style={{ padding: '14px 16px' }}>
                                <span style={{ fontWeight: 700, color: scoreColor(bestScore), fontSize: 14 }}>{bestScore}%</span>
                              </td>
                              <td style={{ padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ flex: 1, height: 6, borderRadius: 999, background: T.color.neutral[100], minWidth: 70, overflow: 'hidden' }}>
                                    <div style={{ width: `${avgScore}%`, height: '100%', borderRadius: 999, background: scoreColor(avgScore) }} />
                                  </div>
                                  <span style={{ fontWeight: 700, color: scoreColor(avgScore), minWidth: 34 }}>{avgScore}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '14px 16px', color: T.text.tertiary, fontSize: 12 }}>
                                {lastAttempt ? new Date(lastAttempt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
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
          ) : activeTab === 'timeline' ? (
            <TimelineUpload schoolCode={schoolCode} />
          ) : (
            <StudentTable
              students={displayUsers}
              onSendAlert={handleSendAlert}
              onViewDetails={(studentId) => setViewStudentId(studentId)}
              selectedIds={activeTab === 'students' ? selectedIds : undefined}
              onSelectionChange={activeTab === 'students' ? setSelectedIds : undefined}
            />
          )}
        </div>

        {/* Recent Alerts */}
        {schoolData.recent_alerts.length > 0 && (
          <div style={{ marginTop: 28, background: '#FFFFFF', borderRadius: 16, border: `1px solid ${T.border.subtle}`, overflow: 'hidden', boxShadow: T.shadow.sm }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border.subtle}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 10, background: T.color.warning.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="16" height="16" fill="none" stroke={T.color.warning.solid} strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text.primary, fontFamily: FONT_SERIF, letterSpacing: '-0.01em' }}>Recent Alerts</h2>
              <span style={{ padding: '2px 8px', borderRadius: 999, background: T.color.warning.bg, fontSize: 11, fontWeight: 700, color: T.color.warning.text }}>{schoolData.recent_alerts.length}</span>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {schoolData.recent_alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 12,
                  background: T.color.neutral[50], border: `1px solid ${T.border.subtle}`,
                }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: T.text.primary }}>Student #{alert.student_id}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: T.text.secondary }}>{alert.reason}</p>
                  </div>
                  <button onClick={() => handleSendAlert(alert.student_id)} style={{
                    padding: '7px 14px', borderRadius: 10, border: `1px solid ${T.color.success.border}`,
                    background: T.color.success.bg, color: T.color.success.text,
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
                    transition: 'background 150ms',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.18)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.color.success.bg; }}
                  >
                    Send Alert
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      </main>
      {viewStudentId !== null && (
        <StudentDetailModal studentId={viewStudentId} onClose={() => setViewStudentId(null)} />
      )}
      {showAlertModal && selectedStudentId && (
        <SendAlertModal
          studentId={selectedStudentId}
          studentName={allUsers.find((s) => s.student_id === selectedStudentId)?.full_name}
          onClose={() => { setShowAlertModal(false); setSelectedStudentId(null); }}
          onSend={handleSendAlertSubmit}
        />
      )}
    </div>
  );
};

/* ─── Small helpers used only in this page ───────────────────────── */
const LoadingBlock: React.FC<{ label: string; color?: string }> = ({ label, color = T.color.brand[600] }) => (
  <div style={{ textAlign: 'center', padding: '60px 24px' }}>
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: 999, background: color, animation: `dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />
      ))}
    </div>
    <p style={{ margin: 0, fontSize: 13, color: T.text.tertiary, fontWeight: 600 }}>{label}</p>
  </div>
);

const EmptyBlock: React.FC<{ title: string; body?: string }> = ({ title, body }) => (
  <div style={{
    textAlign: 'center', padding: '48px 24px',
    background: '#FFFFFF', border: `1px dashed ${T.border.strong}`, borderRadius: 14,
  }}>
    <div style={{ width: 40, height: 40, borderRadius: 12, background: T.color.neutral[100], margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text.tertiary }}>
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
      </svg>
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, color: T.text.secondary }}>{title}</div>
    {body && <div style={{ marginTop: 4, fontSize: 12, color: T.text.tertiary }}>{body}</div>}
  </div>
);

export default SchoolDashboard;
