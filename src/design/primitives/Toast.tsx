/**
 * Toast — Notificación temporal con opcional deshacer
 */

import { forwardRef, useEffect } from 'react';
import { tokens } from '../tokens';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  message: string;
  onUndo?: () => void;
  undoLabel?: string;
  duration?: number;
}

export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  ({ message, onUndo, undoLabel = 'Deshacer', duration = 3200, className = '', ...rest }, ref) => {
    useEffect(() => {
      const t = setTimeout(() => {
        // El componente padre se encarga de ocultar
      }, duration);
      return () => clearTimeout(t);
    }, [duration]);

    const style: React.CSSProperties = {
      position: 'fixed',
      left: '50%',
      bottom: 'calc(56px + env(safe-area-inset-bottom) + 8px)',
      transform: 'translateX(-50%) translateY(100px)',
      background: tokens.color.ink,
      color: tokens.color.ground,
      fontSize: tokens.fontSize.small,
      padding: '10px 16px',
      borderRadius: tokens.radius.pill,
      zIndex: tokens.zIndex.toast,
      boxShadow: `${tokens.shadow.sm}, ${tokens.shadow.md}`,
      animation: 'toastIn 0.25s ease both',
      maxWidth: '88vw',
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      justifyContent: 'center',
      fontFamily: tokens.fontFamily.sans,
    };

    return (
      <div
        ref={ref}
        className={className}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={style}
        {...rest}
      >
        {message}
        {onUndo && (
          <button
            type="button"
            onClick={onUndo}
            style={{
              marginLeft: 8,
              fontSize: tokens.fontSize.micro,
              color: tokens.color.ground,
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            {undoLabel}
          </button>
        )}
      </div>
    );
  },
);

Toast.displayName = 'Toast';

const style = document.createElement('style');
style.textContent = `
  @keyframes toastIn {
    from { opacity: 0; transform: translate(-50%, 8px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
`;
document.head?.appendChild(style);