/**
 * Smartlearners.ai — Design System Tokens
 * Bold, confident, education-focused palette.
 * Deep indigo primary with warm accents. Rich, not muted.
 */

export const font = {
  sans: '"Plus Jakarta Sans", "Inter", system-ui, -apple-system, sans-serif',
  display: '"Source Serif 4", Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
} as const;

export const color = {
  // Brand — richer indigo/violet, confident and premium
  brand: {
    50: '#EEF0FF',
    100: '#E0E4FF',
    200: '#C7CDFF',
    300: '#A5AEFF',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5', // primary
    700: '#4338CA', // primary hover / active
    800: '#3730A3',
    900: '#312E81',
    tint: 'rgba(79,70,229,0.08)',
    tintHover: 'rgba(79,70,229,0.14)',
    focus: 'rgba(79,70,229,0.22)',
  },

  // Accent — warm gold/amber for highlights
  accent: {
    50: '#FEF3C7',
    100: '#FDE68A',
    500: '#F59E0B',
    600: '#D97706',
    tint: 'rgba(245,158,11,0.10)',
  },

  // Secondary — vibrant pink/rose for callouts
  pink: {
    500: '#EC4899',
    600: '#DB2777',
    tint: 'rgba(236,72,153,0.10)',
  },

  // Neutrals — Slate scale
  neutral: {
    0: '#FFFFFF',
    25: '#FBFBFD',
    50: '#F8FAFC',
    100: '#F1F5F9',
    150: '#EAEEF3',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },

  // Semantic status colors
  success: {
    solid: '#10B981',
    text: '#047857',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.24)',
  },
  warning: {
    solid: '#F59E0B',
    text: '#B45309',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.24)',
  },
  danger: {
    solid: '#EF4444',
    text: '#B91C1C',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.24)',
  },
  info: {
    solid: '#3B82F6',
    text: '#1D4ED8',
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.24)',
  },

  // Data-viz palette — vibrant, professional
  chart: ['#4F46E5', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#06B6D4', '#F43F5E'],

  // Rich gradient utilities
  gradient: {
    brand: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #818CF8 100%)',
    brandDark: 'linear-gradient(135deg, #312E81 0%, #4338CA 50%, #6366F1 100%)',
    hero: 'linear-gradient(135deg, #4338CA 0%, #6366F1 40%, #A78BFA 100%)',
    heroRich: 'linear-gradient(120deg, #312E81 0%, #4F46E5 40%, #A855F7 100%)',
    sunset: 'linear-gradient(135deg, #F59E0B 0%, #EC4899 100%)',
    ocean: 'linear-gradient(135deg, #06B6D4 0%, #4F46E5 100%)',
    forest: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    subtle: 'linear-gradient(180deg, #FAFBFF 0%, #F5F3FF 100%)',
    warm: 'linear-gradient(135deg, #FEE2E2 0%, #FEF3C7 100%)',
  },
} as const;

// Surface aliases — richer canvas
export const surface = {
  canvas: '#F6F7FB',                // slight blue-gray tint instead of pure gray
  canvasAlt: '#EEF0FF',
  raised: color.neutral[0],
  raisedAlt: color.neutral[25],
  subtle: color.neutral[100],
  overlay: 'rgba(15,23,42,0.55)',
} as const;

// Text aliases
export const text = {
  primary: color.neutral[900],
  secondary: color.neutral[600],
  tertiary: color.neutral[500],
  muted: color.neutral[400],
  inverse: color.neutral[0],
  brand: color.brand[700],
} as const;

// Border aliases
export const border = {
  subtle: color.neutral[200],
  default: color.neutral[200],
  strong: color.neutral[300],
  brand: color.brand[600],
  focus: color.brand[600],
} as const;

// 4px spacing scale
export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32,
  10: 40, 12: 48, 14: 56, 16: 64, 20: 80,
} as const;

// Border radius scale
export const radius = {
  xs: 4, sm: 6, md: 8, lg: 12, xl: 16,
  '2xl': 20, '3xl': 28, pill: 999,
} as const;

// Elevation — richer shadows for more depth
export const shadow = {
  none: 'none',
  xs: '0 1px 2px rgba(15,23,42,0.06)',
  sm: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.04)',
  md: '0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)',
  lg: '0 12px 24px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.06)',
  xl: '0 20px 40px rgba(15,23,42,0.12), 0 8px 16px rgba(15,23,42,0.06)',
  brand: '0 8px 20px rgba(79,70,229,0.28)',
  brandLg: '0 14px 32px rgba(79,70,229,0.34)',
  brandXl: '0 20px 50px rgba(79,70,229,0.40)',
  glow: '0 0 40px rgba(79,70,229,0.25)',
  focus: '0 0 0 4px rgba(79,70,229,0.20)',
} as const;

// Typography scale
export const type = {
  size: {
    xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 18,
    '2xl': 22, '3xl': 28, '4xl': 34, '5xl': 44,
  },
  weight: {
    regular: 400, medium: 500, semibold: 600, bold: 700, black: 800,
  },
  leading: {
    tight: 1.2, snug: 1.35, normal: 1.5, relaxed: 1.65,
  },
  tracking: {
    tight: '-0.02em', normal: '0', wide: '0.04em', wider: '0.08em',
  },
} as const;

// Motion
export const motion = {
  duration: {
    fast: '120ms', base: '180ms', slow: '260ms',
  },
  ease: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    spring: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export const T = {
  font, color, surface, text, border, space, radius, shadow, type, motion,
} as const;

export default T;

export const px = (n: number) => `${n}px`;

export const statusColor = (kind: 'success' | 'warning' | 'danger' | 'info' | 'brand') => {
  if (kind === 'brand') {
    return { solid: color.brand[600], text: color.brand[700], bg: color.brand.tint, border: color.brand[200] };
  }
  return color[kind];
};
