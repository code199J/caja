/**
 * Modal — Overlay con contenido centrado
 */

import { forwardRef, useEffect } from 'react';
import { tokens } from '../tokens';

export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ open = false, onClose, title, className = '', children, ...rest }, ref) => {
    useEffect(() => {
      if (!open) return;
      const onEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', onEsc);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', onEsc);
        document.body.style.overflow = '';
      };
    }, [open, onClose]);

    if (!open) return null;

    const overlayStyle: React.CSSProperties = {
      position: 'fixed',
      inset: 0,
      background: 'rgba(20,24,21,0.45)',
      zIndex: tokens.zIndex.modal,
      backdropFilter: 'blur(4px)',
      fontFamily: tokens.fontFamily.sans,
    };

    const modalStyle: React.CSSProperties = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'min(92vw, 520px)',
      maxHeight: '90vh',
      overflowY: 'auto',
      background: tokens.color.surface,
      border: `1px solid ${tokens.color.border}`,
      borderRadius: tokens.radius.card,
      padding: tokens.space[5],
      zIndex: tokens.zIndex.modal + 1,
      boxShadow: tokens.shadow.md,
      fontFamily: tokens.fontFamily.sans,
      animation: 'modalIn 0.25s ease both',
      ...rest,
    };

    return (
      <>
        <div style={overlayStyle} onClick={onClose} />
        <div
          ref={ref}
          className={className}
          role="dialog"
          aria-modal="true"
          aria-label={title || undefined}
          style={modalStyle}
        >
          {title && (
            <h2
              style={{
                margin: `0 0 ${tokens.space[3]}`,
                fontSize: tokens.fontSize.title,
                fontWeight: tokens.fontWeight.semibold,
                color: tokens.color.ink,
                letterSpacing: '-0.035em',
              }}
            >
              {title}
            </h2>
          )}
          {children}
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: tokens.space[2],
              right: tokens.space[2],
              background: 'none',
              border: 'none',
              fontSize: 24,
              lineHeight: 1,
              color: tokens.color.faint,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>
      </>
    );
  },
);

Modal.displayName = 'Modal';

const style = document.createElement('style');
style.textContent = `
  @keyframes modalIn {
    from { opacity: 0; transform: translate(-50%, -40%); }
    to { opacity: 1; transform: translate(-50%, -50%); }
  }
`;
document.head?.appendChild(style);