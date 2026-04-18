import type { ReactNode } from "react";

interface InlineSpinnerProps {
  message?: string;
  className?: string;
}

/**
 * Atom: Spinner with optional message text.
 * Uses the same SVG animate-spin pattern as AssignCollectionButton.
 */
export function InlineSpinner({ message, className = "" }: InlineSpinnerProps): ReactNode {
  return (
    <div className={`flex items-center gap-2 text-sm text-ink/60 ${className}`}>
      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {message && <span>{message}</span>}
    </div>
  );
}
