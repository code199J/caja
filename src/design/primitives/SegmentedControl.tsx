/**
 * SegmentedControl — Selector segmentado (moneda, modo, riesgo)
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface SegmentedControlProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onValueChange: (value: string) => void;
  size?: 'sm' | 'md';
}

export const SegmentedControl = forwardRef<
  HTMLDivElement,
  SegmentedControlProps & React.HTMLAttributes<HTMLDivElement>
>(
  ({ options, value, onValueChange, size = 'md', className = '', ...rest }, ref) => {
    const padding = size === 'sm' ? '2px' : '2px';
    const itemPadding = size === 'sm' ? '4px 8px' : '6px 12px';
    const fontSize = size === 'sm' ? tokens.fontSize.micro : tokens.fontSize.body;

    const containerStyle: React.CSSProperties = {
      display: 'inline-flex',
      background: tokens.color.raised,
      border: `1px solid ${tokens.color.border}`,
      borderRadius: tokens.radius.control,
      padding,
      ...rest,
    };

    return (
      <div
        ref={ref}
        className={className}
        role="group"
        aria-label="Selector segmentado"
        style={containerStyle}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active || undefined}
              onClick={() => onValueChange(opt.value)}
              style={{
                background: active ? tokens.color.ink : 'transparent',
                color: active ? tokens.color.ground : tokens.color.muted,
                border: 'none',
                borderRadius: tokens.radius.pill,
                padding: itemPadding,
                fontSize,
                fontWeight: tokens.fontWeight.medium,
                cursor: 'pointer',
                fontFamily: tokens.fontFamily.sans,
                outline: 'none',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  },
);

SegmentedControl.displayName = 'SegmentedControl';