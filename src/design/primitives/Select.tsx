/**
 * Select — Select nativo con estilo Caja
 */

import { forwardRef } from 'react';
import { tokens } from '../tokens';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
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
      appearance: 'none',
      cursor: 'pointer',
      transition: 'border-color 120ms ease, background 120ms ease',
      backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234a5148'%3e%3cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3e%3c/svg%3e\")",
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 11px center',
      backgroundSize: '16px',
      paddingRight: 32,
    };

    return (
      <select
        ref={ref}
        className={className}
        style={style}
        {...rest}
      />
    );
  },
);

Select.displayName = 'Select';