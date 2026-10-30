/**
 * ProgressTrack — Barra de progreso animada
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface ProgressTrackProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number; // 0-100
  color?: string;
}

export const ProgressTrack = forwardRef<HTMLDivElement, ProgressTrackProps>(
  ({ width = 0, color = tokens.color.constructive, className = '', ...rest }, ref) => {
    const clamped = Math.min(100, Math.max(0, width));
    const containerStyle: React.CSSProperties = {
      height: 6,
      borderRadius: tokens.radius.pill,
      background: tokens.color.raised,
      boxShadow: `inset 0 0 0 1px ${tokens.color.border}`,
      overflow: 'hidden',
      ...rest,
    };

    const barStyle: React.CSSProperties = {
      display: 'block',
      height: '100%',
      background: color,
      width: `${clamped}%`,
      transition: 'width 250ms cubic-bezier(0.22, 1, 0.36, 1)',
    };

    return (
      <div ref={ref} className={className} style={containerStyle}>
        <div style={barStyle} />
      </div>
    );
  },
);

ProgressTrack.displayName = 'ProgressTrack';