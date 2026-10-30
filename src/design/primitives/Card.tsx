/**
 * Card — Superficie contenedora con borde y radio
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  raised?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padded = false, raised = false, className = '', children, ...rest }, ref) => {
    const style: React.CSSProperties = {
      border: `1px solid ${tokens.color.border}`,
      borderRadius: tokens.radius.card,
      background: tokens.color.surface,
      ...(padded && { padding: tokens.space[4] }),
      ...(raised && { boxShadow: tokens.shadow.sm }),
    };

    return (
      <div ref={ref} className={className} style={style} {...rest}>
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';