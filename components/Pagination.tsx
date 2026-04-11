import type { ReactElement } from "react";
import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  buildHref: (page: number) => string;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  buildHref,
}: PaginationProps): ReactElement | null {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-moss/15 bg-white px-4 py-3 shadow-panel">
      <p className="text-sm text-ink/70">
        Page {currentPage} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={buildHref(Math.max(1, currentPage - 1))}
          className={`rounded-full px-4 py-2 text-sm ${
            currentPage === 1
              ? "pointer-events-none bg-stone-100 text-stone-400"
              : "bg-moss text-white hover:bg-ink"
          }`}
        >
          Previous
        </Link>
        <Link
          href={buildHref(Math.min(totalPages, currentPage + 1))}
          className={`rounded-full px-4 py-2 text-sm ${
            currentPage === totalPages
              ? "pointer-events-none bg-stone-100 text-stone-400"
              : "bg-moss text-white hover:bg-ink"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
