import type { ReactElement } from 'react'
import { Stack } from '@mui/material'
import { notFound } from 'next/navigation'

import { DateAtom } from '@atoms/Date'
import { ReturnToPreviousPage } from '@atoms/ReturnToPreviousPage'
import { PAGE_LABELS } from '@constants/pageLabels'
import { BATCHES_PATH } from '@constants/paths'
import { DetailFieldGrid } from '@molecules/DetailFieldGrid'
import { ProcessBatchProgress } from '@organisms/ProcessBatchProgress'
import { DetailPageSection } from '@organisms/DetailPageSection'
import { PageHeader } from '@organisms/PageHeader'
import { getBatchDetail } from '@lib/queries/batchQueries'
import { getPipelineExecutionSnapshot } from '@lib/queries/pipelineExecutionQueries'

export const dynamic = 'force-dynamic'

interface BatchDetailPageProps {
  params: Promise<{ batchId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function resolveReturnHref(searchParams: Record<string, string | string[] | undefined>): string {
  const from = firstSearchParam(searchParams.from)
  return from && from.startsWith('/') && !from.startsWith('//') ? from : BATCHES_PATH
}

function resolveReturnLabel(searchParams: Record<string, string | string[] | undefined>): string {
  const fromLabel = firstSearchParam(searchParams.fromLabel)?.trim()
  return fromLabel ? fromLabel.slice(0, 80) : PAGE_LABELS.batches
}

export default async function BatchDetailPage({ params, searchParams }: BatchDetailPageProps): Promise<ReactElement> {
  const { batchId } = await params
  if (!batchId.trim()) {
    notFound()
  }

  const resolvedSearchParams = await searchParams
  const [detail, executionSnapshot] = await Promise.all([
    getBatchDetail(batchId),
    getPipelineExecutionSnapshot(batchId),
  ])
  if (!detail) {
    notFound()
  }

  return (
    <Stack spacing={4} sx={{ width: '100%' }}>
      <ReturnToPreviousPage
        href={resolveReturnHref(resolvedSearchParams)}
        label={`Return to ${resolveReturnLabel(resolvedSearchParams)}`}
      />
      <PageHeader
        eyebrow={PAGE_LABELS.batches}
        title={detail.name || detail.id}
        description={'Inspect the identity and processing details currently available for this batch.'}
      />

      <DetailPageSection title={'Batch Fields'}>
        <DetailFieldGrid
          fields={[
            { key: 'id', label: 'Batch ID', value: detail.id },
            { key: 'name', label: 'Name', value: detail.name ?? '—' },
            { key: 'startedAt', label: 'Started At', value: <DateAtom value={detail.startedAt} /> },
            ...(detail.startedBy?.trim() ? [{ key: 'startedBy', label: 'Started By', value: detail.startedBy }] : []),
          ]}
        />
      </DetailPageSection>

      {executionSnapshot.batch ? (
        <DetailPageSection title={'Pipeline Progress'}>
          <ProcessBatchProgress
            initialBatch={executionSnapshot.batch}
            queueAttempts={executionSnapshot.queueAttempts}
            processingDetails={detail.properties}
          />
        </DetailPageSection>
      ) : null}
    </Stack>
  )
}
