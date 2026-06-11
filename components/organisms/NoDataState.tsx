import type { ReactElement } from 'react'

interface NoDataStateProps {
  title?: string
  message: string
}

export function NoDataState({ title = 'No Data', message }: NoDataStateProps): ReactElement {
  return (
    <section className="rounded-2xl border border-moss/15 bg-white p-8 shadow-panel">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-moss/70">{title}</p>
        <h2 className="mt-3 text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-3 text-sm text-ink/70">{message}</p>
      </div>
    </section>
  )
}
