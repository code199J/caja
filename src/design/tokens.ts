/**
 * Caja Design System — Tokenes de diseño
 *
 * Paleta achromática con UNA señal guayaba (#E5404F) reservada para metas.
 * Roles semánticos para evitar confusión visual entre acciones primarias,
 * destructivas, constructivas y de aviso.
 */

export const color = {
  // ── Achromatic ledger ────────────────────────────────────────────
  ground: '#eceee9',     // papel
  surface: '#fdfdfa',    // tarjetas
  raised: '#f3f4ef',     // inputs, fondos elevados
  border: '#d9dcd2',     // bordes
  rule: '#e7e9e1',       // líneas divisorias
  control: '#c6cabd',    // controles desactivados
  ink: '#141815',        // texto principal
  muted: '#4a5148',      // texto secundario
  faint: '#656b60',      // texto terciario
  placeholder: '#717665', // placeholders

  // ── Semantic roles ───────────────────────────────────────────────
  primary: '#141815',    // acción primaria (guardar, confirmar)
  primaryHover: '#232a26',
  destructive: '#E5404F', // eliminar, borrar (era guayaba, ahora solo CxC/eliminar)
  destructiveHover: '#c93441',
  destructiveBg: '#ffe3e6',
  constructive: '#247b50', // éxito, positivo
  constructiveBg: '#dcfae5',
  warning: '#92400e',    // atención, tasas viejas
  warningBg: '#fffbeb',
  neutral: '#4a5148',    // secundario
  neutralBg: '#e4e6dd',

  // ── Guayaba reservada para META (solo metas) ─────────────────────
  meta: '#E5404F',
  metaInk: '#8e1d28',
  metaBg: '#ffe3e6',

  // ── Negocios (nuevo) ─────────────────────────────────────────────
  business: '#1d4e89',   // azul negocio para distinguir de personal
  businessBg: '#e8f0f8',
  recovery: '#0a7c59',   // recuperado de inversión
  recoveryBg: '#e0f2ec',
} as const;

export const space = {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
} as const;

export const radius = {
  card: '8px',
  control: '6px',
  chip: '6px',
  pill: '999px',
} as const;

export const fontSize = {
  title: '22px',
  section: '16px',
  kpi: '20px',
  body: '15px',
  small: '13px',
  micro: '12px',
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
} as const;

export const lineHeight = {
  tight: '1.12',
  normal: '1.45',
  relaxed: '1.5',
} as const;

export const fontFamily = {
  sans: '"Familjen Grotesk", "Helvetica Neue", Arial, sans-serif',
  mono: '"Spline Sans Mono", ui-monospace, SF Mono, Menlo, monospace',
} as const;

export const borderWidth = {
  thin: '1px',
  thick: '2px',
} as const;

export const shadow = {
  sm: '0 1px 0 rgba(20,24,21,.04)',
  md: '0 12px 28px -20px rgba(20,24,21,.5)',
} as const;

export const motion = {
  fast: '120ms ease',
  normal: '250ms cubic-bezier(.22,1,.36,1)',
  slow: '350ms ease',
  spring: '300ms cubic-bezier(.34,1.56,.64,1)',
} as const;

export const breakpoint = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
} as const;

export const zIndex = {
  dropdown: 10,
  sticky: 20,
  toast: 30,
  modal: 40,
} as const;

export interface DesignTokens {
  color: typeof color;
  space: typeof space;
  radius: typeof radius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  fontFamily: typeof fontFamily;
  borderWidth: typeof borderWidth;
  shadow: typeof shadow;
  motion: typeof motion;
  breakpoint: typeof breakpoint;
  zIndex: typeof zIndex;
}

export const tokens: DesignTokens = {
  color,
  space,
  radius,
  fontSize,
  fontWeight,
  lineHeight,
  fontFamily,
  borderWidth,
  shadow,
  motion,
  breakpoint,
  zIndex,
};

export type ColorKey = keyof typeof color;
export type SpaceKey = keyof typeof space;
export type RadiusKey = keyof typeof radius;