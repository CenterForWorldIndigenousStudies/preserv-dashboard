import type { ReactElement } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps): ReactElement {
  return (
    <div className="rounded-3xl bg-ink px-8 py-10 text-sand shadow-panel">
      <p className="text-xs uppercase tracking-[0.3em] text-sky/75">{eyebrow}</p>
      <h1 className="mt-4 text-3xl font-semibold text-white md:text-4xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-sky/90">{description}</p>
    </div>
  );
}
