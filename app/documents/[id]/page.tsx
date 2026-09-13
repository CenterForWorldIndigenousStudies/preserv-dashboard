import type { ReactElement, ReactNode } from 'react'
import { Box, Stack } from '@mui/material'

import { ReturnToPreviousPage } from '@atoms/ReturnToPreviousPage'
import { DocumentBatchesSection } from '@organisms/DocumentBatchesSection'
import { DocumentCommentsSection } from '@organisms/DocumentCommentsSection'
import { DocumentHistorySections } from '@organisms/DocumentHistorySections'
import { DocumentMetadataSection } from '@organisms/DocumentMetadataSection'
import { DocumentPropertiesSection } from '@organisms/DocumentPropertiesSection'
import { DocumentTagsEditor } from '@organisms/DocumentTagsEditor'
import { DocumentEditCoordinator } from '@organisms/DocumentEditCoordinator'
import { DocumentVersionsSection } from '@organisms/DocumentVersionsSection'
import { DetailPageSection } from '@organisms/DetailPageSection'
import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { buildPipelineDiagnostics } from '@lib/documentDetailViewModel'
import { getDocumentEditWarning } from '@lib/documentEditAccess'
import { GENERATED_BATCH_PUBLICATION_STATUSES } from '@constants/generated/batchPublicationStatuses'
import { getDocumentDetail } from '@lib/queries/documentQueries'
import { getReprocessingDrafts } from '@lib/queries/reprocessingDraftQueries'
import {
  COLLECTIONS_PATH,
  DOCUMENTS_PATH,
  FAILED_PATH,
  READY_FOR_LIBRARY_PATH,
  REVIEW_QUEUE_PATH,
} from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import type { DocumentDetail } from 'types/documents'
import { DocumentReviewToolbar } from '@organisms/DocumentReviewToolbar'

export const dynamic = 'force-dynamic'

interface DocumentDetailPageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function resolveReturnHref(searchParams: Record<string, string | string[] | undefined>): string {
  const from = firstSearchParam(searchParams.from)
  if (from && from.startsWith('/') && !from.startsWith('//')) {
    return from
  }
  return DOCUMENTS_PATH
}

function resolveReturnPageName(
  searchParams: Record<string, string | string[] | undefined>,
  returnHref: string,
): string | undefined {
  const capturedLabel = firstSearchParam(searchParams.fromLabel)?.trim()
  if (capturedLabel) {
    return capturedLabel.slice(0, 80)
  }

  let returnPathname: string
  try {
    returnPathname = new URL(returnHref, 'http://dashboard.local').pathname
  } catch {
    return undefined
  }

  return (
    {
      [COLLECTIONS_PATH]: PAGE_LABELS.collections,
      [DOCUMENTS_PATH]: PAGE_LABELS.documents,
      [FAILED_PATH]: PAGE_LABELS.processingFailures,
      [READY_FOR_LIBRARY_PATH]: PAGE_LABELS.readyForLibrary,
      [REVIEW_QUEUE_PATH]: PAGE_LABELS.reviewQueue,
    } as Record<string, string>
  )[returnPathname]
}

function buildCurrentDocumentHref(id: string, searchParams: Record<string, string | string[] | undefined>): string {
  const currentParams = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          currentParams.append(key, item)
        }
      }
      continue
    }

    if (value) {
      currentParams.set(key, value)
    }
  }

  const currentSearch = currentParams.toString()
  return currentSearch ? `${DOCUMENTS_PATH}/${id}?${currentSearch}` : `${DOCUMENTS_PATH}/${id}`
}

function buildDocumentReviewToolbar(
  detail: DocumentDetail,
  reprocessingDrafts: Awaited<ReturnType<typeof getReprocessingDrafts>>,
  diagnosticsHref?: string,
): ReactNode {
  const { document, quality } = detail

  return (
    <DocumentReviewToolbar
      documentId={document.id}
      documentName={document.name || document.id}
      validationStatus={quality?.validation_status}
      reviewReasons={document.needs_review_reasons}
      reviewChecklist={quality?.review_checklist}
      isCandidate={detail.readiness?.isPreservationCandidate ?? false}
      isCanonical={detail.version_family?.canonical_document_id === document.id}
      hasOpenReprocessingDraft={detail.document_to_batches.some(
        (batch) => batch.batch_status?.toLowerCase() === 'draft',
      )}
      initialDrafts={reprocessingDrafts}
      diagnosticsHref={diagnosticsHref}
    />
  )
}

export default async function DocumentDetailPage({
  params,
  searchParams,
}: DocumentDetailPageProps): Promise<ReactElement> {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const returnHref = resolveReturnHref(resolvedSearchParams)
  const returnPageName = resolveReturnPageName(resolvedSearchParams, returnHref)
  const returnLabel = returnPageName ? `Return to ${returnPageName}` : undefined
  const currentDocumentHref = buildCurrentDocumentHref(id, resolvedSearchParams)

  try {
    const detail = await getDocumentDetail(id)

    if (!detail) {
      return (
        <Stack spacing={4} sx={{ width: '100%' }}>
          <PageHeader
            eyebrow={PAGE_LABELS.documentDetail}
            title={'No Data'}
            description={
              'Inspect the full document record, metadata payload, audit trail, state history, and duplicate relationships.'
            }
          />
          <ReturnToPreviousPage href={returnHref} label={returnLabel} />
          <NoDataState message={'No document data is available for this record yet.'} />
        </Stack>
      )
    }

    const { document, metadata } = detail
    const {
      events: pipelineEvents,
      batchLinks: pipelineBatchLinks,
      diagnosticsHref,
    } = buildPipelineDiagnostics(detail, metadata, currentDocumentHref)
    const reprocessingDrafts = await getReprocessingDrafts()

    return (
      <Stack spacing={4} sx={{ width: '100%' }}>
        <ReturnToPreviousPage href={returnHref} label={returnLabel} />
        <PageHeader
          eyebrow={PAGE_LABELS.documentDetail}
          title={document.name || document.id}
          description={
            'Inspect the full document record, metadata payload, audit trail, state history, and duplicate relationships.'
          }
        />

        <DocumentEditCoordinator
          documentId={document.id}
          metadata={metadata}
          quality={detail.quality}
          initialTags={detail.document_to_tags}
          initialContributors={detail.document_to_contributors}
          initialPublishers={detail.document_to_publishers}
          editWarning={getDocumentEditWarning({
            validationStatus: detail.quality?.validation_status,
            hasPublishedBatch: detail.document_to_batches.some(
              (batch) =>
                batch.batch_publication_status?.toLowerCase() === GENERATED_BATCH_PUBLICATION_STATUSES.PUBLISHED,
            ),
            latestState: detail.state_history[0]?.new_state,
          })}
          toolbarContent={buildDocumentReviewToolbar(detail, reprocessingDrafts, diagnosticsHref)}
        >
          <DocumentPropertiesSection document={document} metadata={metadata} />
          <Stack component={'section'} spacing={4}>
            <DocumentVersionsSection
              versionFamily={detail.version_family}
              versions={detail.versions}
              returnHref={currentDocumentHref}
              documentName={document.name || document.id}
              isDuplicate={document.is_duplicate}
            />
            <DetailPageSection title={'Tags'}>
              <Box sx={{ mt: 3 }}>
                <DocumentTagsEditor documentId={document.id} initialTags={detail.document_to_tags} />
              </Box>
            </DetailPageSection>
            <DocumentMetadataSection
              metadata={metadata}
              contributors={detail.document_to_contributors}
              publishers={detail.document_to_publishers}
            />
            <DocumentCommentsSection metadata={metadata} quality={detail.quality} />
            <DocumentBatchesSection
              batchAssociations={detail.document_to_batches}
              batchReturnHref={currentDocumentHref}
              batchReturnLabel={`document ${document.name?.trim() || document.id}`}
              readiness={detail.readiness}
              activeReviewReasons={document.needs_review_reasons ?? []}
              pipelineEvents={pipelineEvents}
              pipelineBatchLinks={pipelineBatchLinks}
            />
          </Stack>

          <DocumentHistorySections
            audits={detail.audits}
            states={detail.state_history}
            documentId={document.id}
            needsReviewReasons={document.needs_review_reasons ?? []}
            diagnosticsHref={diagnosticsHref}
          />
        </DocumentEditCoordinator>
      </Stack>
    )
  } catch {
    return (
      <Stack spacing={4} sx={{ width: '100%' }}>
        <PageHeader
          eyebrow={PAGE_LABELS.documentDetail}
          title={'No Data'}
          description={
            'Inspect the full document record, metadata payload, audit trail, state history, and duplicate relationships.'
          }
        />
        <NoDataState
          message={
            'No data is available right now. The database may be empty, unavailable, or still being initialized.'
          }
        />
      </Stack>
    )
  }
}
