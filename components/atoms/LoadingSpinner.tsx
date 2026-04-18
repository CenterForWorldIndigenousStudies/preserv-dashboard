import type { ReactNode } from "react";

interface LoadingSpinnerProps {
  /** Pixel size of the spinner (default: 32) */
  size?: number;
  /** Optional text to show alongside the spinner */
  message?: string;
  /** Optional extra classes on the wrapper div */
  className?: string;
}

/**
 * Atom: Centered spinning SVG indicator.
 * Used by AssignCollectionButton for loading states.
 * Supports optional inline message text.
 */
export function LoadingSpinner({
  className = "",
  size = 32,
  message,
}: LoadingSpinnerProps): ReactNode {
  return (
    <div className={`flex items-center gap-2 text-sm text-ink/60 ${className}`}>
      <svg
        className="animate-spin"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-label={message ?? "Loading"}
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
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {message && <span>{message}</span>}
    </div>
  );
}
