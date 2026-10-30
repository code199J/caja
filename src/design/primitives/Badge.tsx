/**
 * Badge — Etiqueta pequeña con color semántico
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'positive' | 'negative' | 'neutral' | 'warning' | 'meta' | 'business';
}

const VARIANT_STYLES: Record<string, { bg: string; ink: string }> = {
  positive: { bg: tokens.color.constructiveBg, ink: tokens.color.constructive },
  negative: { bg: tokens.color.destructiveBg, ink: tokens.color.destructive },
  neutral: { bg: tokens.color.neutralBg, ink: tokens.color.neutral },
  warning: { bg: tokens.color.warningBg, ink: tokens.color.warning },
  meta: { bg: tokens.color.metaBg, ink: tokens.color.metaInk },
  business: { bg: tokens.color.businessBg, ink: tokens.color.business },
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', className = '', children, ...rest }, ref) => {
    const v = VARIANT_STYLES[variant];
    const style: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      fontSize: tokens.fontSize.micro,
      fontWeight: tokens.fontWeight.medium,
      border: `1px solid ${tokens.color.control}`,
      borderRadius: tokens.radius.control,
      padding: '1px 5px',
      color: v.ink,
      background: v.bg,
      whiteSpace: 'nowrap',
      fontFamily: tokens.fontFamily.sans,
    };

    return (
      <span
        ref={ref}
        className={className}
        style={style}
        {...rest}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';