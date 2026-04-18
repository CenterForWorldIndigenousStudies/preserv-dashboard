import type { ReactNode } from "react";
import { Badge } from "@atoms/Badge";

interface StateBadgeProps {
  state: string;
  className?: string;
}

/**
 * Atom: Semantic wrapper around Badge that maps state strings to variants.
 */
export function StateBadge({ state, className = "" }: StateBadgeProps): ReactNode {
  const variant =
    state === "completed"
      ? "moss"
      : state === "failed"
        ? "clay"
        : state === "under_review"
          ? "sky"
          : "sand";

  return (
    <Badge variant={variant} className={className}>
      {state}
    </Badge>
  );
}
