import type { ReactElement } from 'react'

import { Button } from '@atoms/Button'
import {
  BATCH_SUMMARY_PATH,
  FAILED_PATH,
  PROCESS_DOCUMENTS_PATH,
  READY_FOR_LIBRARY_PATH,
  REVIEW_QUEUE_PATH,
} from '@constants/paths'
import { PageHeader } from '@organisms/PageHeader'

export const dynamic = 'force-dynamic'

interface PlaceholderKpiCardProps {
  title: string
  description: string
}

interface QuickActionProps {
  href: string
  label: string
  description: string
}

const KPI_CARDS: PlaceholderKpiCardProps[] = [
  {
    title: 'Needs Review',
    description: 'Placeholder only. A live review count will be connected in a later PR.',
  },
  {
    title: 'Ready for Library',
    description: 'Placeholder only. This card does not reflect a live library-ready total yet.',
  },
  {
    title: 'Active Batches',
    description: 'Placeholder only. Active batch tracking will be wired in a later PR.',
  },
  {
    title: 'Failed Documents',
    description: 'Placeholder only. This card reserves space for future failure totals.',
  },
]

const QUICK_ACTIONS: QuickActionProps[] = [
  {
    href: REVIEW_QUEUE_PATH,
    label: 'Open Review Queue',
    description: 'Go to the current review workflow.',
  },
  {
    href: READY_FOR_LIBRARY_PATH,
    label: 'Open Ready for Library',
    description: 'Go to the current library-ready list.',
  },
  {
    href: PROCESS_DOCUMENTS_PATH,
    label: 'Start Process Documents',
    description: 'Go to the existing batch launch page.',
  },
  {
    href: BATCH_SUMMARY_PATH,
    label: 'Open Batch Summary',
    description: 'Review the current batch summary table.',
  },
  {
    href: FAILED_PATH,
    label: 'Open Failures',
    description: 'Inspect the current failures view.',
  },
]

function PlaceholderKpiCard({ title, description }: PlaceholderKpiCardProps): ReactElement {
  return (
    <article className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.15em] text-ink/60">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">Placeholder</p>
      <p className="mt-2 text-sm leading-6 text-ink/70">{description}</p>
    </article>
  )
}

function QuickActionCard({ href, label, description }: QuickActionProps): ReactElement {
  return (
    <article className="rounded-2xl border border-moss/15 bg-white p-5 shadow-panel">
      <p className="text-xs uppercase tracking-[0.15em] text-ink/60">Quick Action</p>
      <h2 className="mt-2 text-lg font-semibold text-ink">{label}</h2>
      <p className="mt-2 text-sm leading-6 text-ink/70">{description}</p>
      <div className="mt-4">
        <Button href={href} variant="secondary">
          Open
        </Button>
      </div>
    </article>
  )
}

export default function DashboardPage(): ReactElement {
  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Operational dashboard placeholder."
        description="This page establishes the dashboard layout and navigation using existing app patterns. All KPI and status content below is placeholder-only for this PR and does not represent live operational metrics yet."
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Operational Snapshot</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            These cards are layout placeholders only. Live KPI values will be added in a later PR.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CARDS.map((card) => (
            <PlaceholderKpiCard key={card.title} title={card.title} description={card.description} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-ink">Priority Alerts</h2>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Placeholder only. Priority alerts will appear here once alert rules and live dashboard metrics are implemented.
        </p>
      </section>

      <section className="rounded-2xl border border-moss/15 bg-white p-6 shadow-panel">
        <h2 className="text-xl font-semibold text-ink">System Status</h2>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Placeholder only. System status messaging will be connected to live pipeline health in a later PR.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-ink">Quick Actions</h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Use these links to reach existing dashboard destinations while this page remains a skeleton.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard
              key={action.href}
              href={action.href}
              label={action.label}
              description={action.description}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
