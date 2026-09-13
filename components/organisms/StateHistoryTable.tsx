'use client'

import { useMemo, type ReactNode } from 'react'
import type { MRT_ColumnDef } from 'material-react-table'

import { DateAtom } from '@atoms/Date'
import { StatusPill } from '@atoms/Badges/StatusPill'
import { GENERATED_DOCUMENT_STATES } from '@constants/generated/documentStates'
import { NeedsReviewReasonsPopover } from '@molecules/NeedsReviewReasonsPopover'
import { DetailDataTable } from '@organisms/DetailDataTable'
import type { StateHistoryEntry } from 'types/documents'
import type { NeedsReviewReasonGroup } from 'types/needsReview'

interface StateHistoryTableProps {
  states: StateHistoryEntry[]
  documentId: string
  needsReviewReasons?: NeedsReviewReasonGroup[]
  diagnosticsHref?: string
}

function hasReviewReasons(groups: NeedsReviewReasonGroup[]): boolean {
  return groups.some((group) => group.reasons.some((reason) => reason.trim().length > 0))
}

function renderState(
  value: string | null,
  documentId: string,
  needsReviewReasons: NeedsReviewReasonGroup[],
  diagnosticsHref: string | undefined,
): ReactNode {
  const trigger = <StatusPill status={value} />
  const isNeedsReview = value?.trim().toLowerCase() === GENERATED_DOCUMENT_STATES.NEEDS_REVIEW

  if (!isNeedsReview || !hasReviewReasons(needsReviewReasons)) {
    return value ? trigger : '—'
  }

  return (
    <NeedsReviewReasonsPopover
      documentId={documentId}
      groups={needsReviewReasons}
      trigger={trigger}
      diagnosticsHref={diagnosticsHref}
    />
  )
}

export function StateHistoryTable({
  states,
  documentId,
  needsReviewReasons = [],
  diagnosticsHref,
}: StateHistoryTableProps) {
  const columns = useMemo<MRT_ColumnDef<StateHistoryEntry>[]>(
    () => [
      {
        accessorKey: 'previous_state',
        header: 'Previous State',
        size: 180,
        Cell: ({ row }) => renderState(row.original.previous_state, documentId, needsReviewReasons, diagnosticsHref),
      },
      {
        accessorKey: 'new_state',
        header: 'New State',
        size: 180,
        Cell: ({ row }) => renderState(row.original.new_state, documentId, needsReviewReasons, diagnosticsHref),
      },
      {
        accessorKey: 'changed_at',
        header: 'Changed At',
        size: 180,
        Cell: ({ row }) => <DateAtom value={row.original.changed_at} />,
      },
    ],
    [diagnosticsHref, documentId, needsReviewReasons],
  )

  return <DetailDataTable columns={columns} data={states} emptyMessage={'No state history found.'} />
}
