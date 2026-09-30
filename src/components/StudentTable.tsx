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

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onSendAlert,
  onSendChallenge,
  onViewDetails,
  selectedIds,
  onSelectionChange,
  usernameByStudentId: _usernameByStudentId,
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'lastLogin' | 'sessions' | 'highEngagement' | 'lowEngagement'>('name');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const selectable = !!onSelectionChange;

  const getStatusConfig = (status: EngagementStatus) => {
    switch (status) {
      case EngagementStatus.ACTIVE:
        return { color: '#059669', dot: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', label: 'Active' };
      case EngagementStatus.AT_RISK:
        return { color: '#D97706', dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'At Risk' };
      case EngagementStatus.LOW_ENGAGEMENT:
        return { color: '#C2410C', dot: '#FB923C', bg: '#FFF7ED', border: '#FED7AA', label: 'Low' };
      case EngagementStatus.INACTIVE:
        return { color: '#E11D48', dot: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3', label: 'Inactive' };
      default:
        return { color: '#64748B', dot: '#94A3B8', bg: '#F1F5F9', border: '#E2E8F0', label: 'Unknown' };
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

  // Status counts for overview pills
  const counts = {
    total: students.length,
    active: students.filter(s => s.engagement_status === EngagementStatus.ACTIVE).length,
    atRisk: students.filter(s => s.engagement_status === EngagementStatus.AT_RISK).length,
    low: students.filter(s => s.engagement_status === EngagementStatus.LOW_ENGAGEMENT).length,
    inactive: students.filter(s => s.engagement_status === EngagementStatus.INACTIVE).length,
  };

  const filteredStudents = students
    .filter((s) => classFilter === 'all' ? true : (s.grade || 'Unknown') === classFilter)
    .filter((s) => sectionFilter === 'all' ? true : (s.section || 'Unknown') === sectionFilter)
    .filter((s) => statusFilter === 'all' ? true : s.engagement_status === statusFilter)
    .filter((s) => !query.trim() ? true : (s.full_name?.toLowerCase().includes(query.toLowerCase().trim()) || String(s.user_id ?? '').includes(query.trim()) || String(s.email ?? '').toLowerCase().includes(query.toLowerCase().trim())));

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
    <div style={{ display: 'grid', gap: 20, fontFamily: FONT }}>
      
      {/* ── Directory Header & Status Tiers ───────────────────── */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: '22px 24px',
        boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: '#EEF2FF', color: '#4F46E5', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
              Student Management
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Student Directory & Roster
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748B' }}>
              Monitor student engagement health, launch targeted challenges, and access detailed individual diagnostic profiles.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Showing:</span>
            <span style={{ padding: '4px 10px', borderRadius: 8, background: '#F1F5F9', color: '#0F172A', fontSize: 13, fontWeight: 800 }}>
              {sortedStudents.length} of {students.length} students
            </span>
          </div>
        </div>

        {/* Quick Filter Status Strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 14, borderTop: '1px solid #F1F5F9' }}>
          <button
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              border: statusFilter === 'all' ? '1px solid #4F46E5' : '1px solid #E2E8F0',
              background: statusFilter === 'all' ? '#EEF2FF' : '#FFFFFF',
              color: statusFilter === 'all' ? '#4F46E5' : '#475569',
            }}
          >
            All Students ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter(EngagementStatus.ACTIVE)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              border: statusFilter === EngagementStatus.ACTIVE ? '1px solid #10B981' : '1px solid #E2E8F0',
              background: statusFilter === EngagementStatus.ACTIVE ? '#ECFDF5' : '#FFFFFF',
              color: statusFilter === EngagementStatus.ACTIVE ? '#059669' : '#475569',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
            Active ({counts.active})
          </button>
          <button
            onClick={() => setStatusFilter(EngagementStatus.AT_RISK)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              border: statusFilter === EngagementStatus.AT_RISK ? '1px solid #F59E0B' : '1px solid #E2E8F0',
              background: statusFilter === EngagementStatus.AT_RISK ? '#FFFBEB' : '#FFFFFF',
              color: statusFilter === EngagementStatus.AT_RISK ? '#D97706' : '#475569',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }} />
            At Risk ({counts.atRisk})
          </button>
          <button
            onClick={() => setStatusFilter(EngagementStatus.LOW_ENGAGEMENT)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              border: statusFilter === EngagementStatus.LOW_ENGAGEMENT ? '1px solid #FB923C' : '1px solid #E2E8F0',
              background: statusFilter === EngagementStatus.LOW_ENGAGEMENT ? '#FFF7ED' : '#FFFFFF',
              color: statusFilter === EngagementStatus.LOW_ENGAGEMENT ? '#C2410C' : '#475569',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FB923C' }} />
            Low Engagement ({counts.low})
          </button>
          <button
            onClick={() => setStatusFilter(EngagementStatus.INACTIVE)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
              border: statusFilter === EngagementStatus.INACTIVE ? '1px solid #F43F5E' : '1px solid #E2E8F0',
              background: statusFilter === EngagementStatus.INACTIVE ? '#FFF1F2' : '#FFFFFF',
              color: statusFilter === EngagementStatus.INACTIVE ? '#E11D48' : '#475569',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F43F5E' }} />
            Inactive ({counts.inactive})
          </button>
        </div>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────── */}
      <div style={{
        background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: '14px 18px',
        display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          {/* Search box */}
          <div style={{ position: 'relative', minWidth: 260, flex: '1 1 260px' }}>
            <svg width="15" height="15" fill="none" stroke="#94A3B8" strokeWidth="2" viewBox="0 0 24 24" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by student name or roll ID..."
              style={{
                width: '100%', padding: '9px 12px 9px 36px', borderRadius: 10,
                border: '1px solid #E2E8F0', background: '#F8FAFC',
                fontSize: 13, fontFamily: FONT, color: '#0F172A', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8' }}
              >
                &times;
              </button>
            )}
          </div>

          {/* Class Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Class</span>
            <select
              value={classFilter}
              onChange={(e) => { setClassFilter(e.target.value); setSectionFilter('all'); }}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#0F172A', outline: 'none' }}
            >
              <option value="all">All Classes</option>
              {uniqueClasses.map((c) => (<option key={c} value={c}>Class {c}</option>))}
            </select>
          </div>

          {/* Section Select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Section</span>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#0F172A', outline: 'none' }}
            >
              <option value="all">All Sections</option>
              {uniqueSections.map((s) => (<option key={s} value={s}>Section {s}</option>))}
            </select>
          </div>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Sort</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: '#FFFFFF', fontSize: 13, fontWeight: 600, color: '#0F172A', outline: 'none' }}
            >
              <option value="name">Name (A–Z)</option>
              <option value="highEngagement">Most Engaged</option>
              <option value="lowEngagement">Needs Attention</option>
              <option value="sessions">Active Sessions</option>
              <option value="lastLogin">Login Recency</option>
            </select>
          </div>
        </div>

        {(classFilter !== 'all' || sectionFilter !== 'all' || statusFilter !== 'all' || query) && (
          <button
            onClick={() => { setClassFilter('all'); setSectionFilter('all'); setStatusFilter('all'); setQuery(''); }}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
              background: '#F8FAFC', color: '#64748B', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: FONT,
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* ── Multi-select Floating Bar ─────────────────────────── */}
      {selectedIds && selectedIds.size > 0 && (
        <div style={{
          position: 'sticky', top: 72, zIndex: 20,
          background: '#0F172A', color: '#FFFFFF', borderRadius: 12, padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
              {selectedIds.size}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>Students Selected</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selectedIds.size === 1 && (
              <>
                <button
                  onClick={() => onSendAlert(Array.from(selectedIds)[0])}
                  style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#F59E0B', color: '#0F172A', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >
                  Send Alert
                </button>
                {onSendChallenge && (
                  <button
                    onClick={() => onSendChallenge(Array.from(selectedIds)[0])}
                    style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#4F46E5', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Send Challenge
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => onSelectionChange?.(new Set())}
              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#CBD5E1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* ── Main Student Table ────────────────────────────────── */}
      <div style={{
        background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0',
        overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {selectable && (
                  <th style={{ padding: '12px 16px', width: 36, textAlign: 'left' }}>
                    <input
                      type="checkbox"
                      checked={!!allSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all visible students"
                      style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4F46E5' }}
                    />
                  </th>
                )}
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Student</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Class & Section</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Engagement Tier</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Weekly Sessions</th>
                <th style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Last Active</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.map((student, idx) => {
                const status = getStatusConfig(student.engagement_status);
                const isSelected = selectable && selectedIds?.has(student.student_id);
                const initials = (student.full_name || 'U').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

                const lastLoginText = (() => {
                  if (student.days_since_login === 0) return 'Today';
                  if (student.days_since_login === 1) return 'Yesterday';
                  if (student.days_since_login != null) return `${student.days_since_login}d ago`;
                  return '—';
                })();

                return (
                  <tr
                    key={student.student_id}
                    style={{
                      borderBottom: idx < sortedStudents.length - 1 ? '1px solid #F1F5F9' : 'none',
                      background: isSelected ? 'rgba(79,70,229,0.04)' : '#FFFFFF',
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = '#FFFFFF'; }}
                  >
                    {selectable && (
                      <td style={{ padding: '14px 16px' }}>
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => handleToggle(student.student_id)}
                          aria-label={`Select ${student.full_name}`}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#4F46E5' }}
                        />
                      </td>
                    )}

                    {/* Student Info */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          position: 'relative', width: 36, height: 36, borderRadius: 10,
                          background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                          color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12.5, fontWeight: 800, flexShrink: 0,
                        }}>
                          {initials}
                          {student.is_currently_active && (
                            <span title="Online now" style={{
                              position: 'absolute', bottom: -1, right: -1, width: 9, height: 9,
                              borderRadius: '50%', background: '#10B981', border: '2px solid #FFFFFF',
                            }} />
                          )}
                        </div>
                        <div>
                          <button
                            onClick={() => onViewDetails(student.student_id)}
                            style={{
                              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                              textAlign: 'left', fontSize: 13.5, fontWeight: 700, color: '#0F172A',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#4F46E5')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#0F172A')}
                          >
                            {student.full_name}
                          </button>
                          <div style={{ fontSize: 11, color: '#64748B', marginTop: 1 }}>
                            ID #{student.user_id} {student.email ? `· ${student.email}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Class & Section */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ padding: '2px 8px', borderRadius: 6, background: '#F1F5F9', color: '#0F172A', fontWeight: 700, fontSize: 12 }}>
                          {student.grade ? `Class ${student.grade}` : '—'}
                        </span>
                        {student.section && (
                          <span style={{ padding: '2px 8px', borderRadius: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#475569', fontWeight: 600, fontSize: 11.5 }}>
                            Sec {student.section}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status Pill */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '3px 10px', borderRadius: 999,
                        background: status.bg, border: `1px solid ${status.border}`,
                        color: status.color, fontSize: 11.5, fontWeight: 700,
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot }} />
                        {status.label}
                      </span>
                    </td>

                    {/* Sessions this week */}
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontWeight: 800, color: '#0F172A', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>
                        {student.sessions_this_week}
                      </span>
                      <span style={{ fontSize: 11.5, color: '#64748B', marginLeft: 4 }}>sessions</span>
                    </td>

                    {/* Last Login */}
                    <td style={{ padding: '14px 18px', color: '#64748B', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' }}>
                      {lastLoginText}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => onViewDetails(student.student_id)}
                          title="View student analytics profile"
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            border: '1px solid #E2E8F0', background: '#FFFFFF',
                            color: '#0F172A', fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', fontFamily: FONT,
                            transition: 'all 120ms ease',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.color = '#4F46E5'; e.currentTarget.style.background = '#EEF2FF'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#FFFFFF'; }}
                        >
                          View Profile
                        </button>

                        <button
                          onClick={() => onSendAlert(student.student_id)}
                          title="Send alert notification"
                          style={{
                            padding: '6px 10px', borderRadius: 8,
                            border: '1px solid #E2E8F0', background: '#FFFFFF',
                            color: '#D97706', fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', fontFamily: FONT,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#FFFBEB'; e.currentTarget.style.borderColor = '#FDE68A'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                        >
                          Alert
                        </button>

                        {onSendChallenge && (
                          <button
                            onClick={() => onSendChallenge(student.student_id)}
                            title="Send practice challenge"
                            style={{
                              padding: '6px 10px', borderRadius: 8,
                              border: '1px solid #E2E8F0', background: '#FFFFFF',
                              color: '#4F46E5', fontSize: 12, fontWeight: 700,
                              cursor: 'pointer', fontFamily: FONT,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = '#C7CDFF'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                          >
                            Challenge
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedStudents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F1F5F9', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" /></svg>
            </div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>No matching students found</p>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>Try clearing or adjusting your search queries and class filters.</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default StudentTable;
