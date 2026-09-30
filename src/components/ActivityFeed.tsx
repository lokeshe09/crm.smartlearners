import React, { useState } from 'react';
import { ActivityOverview, DailyActivitySummary, ActivityEntry } from '../types';

const FONT = "'Plus Jakarta Sans', sans-serif";

interface ActivityFeedProps {
  data: ActivityOverview;
}

const activityTypeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  gap_analysis: { label: 'Practice', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
  homework_submission: { label: 'Homework', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  exam_result: { label: 'Exam Result', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  exam_created: { label: 'Exam Created', color: '#4F46E5', bg: '#EEF2FF', border: '#C7CDFF' },
  homework_assigned: { label: 'HW Assigned', color: '#0D9488', bg: '#F0FDFA', border: '#99F6E4' },
  classwork: { label: 'Classwork', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
};

const getScorePercentColor = (p: number | null | undefined) => {
  if (p === null || p === undefined) return '#64748B';
  if (p >= 80) return '#059669';
  if (p >= 60) return '#0284C7';
  if (p >= 40) return '#D97706';
  return '#E11D48';
};

const EntryRow: React.FC<{ entry: ActivityEntry }> = ({ entry }) => {
  const typeInfo = activityTypeConfig[entry.activity_type] || { label: entry.activity_type, color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0' };

  return (
    <tr
      style={{ borderTop: '1px solid #F1F5F9', transition: 'background 0.12s ease' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800,
          }}>
            {entry.user_name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{entry.user_name}</div>
            <div style={{ fontSize: '11px', color: '#64748B', textTransform: 'capitalize' }}>{entry.role}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: '12px 18px', whiteSpace: 'nowrap' }}>
        <span style={{
          display: 'inline-block', padding: '3px 8px', borderRadius: '6px',
          fontSize: '11px', fontWeight: 700, color: typeInfo.color, background: typeInfo.bg,
          border: `1px solid ${typeInfo.border}`,
        }}>
          {typeInfo.label}
        </span>
      </td>
      <td style={{ padding: '12px 18px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{entry.title}</div>
        {entry.subject && <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>{entry.subject}</div>}
      </td>
      <td style={{ padding: '12px 18px', whiteSpace: 'nowrap', fontSize: '13px', color: '#0F172A' }}>
        {entry.score !== null && entry.score !== undefined ? (
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            <strong>{entry.score}</strong>{entry.max_score ? `/${entry.max_score}` : ''}
            {entry.percentage !== null && entry.percentage !== undefined && (
              <span style={{ fontSize: '11px', color: getScorePercentColor(entry.percentage), marginLeft: '6px', fontWeight: 700 }}>
                ({entry.percentage}%)
              </span>
            )}
          </span>
        ) : (
          <span style={{ color: '#CBD5E1' }}>—</span>
        )}
      </td>
      <td style={{ padding: '12px 18px', whiteSpace: 'nowrap', fontSize: '12px', color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
        {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
      </td>
    </tr>
  );
};

const DaySection: React.FC<{ day: DailyActivitySummary; isExpanded: boolean; onToggle: () => void }> = ({ day, isExpanded, onToggle }) => {
  const dateObj = new Date(day.date + 'T00:00:00');
  const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ borderRadius: '14px', border: '1px solid #E2E8F0', marginBottom: '14px', overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(15,23,42,0.03)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', background: isExpanded ? '#F8FAFC' : '#FFFFFF',
          border: 'none', cursor: 'pointer', fontFamily: FONT, transition: 'background 0.12s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC'; }}
        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = '#FFFFFF'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>{dateLabel}</span>
          <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#EEF2FF', border: '1px solid #E0E7FF', fontSize: '11px', fontWeight: 700, color: '#4F46E5' }}>
            {day.total_submissions} events
          </span>
          <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
            {day.student_submissions} student activities · {day.teacher_activities} teacher actions
          </span>
        </div>
        <svg
          width="16" height="16" fill="none" stroke="#64748B" strokeWidth="2" viewBox="0 0 24 24"
          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isExpanded && (
        <div style={{ overflowX: 'auto', borderTop: '1px solid #E2E8F0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['User', 'Activity Type', 'Details', 'Score / Progress', 'Time'].map((h) => (
                  <th key={h} style={{ padding: '10px 18px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: FONT }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {day.entries.map((entry, idx) => (
                <EntryRow key={`${entry.activity_type}-${entry.id}-${idx}`} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ data }) => {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set(data.daily_breakdown.slice(0, 3).map((d) => d.date))
  );
  const [filterRole, setFilterRole] = useState<'all' | 'student' | 'teacher'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleDay = (date: string) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const filteredDays = data.daily_breakdown
    .map((day) => {
      let entries = day.entries;
      if (filterRole !== 'all') entries = entries.filter((e) => e.role === filterRole);
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        entries = entries.filter((e) =>
          e.user_name.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          (e.subject && e.subject.toLowerCase().includes(q))
        );
      }
      return { ...day, entries, total_submissions: entries.length };
    })
    .filter((day) => day.entries.length > 0);

  const summaryCards = [
    { label: 'Practice Sessions', value: data.total_gap_analysis, color: '#0284C7', bg: '#F0F9FF' },
    { label: 'Homework Turned In', value: data.total_homework_submissions, color: '#059669', bg: '#ECFDF5' },
    { label: 'Exams Created', value: data.total_exams_created, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Classwork Logged', value: data.total_classwork, color: '#D97706', bg: '#FFFBEB' },
    { label: 'Student Total', value: data.total_student_submissions, color: '#0D9488', bg: '#F0FDFA' },
    { label: 'Teacher Total', value: data.total_teacher_activities, color: '#E11D48', bg: '#FFF1F2' },
  ];

  return (
    <div style={{ display: 'grid', gap: '20px', fontFamily: FONT }}>
      
      {/* Header */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '22px 24px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
      }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          Real-time Audit
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
          Learning Activity Stream
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
          Live chronological feed of quiz submissions, homework completions, and classroom grading events.
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {summaryCards.map((card) => (
          <div
            key={card.label}
            style={{
              padding: '16px 18px',
              borderRadius: '14px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: card.color, marginTop: '6px', fontVariantNumeric: 'tabular-nums' }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '12px 18px',
        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'student', 'teacher'] as const).map((role) => {
            const isActive = filterRole === role;
            return (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                style={{
                  padding: '6px 14px', borderRadius: '8px',
                  border: isActive ? '1px solid #4F46E5' : '1px solid #E2E8F0',
                  background: isActive ? '#EEF2FF' : '#FFFFFF',
                  color: isActive ? '#4F46E5' : '#475569',
                  fontSize: '12.5px', fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', fontFamily: FONT,
                }}
              >
                {role === 'all' ? 'All Roles' : role === 'student' ? 'Students Only' : 'Teachers Only'}
              </button>
            );
          })}
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <input
            type="text"
            placeholder="Search by student name or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px',
              border: '1px solid #E2E8F0', fontSize: '13px', color: '#0F172A',
              outline: 'none', fontFamily: FONT, background: '#F8FAFC',
              boxSizing: 'border-box',
            }}
          />
          <svg width="14" height="14" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Days Activity List */}
      <div>
        {filteredDays.length > 0 ? (
          filteredDays.map((day) => (
            <DaySection
              key={day.date}
              day={day}
              isExpanded={expandedDays.has(day.date)}
              onToggle={() => toggleDay(day.date)}
            />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0', background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', color: '#64748B', fontSize: '14px' }}>
            No activity records match your current filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
