import React, { useState, useEffect } from 'react';
import T from '../theme/tokens';

const FONT = T.font.sans;

export interface HelpItem {
  icon: string;
  title: string;
  description: string;
}

interface Props {
  items: HelpItem[];
}

const PageHelpBar: React.FC<Props> = ({ items }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [items]);
  if (items.length === 0) return null;

  return (
    <div style={{
      marginBottom: 18,
      borderRadius: 12,
      border: `1px solid ${open ? T.color.brand[200] : T.border.subtle}`,
      background: open ? T.color.brand[50] : '#FFFFFF',
      overflow: 'hidden',
      transition: 'border-color 150ms, background 150ms',
      boxShadow: open ? T.shadow.xs : 'none',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', background: 'transparent', border: 'none',
          cursor: 'pointer', fontFamily: FONT,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 22, height: 22, borderRadius: 7,
            background: T.color.brand.tint, color: T.color.brand[700],
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700,
          }}>?</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.color.brand[700], letterSpacing: '0.02em' }}>
            How this page works
          </span>
        </div>
        <svg width="14" height="14" fill="none" stroke={T.text.tertiary} strokeWidth="2.2" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }}>
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div style={{ maxHeight: open ? 500 : 0, overflow: 'hidden', transition: 'max-height 220ms ease' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 10, padding: '0 12px 12px',
        }}>
          {items.map((item, i) => (
            <div key={i} style={{
              background: '#FFFFFF',
              border: `1px solid ${T.border.subtle}`,
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: T.text.primary, fontFamily: FONT }}>{item.title}</span>
              </div>
              <span style={{ fontSize: 11, color: T.text.tertiary, fontFamily: FONT, lineHeight: 1.5 }}>{item.description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageHelpBar;
