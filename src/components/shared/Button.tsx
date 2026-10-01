import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const BASE = 'py-2.5 px-6 rounded-md text-md cursor-pointer';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'border-none bg-primary text-white transition-background hover:not-disabled:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed',
  secondary: 'border border-border bg-transparent text-fg-muted transition-all hover:text-fg hover:border-primary',
  danger: 'border-none bg-danger text-white transition-background hover:bg-danger-hover',
};

/**
 * 統一按鈕元件（取代 .btn-primary / .btn-secondary / .btn-danger）
 */
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return <button className={`${BASE} ${VARIANTS[variant]}${className ? ` ${className}` : ''}`} {...props} />;
}
