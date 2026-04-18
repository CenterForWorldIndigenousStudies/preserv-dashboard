import type { ReactElement } from "react";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: number;
  href?: string;
}

export function StatCard({ title, value, href }: StatCardProps): ReactElement {
  const cardContent = (
    <div className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel transition hover:-translate-y-0.5">
      <p className="text-sm uppercase tracking-[0.18em] text-moss/70">{title}</p>
      <p className="mt-3 text-4xl font-semibold text-ink">{value.toLocaleString("en-US")}</p>
    </div>
  );

  if (!href) {
    return cardContent;
  }

  return (
    <Link href={href} className="block">
      {cardContent}
    </Link>
  );
}
