import type { ReactNode, CSSProperties } from "react";

interface IconXProps {
  size?: number; // default 20
  className?: string;
}

/**
 * Atom: X (close/remove) icon using SVG.
 * Scales proportionally for any size.
 */
export function IconX({ size = 20, className = "" }: IconXProps): ReactNode {
  const scale = size / 20;
  const viewBox = `0 0 ${20 * scale} ${20 * scale}`;
  const strokeWidth = 1.5 * scale;

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      style={{ "--icon-scale": scale } as CSSProperties}
    >
      <path d={`M${15 * scale} ${5 * scale}L${5 * scale} ${15 * scale}M${5 * scale} ${5 * scale}l${10 * scale} ${10 * scale}`} />
    </svg>
  );
}
