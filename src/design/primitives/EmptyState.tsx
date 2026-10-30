/**
 * EmptyState — Estado vacío con acción opcional
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ title, actionLabel, onAction, className = '', children, ...rest }, ref) => {
    const style: React.CSSProperties = {
      border: `1px dashed ${tokens.color.rule}`,
      borderRadius: tokens.radius.card,
      padding: tokens.space[5],
      fontSize: tokens.fontSize.small,
      color: tokens.color.muted,
      lineHeight: tokens.lineHeight.relaxed,
      textAlign: 'center',
      ...rest,
    };

    return (
      <div ref={ref} className={className} style={style}>
        {title && (
          <div
            style={{
              fontWeight: tokens.fontWeight.medium,
              color: tokens.color.ink,
              marginBottom: tokens.space[2],
            }}
          >
            {title}
          </div>
        )}
        {children}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            style={{
              marginTop: tokens.space[3],
              background: tokens.color.primary,
              color: tokens.color.ground,
              border: 'none',
              borderRadius: tokens.radius.control,
              padding: '6px 14px',
              fontSize: tokens.fontSize.micro,
              fontWeight: tokens.fontWeight.medium,
              cursor: 'pointer',
              fontFamily: tokens.fontFamily.sans,
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  },
);

EmptyState.displayName = 'EmptyState';