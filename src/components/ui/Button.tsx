'use client';

import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'teal';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabledReason?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabledReason,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      title,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-chip transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:bg-surface-muted disabled:text-text-muted disabled:border-border disabled:shadow-none disabled:cursor-not-allowed select-none';

    const sizeStyles = {
      sm: 'text-caption px-3 py-1.5 min-h-[44px] min-w-[44px] gap-1.5',
      md: 'text-small px-4 py-2.5 min-h-[44px] min-w-[44px] gap-2',
      lg: 'text-body px-6 py-3 min-h-[48px] min-w-[48px] gap-2.5',
    };

    const variantStyles = {
      primary: 'bg-primary text-primary-contrast hover:bg-primary-hover shadow-card active:scale-[0.99]',
      secondary:
        'bg-surface text-text hover:bg-surface-subtle border border-border shadow-card active:scale-[0.99]',
      ghost: 'bg-transparent text-text hover:bg-surface-subtle border border-transparent',
      destructive:
        'bg-tier-confirmed-bg text-tier-confirmed-fg border border-tier-confirmed-border hover:bg-red-100 shadow-card',
      teal: 'bg-accent-teal text-white hover:bg-accent-teal-hover shadow-card active:scale-[0.99]',
    };

    const effectiveTitle = disabled && disabledReason ? disabledReason : title;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        title={effectiveTitle}
        aria-disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
