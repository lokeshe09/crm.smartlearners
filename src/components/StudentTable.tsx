import React, { useState, useEffect, useRef } from 'react';
import { StudentEngagementSummary, EngagementStatus } from '../types';
import { dashboardAPI } from '../services/api';
import T from '../theme/tokens';

const FONT = T.font.sans;

interface StudentTableProps {
  students: StudentEngagementSummary[];
  onSendAlert: (studentId: number) => void;
  onSendChallenge?: (studentId: number) => void;
  onViewDetails: (studentId: number) => void;
  selectedIds?: Set<number>;
  onSelectionChange?: (selectedIds: Set<number>) => void;
  usernameByStudentId?: Map<number, string>;
}

const eyebrow: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: T.text.tertiary,
  textTransform: 'uppercase', letterSpacing: '0.08em',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 10,
  border: `1px solid ${T.border.subtle}`, background: '#FFFFFF',
  fontSize: 13, fontWeight: 600, color: T.text.primary,
  cursor: 'pointer', outline: 'none', fontFamily: FONT,
  transition: 'border-color 150ms, box-shadow 150ms',
};

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onSendAlert: _onSendAlert,
  onSendChallenge: _onSendChallenge,
  onViewDetails,
  selectedIds,
  onSelectionChange,
  usernameByStudentId: _usernameByStudentId,
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'lastLogin' | 'sessions' | 'highEngagement' | 'lowEngagement'>('name');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const selectable = !!onSelectionChange;

  const getStatusConfig = (status: EngagementStatus) => {
    switch (status) {
      case EngagementStatus.ACTIVE:
        return { color: T.color.success.text, dot: T.color.success.solid, bg: T.color.success.bg, border: T.color.success.border, label: 'Active' };
      case EngagementStatus.AT_RISK:
        return { color: T.color.warning.text, dot: T.color.warning.solid, bg: T.color.warning.bg, border: T.color.warning.border, label: 'At Risk' };
      case EngagementStatus.LOW_ENGAGEMENT:
        return { color: '#C2410C', dot: '#FB923C', bg: 'rgba(251,146,60,0.10)', border: 'rgba(251,146,60,0.24)', label: 'Low' };
      case EngagementStatus.INACTIVE:
        return { color: T.color.danger.text, dot: T.color.danger.solid, bg: T.color.danger.bg, border: T.color.danger.border, label: 'Inactive' };
      default:
        return { color: T.text.tertiary, dot: T.color.neutral[400], bg: T.color.neutral[100], border: T.border.subtle, label: 'Unknown' };
    }
  };

  const uniqueClasses = Array.from(new Set(students.map(s => s.grade || 'Unknown')))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const uniqueSections = Array.from(
    new Set(
      students
        .filter((s) => classFilter === 'all' ? true : (s.grade || 'Unknown') === classFilter)
        .map((s) => s.section || 'Unknown')
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filteredStudents = students
    .filter((s) => classFilter === 'all' ? true : (s.grade || 'Unknown') === classFilter)
    .filter((s) => sectionFilter === 'all' ? true : (s.section || 'Unknown') === sectionFilter)
    .filter((s) => !query.trim() ? true : (s.full_name?.toLowerCase().includes(query.toLowerCase().trim()) || String(s.user_id ?? '').includes(query.trim())));

  const engagementOrder: Record<string, number> = {
    [EngagementStatus.ACTIVE]: 4,
    [EngagementStatus.LOW_ENGAGEMENT]: 3,
    [EngagementStatus.AT_RISK]: 2,
    [EngagementStatus.INACTIVE]: 1,
  };

  const sortedStudents = [...filteredStudents].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.full_name.localeCompare(b.full_name);
      case 'lastLogin': return (b.days_since_login || 999) - (a.days_since_login || 999);
      case 'sessions': return b.sessions_this_week - a.sessions_this_week;
      case 'highEngagement': return (engagementOrder[b.engagement_status] || 0) - (engagementOrder[a.engagement_status] || 0);
      case 'lowEngagement': return (engagementOrder[a.engagement_status] || 0) - (engagementOrder[b.engagement_status] || 0);
      default: return 0;
    }
  });

  const allVisibleIds = sortedStudents.map((s) => s.student_id);
  const allSelected =
    selectable && allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds?.has(id));

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (allSelected) allVisibleIds.forEach((id) => next.delete(id));
    else allVisibleIds.forEach((id) => next.add(id));
    onSelectionChange(next);
  };

  const handleToggle = (studentId: number) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    onSelectionChange(next);
  };

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 16,
      border: `1px solid ${T.border.subtle}`,
      overflow: 'hidden',
      fontFamily: FONT,
      boxShadow: T.shadow.sm,
    }}>
      {/* Filter Bar */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${T.border.subtle}`,
        display: 'flex', flexWrap: 'wrap', gap: 14,
        alignItems: 'center', justifyContent: 'space-between',
        background: T.color.neutral[25],
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" fill="none" stroke={T.text.muted} strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search students…"
              style={{
                width: 220, padding: '8px 12px 8px 34px', borderRadius: 10,
                border: `1px solid ${T.border.subtle}`, background: '#FFFFFF',
                fontSize: 13, fontFamily: FONT, color: T.text.primary, outline: 'none',
                transition: 'border-color 150ms, box-shadow 150ms',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = T.color.brand[600]; e.currentTarget.style.boxShadow = T.shadow.focus; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = T.border.subtle; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Class */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={eyebrow}>Class</span>
            <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setSectionFilter('all'); }} style={selectStyle}>
              <option value="all">All</option>
              {uniqueClasses.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          {/* Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={eyebrow}>Section</span>
            <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} style={selectStyle}>
              <option value="all">All</option>
              {uniqueSections.map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={eyebrow}>Sort</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={selectStyle}>
              <option value="name">Name (A–Z)</option>
              <option value="highEngagement">Most engaged first</option>
              <option value="lowEngagement">Least engaged first</option>
            </select>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: T.text.tertiary }}>
          Showing <span style={{ color: T.text.primary, fontWeight: 700 }}>{sortedStudents.length}</span> of {students.length}
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: T.color.neutral[50], borderBottom: `1px solid ${T.border.subtle}` }}>
              {selectable && (
                <th style={{ padding: '12px 12px 12px 20px', width: 36 }}>
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    onChange={handleSelectAll}
                    aria-label="Select all visible students"
                    style={{ width: 15, height: 15, cursor: 'pointer', accentColor: T.color.brand[600] }}
                  />
                </th>
              )}
              {['Student', 'Grade & Section', 'Status', ''].map((header, i) => (
                <th
                  key={header || 'actions'}
                  style={{
                    padding: '12px 20px',
                    textAlign: i === 3 ? 'right' : 'left',
                    fontSize: 11, fontWeight: 700, color: T.text.tertiary,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    whiteSpace: 'nowrap', fontFamily: FONT,
                  }}
                >
                  {header || 'Actions'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((student, idx) => {
              const status = getStatusConfig(student.engagement_status);
              const isSelected = selectable && selectedIds?.has(student.student_id);
              const initials = (student.full_name || 'U').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
              return (
                <tr
                  key={student.student_id}
                  style={{
                    borderTop: idx === 0 ? 'none' : `1px solid ${T.border.subtle}`,
                    background: isSelected ? T.color.brand.tint : '#FFFFFF',
                    transition: 'background 120ms',
                    animation: `entrance-stagger 260ms ${T.motion.ease.spring} ${Math.min(idx, 20) * 15}ms both`,
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = T.color.neutral[25]; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  {selectable && (
                    <td style={{ padding: '14px 12px 14px 20px' }}>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => handleToggle(student.student_id)}
                        aria-label={`Select ${student.full_name}`}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: T.color.brand[600] }}
                      />
                    </td>
                  )}

                  {/* Student */}
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        position: 'relative', width: 34, height: 34, borderRadius: 999,
                        background: `linear-gradient(135deg, ${T.color.brand[500]}, ${T.color.brand[700]})`,
                        color: '#FFFFFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                        flexShrink: 0,
                      }}>
                        {initials}
                        {student.is_currently_active && (
                          <span title="Online now" style={{
                            position: 'absolute', bottom: -1, right: -1,
                            width: 10, height: 10, borderRadius: 999,
                            background: T.color.success.solid,
                            border: '2px solid #FFFFFF',
                            boxShadow: '0 0 0 1px rgba(16,185,129,0.4)',
                          }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: T.text.primary, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {student.full_name}
                          {student.auth_provider === 'google' && (
                            <span title="Google Auth" style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 18, height: 18, borderRadius: 5,
                              background: T.color.info.bg, color: T.color.info.text,
                              fontSize: 10, fontWeight: 800,
                            }}>G</span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 2, letterSpacing: '0.01em' }}>
                          ID · {student.user_id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Grade & Section */}
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.text.primary }}>{student.grade || '—'}</div>
                    <div style={{ fontSize: 11, color: T.text.tertiary, marginTop: 2 }}>{student.section || 'No section'}</div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '3px 10px 3px 8px', borderRadius: 999,
                      background: status.bg, border: `1px solid ${status.border}`,
                      color: status.color, fontSize: 11, fontWeight: 700,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: status.dot }} />
                      {status.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => onViewDetails(student.student_id)}
                      style={{
                        padding: '7px 14px', borderRadius: 10,
                        border: `1px solid ${T.border.subtle}`,
                        background: '#FFFFFF', color: T.text.primary,
                        fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', transition: 'all 150ms',
                        fontFamily: FONT,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = T.color.brand[600];
                        e.currentTarget.style.color = T.color.brand[700];
                        e.currentTarget.style.background = T.color.brand.tint;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = T.border.subtle;
                        e.currentTarget.style.color = T.text.primary;
                        e.currentTarget.style.background = '#FFFFFF';
                      }}
                    >
                      View
                      <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.4" viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedStudents.length === 0 && (
        <div style={{ textAlign: 'center', padding: '56px 24px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: T.color.neutral[100], margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text.tertiary }}>
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text.secondary }}>No students found</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: T.text.tertiary }}>Try adjusting your filters or search.</p>
        </div>
      )}
    </div>
  );
};

// Preserving prior utility exports (some other components rely on the shape)
const fmtHours = (sec: number) => {
  if (sec <= 0) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const hoursInAppCache = new Map<string, number>();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HoursInAppCell: React.FC<{ username?: string }> = ({ username }) => {
  const [seconds, setSeconds] = useState<number | null>(
    username && hoursInAppCache.has(username) ? hoursInAppCache.get(username)! : null
  );
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!username || hoursInAppCache.has(username)) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        observer.disconnect();
        setLoading(true);
        dashboardAPI
          .getUserLoginLogs(username, 500)
          .then((logs) => {
            const total = (logs?.items ?? []).reduce(
              (s, d) => s + Number(d.total_time_seconds ?? 0),
              0
            );
            hoursInAppCache.set(username, total);
            setSeconds(total);
          })
          .catch(() => setSeconds(0))
          .finally(() => setLoading(false));
      }
    }, { threshold: 0.1 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [username]);

  if (!username) return <span>—</span>;
  if (seconds !== null) return <span>{fmtHours(seconds)}</span>;
  return <span ref={ref}>{loading ? '…' : ''}</span>;
};

export default StudentTable;
