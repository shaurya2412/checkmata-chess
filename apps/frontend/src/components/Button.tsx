import React from 'react';

export const Button = ({
  onClick,
  children,
  className,
  disabled,
  variant = 'default',
}: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline';
}) => {
  const baseStyles = 'px-6 py-3 text-base font-semibold rounded-card transition-all duration-200 cursor-pointer';
  const variantStyles = {
    default: 'bg-accent text-white hover:bg-accent-hover shadow-lg hover:shadow-xl',
    outline: 'bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}
    >
      {children}
    </button>
  );
};
