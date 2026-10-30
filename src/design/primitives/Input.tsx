/**
 * Input — Campo de texto con estilo Caja
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className = '', ...rest }, ref) => {
    const style: React.CSSProperties = {
      border: `1px solid ${error ? tokens.color.destructive : tokens.color.border}`,
      background: tokens.color.raised,
      borderRadius: tokens.radius.control,
      padding: '10px 11px',
      fontSize: tokens.fontSize.body,
      fontVariantNumeric: 'tabular-nums',
      width: '100%',
      fontFamily: tokens.fontFamily.sans,
      outline: 'none',
      transition: 'border-color 120ms ease, background 120ms ease',
    };

    return (
      <input
        ref={ref}
        className={className}
        style={style}
        {...rest}
      />
    );
  },
);

Input.displayName = 'Input';