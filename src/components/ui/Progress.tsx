interface ProgressProps {
  value: number; // 0-100
  className?: string;
  size?: 'sm' | 'md';
  'aria-label'?: string;
}

export function Progress({ value, className = '', size = 'sm', 'aria-label': ariaLabel }: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const height = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div
      className={`w-full ${height} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel}
    >
      <div
        className={`${height} bg-blue-500 rounded-full transition-all duration-300 ease-out`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
