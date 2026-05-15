import type { ReactElement, ReactNode } from 'react'

export function TableStat({ label, value }: { label: string; value: ReactNode }): ReactElement {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#f4f1f0] px-3 py-1 text-xs uppercase tracking-[0.1em] text-[#5b5654]">
      <span>{label}</span>
      <span className="font-semibold text-[#231f20]">{value}</span>
    </span>
  )
}
