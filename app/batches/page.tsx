import type { ReactElement } from 'react'
import Link from 'next/link'

import { Badge, type BadgeVariant } from '@atoms/Badges/Badge'
import { DateAtom } from '@atoms/Date'
import { StatCard } from '@molecules/StatCard'
import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { hasTerminalPipelineFailure, isPipelineBatchTerminal } from '@lib/pipelineExecution'
import { getProcessBatchStatuses, type ProcessBatchStatus } from '@lib/processBatches'

export const dynamic = 'force-dynamic'

type BatchMonitoringStatus = 'active' | 'completed' | 'failed'
type BatchSortField = 'name' | 'created'
type SortDirection = 'asc' | 'desc'

interface BatchesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

interface BatchSummaryCounts {
  total: number
  active: number
  completed: number
  failed: number
}

interface BatchSortState {
  field: BatchSortField
  direction: SortDirection
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function parseSortState(params: Record<string, string | string[] | undefined>): BatchSortState {
  const field = firstSearchParam(params.sort) === 'name' ? 'name' : 'created'
  const directionParam = firstSearchParam(params.direction)
  const defaultDirection: SortDirection = field === 'name' ? 'asc' : 'desc'

  return {
    field,
    direction:
      directionParam === 'asc' || directionParam === 'desc'
        ? directionParam
        : defaultDirection,
  }
}

function getBatchMonitoringStatus(batch: ProcessBatchStatus): BatchMonitoringStatus {
  if (hasTerminalPipelineFailure(batch)) {
    return 'failed'
  }

  if (isPipelineBatchTerminal(batch)) {
    return 'completed'
  }

  return 'active'
}

function getBatchStatusBadgeVariant(status: BatchMonitoringStatus): BadgeVariant {
  switch (status) {
    case 'completed':
      return 'success'
    case 'failed':
      return 'danger'
    default:
      return 'info'
  }
}

function summarizeBatches(batches: ProcessBatchStatus[]): BatchSummaryCounts {
  return batches.reduce<BatchSummaryCounts>(
    (counts, batch) => {
      const status = getBatchMonitoringStatus(batch)

      counts.total += 1
      counts[status] += 1

      return counts
    },
    {
      total: 0,
      active: 0,
      completed: 0,
      failed: 0,
    },
  )
}

function getBatchDisplayName(batch: ProcessBatchStatus): string {
  return batch.batchName ?? batch.batchId
}

function compareBatchNames(left: ProcessBatchStatus, right: ProcessBatchStatus): number {
  return getBatchDisplayName(left).localeCompare(getBatchDisplayName(right), 'en-US', {
    sensitivity: 'base',
  })
}

function compareBatchCreated(left: ProcessBatchStatus, right: ProcessBatchStatus): number {
  const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0
  const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0

  if (leftTime === rightTime) {
    return compareBatchNames(left, right)
  }

  return leftTime - rightTime
}

function sortBatches(batches: ProcessBatchStatus[], sortState: BatchSortState): ProcessBatchStatus[] {
  return [...batches].sort((left, right) => {
    const comparison =
      sortState.field === 'name'
        ? compareBatchNames(left, right)
        : compareBatchCreated(left, right)

    if (comparison !== 0) {
      return sortState.direction === 'asc' ? comparison : -comparison
    }

    return compareBatchNames(left, right)
  })
}

function buildSortHref(
  field: BatchSortField,
  currentSortState: BatchSortState,
  currentParams: Record<string, string | string[] | undefined>,
): string {
  const nextDirection: SortDirection =
    currentSortState.field === field
      ? currentSortState.direction === 'asc'
        ? 'desc'
        : 'asc'
      : field === 'name'
        ? 'asc'
        : 'desc'

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(currentParams)) {
    const resolvedValue = firstSearchParam(value)
    if (resolvedValue) {
      params.set(key, resolvedValue)
    }
  }

  params.set('sort', field)
  params.set('direction', nextDirection)

  return `/batches?${params.toString()}`
}

function SortHeaderLink({
  label,
  field,
  sortState,
  searchParams,
}: {
  label: string
  field: BatchSortField
  sortState: BatchSortState
  searchParams: Record<string, string | string[] | undefined>
}): ReactElement {
  const isActive = sortState.field === field
  const href = buildSortHref(field, sortState, searchParams)

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 hover:text-ink ${isActive ? 'text-ink' : ''}`}
    >
      <span>{label}</span>
      {isActive ? (
        <span className="text-[10px] tracking-[0.12em] text-ink/60">
          {sortState.direction.toUpperCase()}
        </span>
      ) : null}
    </Link>
  )
}

function BatchesSummaryCards({ counts }: { counts: BatchSummaryCounts }): ReactElement {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total" value={counts.total} />
      <StatCard title="Active" value={counts.active} />
      <StatCard title="Completed" value={counts.completed} />
      <StatCard title="Failed" value={counts.failed} />
    </section>
  )
}

function BatchesTable({
  batches,
  sortState,
  searchParams,
}: {
  batches: ProcessBatchStatus[]
  sortState: BatchSortState
  searchParams: Record<string, string | string[] | undefined>
}): ReactElement {
  return (
    <section className="overflow-hidden rounded-2xl border border-moss/15 bg-white shadow-panel">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-moss/10 text-sm">
          <thead className="bg-sand/55 text-left text-xs uppercase tracking-[0.15em] text-ink/70">
            <tr>
              <th className="px-4 py-3">
                <SortHeaderLink
                  label="Batch name"
                  field="name"
                  sortState={sortState}
                  searchParams={searchParams}
                />
              </th>
              <th className="px-4 py-3">
                <SortHeaderLink
                  label="Created date"
                  field="created"
                  sortState={sortState}
                  searchParams={searchParams}
                />
              </th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss/10">
            {batches.map((batch) => {
              const status = getBatchMonitoringStatus(batch)

              return (
                <tr key={batch.batchId} className="align-top">
                  <td className="px-4 py-3 font-medium text-ink">{getBatchDisplayName(batch)}</td>
                  <td className="px-4 py-3 text-ink/70">
                    <DateAtom value={batch.createdAt} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={getBatchStatusBadgeVariant(status)}>{status}</Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default async function BatchesPage({ searchParams }: BatchesPageProps): Promise<ReactElement> {
  const resolvedSearchParams = await searchParams
  const sortState = parseSortState(resolvedSearchParams)
  const batches = sortBatches(await getProcessBatchStatuses(50), sortState)
  const counts = summarizeBatches(batches)

  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow="Batches"
        title="Batches"
        description="Operational monitoring view for recent processing batches and their current execution state."
      />

      <BatchesSummaryCards counts={counts} />

      {batches.length === 0 ? (
        <NoDataState message="No processing batches are available to monitor yet." />
      ) : (
        <BatchesTable
          batches={batches}
          sortState={sortState}
          searchParams={resolvedSearchParams}
        />
      )}
    </div>
  )
}
