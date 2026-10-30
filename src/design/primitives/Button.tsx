/**
 * Button — Primitive del diseño Caja
 *
 * Variantes: primary | destructive | ghost | outline
 * Tamaños: sm | md | lg
 * Estados: loading | disabled
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'destructive' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const SIZE_PADDING: Record<string, string> = {
  sm: '6px 10px',
  md: '10px 16px',
  lg: '14px 20px',
};

const SIZE_FONT: Record<string, string> = {
  sm: tokens.fontSize.micro,
  md: tokens.fontSize.body,
  lg: tokens.fontSize.section,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...rest }, ref) => {
    const isPrimary = variant === 'primary';
    const isDestructive = variant === 'destructive';
    const isGhost = variant === 'ghost';
    const isOutline = variant === 'outline';

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: tokens.radius.control,
      fontWeight: tokens.fontWeight.medium,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: 'background 120ms ease, border-color 120ms ease, color 120ms ease, transform 120ms ease',
      fontFamily: tokens.fontFamily.sans,
      border: 'none',
      outline: 'none',
      padding: SIZE_PADDING[size],
      fontSize: SIZE_FONT[size],
    };

    if (isPrimary) {
      baseStyle.background = tokens.color.primary;
      baseStyle.color = tokens.color.ground;
      baseStyle.border = `1px solid ${tokens.color.primary}`;
    } else if (isDestructive) {
      baseStyle.background = 'transparent';
      baseStyle.color = tokens.color.destructive;
      baseStyle.border = `1px solid ${tokens.color.destructive}`;
    } else if (isGhost) {
      baseStyle.background = tokens.color.surface;
      baseStyle.color = tokens.color.muted;
      baseStyle.border = `1px solid ${tokens.color.border}`;
    } else if (isOutline) {
      baseStyle.background = 'transparent';
      baseStyle.color = tokens.color.ink;
      baseStyle.border = `1px solid ${tokens.color.border}`;
    }

    if (disabled || loading) {
      baseStyle.opacity = 0.45;
    }

    return (
      <button
        ref={ref}
        className={className}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        style={baseStyle}
        {...rest}
      >
        {loading && (
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'spin 1s linear infinite' }}
          >
            <circle cx={12} cy={12} r={10} />
          </svg>
        )}
        {!loading && children}
      </button>
    );
  },
);

Button.displayName = 'Button';