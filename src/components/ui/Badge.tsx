import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'blue' | 'green' | 'yellow' | 'red';
}

const variantStyles: Record<string, string> = {
  default: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  green: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
  yellow:
    'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
  red: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

export function Badge({ children, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 text-xs rounded-full font-medium ${variantStyles[variant]}`}
    >
      {children}
    </span>
  );
}
