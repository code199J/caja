/**
 * Chip — Pill selectable / estado
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ active = false, className = '', children, ...rest }, ref) => {
    const style: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      border: `1px solid ${tokens.color.border}`,
      borderRadius: tokens.radius.chip,
      background: active ? tokens.color.primary : tokens.color.surface,
      color: active ? tokens.color.ground : tokens.color.muted,
      fontSize: tokens.fontSize.micro,
      fontWeight: tokens.fontWeight.medium,
      padding: '4px 10px',
      cursor: 'pointer',
      transition: 'border-color 120ms ease, background 120ms ease, color 120ms ease',
      fontFamily: tokens.fontFamily.sans,
      outline: 'none',
    };

    return (
      <button
        ref={ref}
        className={className}
        aria-pressed={active || undefined}
        data-on={active || undefined}
        style={style}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

Chip.displayName = 'Chip';