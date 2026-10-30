/**
 * Skeleton — Placeholder de carga para listas y cards
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width = '100%', height = '16px', className = '', ...rest }, ref) => {
    const style: React.CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      background: tokens.color.raised,
      borderRadius: tokens.radius.control,
      animation: 'skeletonPulse 1.5s ease-in-out infinite',
      fontFamily: tokens.fontFamily.sans,
      ...rest,
    };

    return (
      <div ref={ref} className={className} style={style} />
    );
  },
);

Skeleton.displayName = 'Skeleton';

const style = document.createElement('style');
style.textContent = `
  @keyframes skeletonPulse {
    0% { opacity: 0.6; }
    50% { opacity: 0.3; }
    100% { opacity: 0.6; }
  }
`;
document.head?.appendChild(style);