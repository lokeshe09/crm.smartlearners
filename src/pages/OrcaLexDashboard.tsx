import React, { useState, useEffect } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { dashboardAPI, activityAPI } from '../services/api';
import { OrcaLexDashboardData, ActivityOverview, EngagementStatus } from '../types';
import StudentTable from '../components/StudentTable';
import ActivityFeed from '../components/ActivityFeed';
import StudentDetailModal from '../components/StudentDetailModal';
import { AdminAnalytics } from '../components/AnalyticsSections';
import MockExamEngagementScatter from '../components/MockExamEngagementScatter';
import SmartLoadingScreen from '../components/SmartLoadingScreen';
import T from '../theme/tokens';

const FONT = T.font.sans;
const FONT_SERIF = T.font.display;

const OrcaLexDashboard: React.FC = () => {
  const { setDashboardData } = useDashboard();
  const [data, setData] = useState<OrcaLexDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'activity'>('students');
  const [activityData, setActivityData] = useState<ActivityOverview | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [dayFilter, setDayFilter] = useState<number | null>(null);
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [viewStudentId, setViewStudentId] = useState<number | null>(null);

  const loadSchoolActivity = async (schoolId: number) => {
    try {
      setActivityLoading(true);
      const result = await activityAPI.getSchoolActivity(schoolId);
      setActivityData(result);
    } catch (err) {
      console.error('Failed to load activity:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const result = await dashboardAPI.getOrcaLexDashboard();
      setData(result);
      setDashboardData(result);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    if (!data || schoolFilter === 'all') {
      setActivityData(null);
      return;
    }
    const school = data.schools.find(s => String(s.school_id) === schoolFilter);
    if (school) loadSchoolActivity(school.school_id);
  }, [schoolFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <SmartLoadingScreen durationMs={4200} />;
  }

  if (error || !data) {
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

  const dayFilterOptions = [
    { label: 'All', value: null },
    { label: 'Today', value: 0 },
    { label: '1 Day', value: 1 },
    { label: '2 Days', value: 2 },
    { label: '7 Days', value: 7 },
  ] as const;

  const filterByDays = (users: typeof data.all_students) => {
    if (dayFilter === null) return users;
    return users.filter((u) => {
      if (u.auth_provider === 'google') return true;
      if (u.days_since_login === null || u.days_since_login === undefined) return false;
      return u.days_since_login <= dayFilter;
    });
  };

  const filterBySchool = (users: typeof data.all_students) => {
    if (schoolFilter === 'all') return users;
    const sid = parseInt(schoolFilter);
    return users.filter(u => u.school_id === sid);
  };

  const filteredStudents = filterBySchool(filterByDays(data.all_students));
  const filteredTeachers = filterBySchool(filterByDays(data.all_teachers));

  const activeCount = filteredStudents.filter(s => s.engagement_status === EngagementStatus.ACTIVE).length
    + filteredTeachers.filter(s => s.engagement_status === EngagementStatus.ACTIVE).length;
  const atRiskCount = filteredStudents.filter(s => s.engagement_status === EngagementStatus.AT_RISK).length
    + filteredTeachers.filter(s => s.engagement_status === EngagementStatus.AT_RISK).length;
  const inactiveCount = filteredStudents.filter(s => s.engagement_status === EngagementStatus.INACTIVE).length
    + filteredTeachers.filter(s => s.engagement_status === EngagementStatus.INACTIVE).length;
  const totalFiltered = filteredStudents.length + filteredTeachers.length;
  const activePct = totalFiltered > 0 ? Math.round((activeCount / totalFiltered) * 100) : 0;
  const atRiskPct = totalFiltered > 0 ? Math.round((atRiskCount / totalFiltered) * 100) : 0;
  const inactivePct = totalFiltered > 0 ? Math.round((inactiveCount / totalFiltered) * 100) : 0;

  const topMetrics = [
    { label: 'Schools', value: data.total_schools, color: T.color.brand[600], icon: 'M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11' },
    { label: 'Students', value: filteredStudents.length, color: T.color.info.solid, icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
    { label: 'Teachers', value: filteredTeachers.length, color: '#8B5CF6', icon: 'M22 11 12 16 2 11l10-5 10 5zM6 13v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5' },
    { label: 'Live Sessions', value: data.active_sessions, color: '#06B6D4', icon: 'M2 12h4l3-9 6 18 3-9h4' },
  ];

  const statusCards = [
    { label: 'Active', value: activeCount, pct: activePct, color: T.color.success.solid, bg: T.color.success.bg, border: T.color.success.border },
    { label: 'At-Risk', value: atRiskCount, pct: atRiskPct, color: T.color.warning.solid, bg: T.color.warning.bg, border: T.color.warning.border },
    { label: 'Inactive', value: inactiveCount, pct: inactivePct, color: T.color.danger.solid, bg: T.color.danger.bg, border: T.color.danger.border },
  ];

  const tabs = [
    { key: 'students' as const, label: 'Students', count: filteredStudents.length },
    { key: 'teachers' as const, label: 'Teachers', count: filteredTeachers.length },
    { key: 'activity' as const, label: 'Activity', count: null },
  ];

  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', fontFamily: FONT, background: T.surface.canvas }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        borderBottom: `1px solid ${T.border.subtle}`,
        background: `linear-gradient(180deg, ${T.color.brand[50]} 0%, ${T.surface.canvas} 100%)`,
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px 22px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                {dateLabel}
              </div>
              <h1 style={{ margin: 0, fontSize: 30, fontWeight: 600, color: T.text.primary, letterSpacing: '-0.03em', fontFamily: FONT_SERIF, lineHeight: 1.15 }}>
                Platform Overview
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: T.text.tertiary, fontWeight: 500 }}>
                Cross-school insights across the Smartlearners.ai platform.
              </p>
            </div>
            <button onClick={loadDashboard} style={{
              padding: '10px 16px', borderRadius: 12,
              border: `1px solid ${T.border.subtle}`, background: '#FFFFFF',
              color: T.text.primary, fontSize: 13, fontWeight: 700, fontFamily: FONT, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, boxShadow: T.shadow.xs,
              transition: `transform 150ms ${T.motion.ease.spring}, box-shadow 150ms`,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = T.shadow.sm; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadow.xs; }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M23 4v6h-6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '20px 24px' }}>

        {/* ── Metric grid ─────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
          {topMetrics.map((m, i) => (
            <div key={m.label} style={{
              background: '#FFFFFF', borderRadius: 14, border: `1px solid ${T.border.subtle}`,
              padding: '16px 18px', boxShadow: T.shadow.xs,
              animation: `entrance-stagger 300ms ${T.motion.ease.spring} ${i * 40}ms both`,
              transition: 'box-shadow 150ms, transform 150ms',
              display: 'flex', alignItems: 'center', gap: 14,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = T.shadow.md; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadow.xs; }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${m.color}18`, color: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <path d={m.icon} />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{m.label}</div>
                <div style={{ marginTop: 2, fontSize: 24, fontWeight: 700, color: T.text.primary, fontFamily: FONT_SERIF, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{m.value}</div>
              </div>
            </div>
          ))}

          {statusCards.map((s, i) => (
            <div key={s.label} style={{
              background: '#FFFFFF', borderRadius: 14, border: `1px solid ${T.border.subtle}`,
              padding: '16px 18px', boxShadow: T.shadow.xs,
              animation: `entrance-stagger 300ms ${T.motion.ease.spring} ${(i + 4) * 40}ms both`,
              transition: 'box-shadow 150ms, transform 150ms',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = T.shadow.md; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = T.shadow.xs; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontSize: 11, fontWeight: 700 }}>{s.pct}%</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: T.text.primary, fontFamily: FONT_SERIF, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{s.value}</div>
              <div style={{ marginTop: 10, height: 5, borderRadius: 999, background: T.color.neutral[100], overflow: 'hidden' }}>
                <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Analytics */}
        <div style={{ marginBottom: 24 }}>
          <AdminAnalytics schools={data.schools} allStudents={data.all_students} />
        </div>

        {/* Mock Exam Scatter */}
        <MockExamEngagementScatter />

        {/* Tabs + filters */}
        <div style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 14,
          }}>
            <div style={{
              display: 'inline-flex', padding: 4, borderRadius: 12,
              background: '#FFFFFF', border: `1px solid ${T.border.subtle}`,
              boxShadow: T.shadow.xs,
            }}>
              {tabs.map((t) => {
                const isActive = activeTab === t.key;
                return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none',
                    background: isActive ? T.color.brand[600] : 'transparent',
                    color: isActive ? '#FFFFFF' : T.text.secondary,
                    fontSize: 13, fontWeight: 700, fontFamily: FONT,
                    cursor: 'pointer', transition: 'background 150ms, color 150ms',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.text.tertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>School</span>
                <select
                  value={schoolFilter}
                  onChange={(e) => setSchoolFilter(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: 10,
                    border: `1px solid ${T.border.subtle}`, background: '#FFFFFF',
                    fontSize: 13, fontWeight: 600, color: T.text.primary,
                    cursor: 'pointer', outline: 'none', fontFamily: FONT,
                    boxShadow: T.shadow.xs,
                    minWidth: 200,
                  }}
                >
                  <option value="all">All Schools</option>
                  {data.schools.map(s => (
                    <option key={s.school_id} value={String(s.school_id)}>{s.school_name}</option>
                  ))}
                </select>
              </div>

              {activeTab !== 'activity' && (
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
                      }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {activeTab === 'activity' ? (
            activityLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 24px' }}>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 14 }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: 999, background: T.color.success.solid, animation: `dot-pulse 1.4s ease-in-out ${i * 0.16}s infinite` }} />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: T.text.tertiary, fontWeight: 600 }}>Loading activity…</p>
              </div>
            ) : activityData ? (
              <ActivityFeed data={activityData} />
            ) : (
              <div style={{
                textAlign: 'center', padding: '48px 24px',
                background: '#FFFFFF', border: `1px dashed ${T.border.strong}`, borderRadius: 14,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: T.color.neutral[100], margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text.tertiary }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text.secondary }}>Pick a school</div>
                <div style={{ marginTop: 4, fontSize: 12, color: T.text.tertiary }}>
                  {schoolFilter === 'all' ? 'Choose a school from the filter to see its activity.' : 'No activity available for this school.'}
                </div>
              </div>
            )
          ) : (
            <StudentTable
              students={activeTab === 'students' ? filteredStudents : filteredTeachers}
              onSendAlert={() => {}}
              onViewDetails={(studentId) => setViewStudentId(studentId)}
            />
          )}
        </div>
      </div>

      {viewStudentId !== null && (
        <StudentDetailModal
          studentId={viewStudentId}
          onClose={() => setViewStudentId(null)}
        />
      )}
    </div>
  );
};

export default OrcaLexDashboard;
