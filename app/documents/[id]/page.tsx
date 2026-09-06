import type { ReactElement, ReactNode } from 'react'
import { Box, Divider, Paper, Stack, Typography } from '@mui/material'

import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { ReturnToPreviousPage } from '@atoms/ReturnToPreviousPage'
import { SourceId } from '@atoms/SourceId'
import { SourceFolderId } from '@atoms/SourceFolderId'
import { AuditHistoryTable } from '@organisms/AuditHistoryTable'
import { DocumentBatchAssociations } from '@organisms/DocumentBatchAssociations'
import { DocumentLineageSection } from '@organisms/DocumentLineageSection'
import { DocumentReadinessDiagnostics } from '@organisms/DocumentReadinessDiagnostics'
import { DocumentTagsEditor } from '@organisms/DocumentTagsEditor'
import { DocumentVersionsButton } from '@organisms/DocumentVersionsButton'
import { DetailPageSection } from '@organisms/DetailPageSection'
import { DetailFieldGrid } from '@molecules/DetailFieldGrid'
import { MetadataTable } from '@molecules/MetadataTable'
import { NeedsReviewReasons } from '@molecules/NeedsReviewReasons'
import { NoDataState } from '@organisms/NoDataState'
import { PageHeader } from '@organisms/PageHeader'
import { ReviewHistoryTable } from '@organisms/ReviewHistoryTable'
import { parseMetadataValue } from '@lib/metadata'
import { getDocumentDetail } from '@lib/queries/queries'
import {
  COLLECTIONS_PATH,
  DOCUMENTS_PATH,
  FAILED_PATH,
  READY_FOR_LIBRARY_PATH,
  REVIEW_QUEUE_PATH,
} from '@constants/paths'
import { PAGE_LABELS } from '@constants/pageLabels'
import type { MetadataField } from 'types/metadata'

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

const documentFieldLabels: Array<{ key: string; label: string }> = [
  { key: 'id', label: 'Document ID' },
  { key: 'name', label: 'Name' },
  { key: 'idLegacy', label: 'Legacy ID' },
  { key: 'accessLevels', label: 'Access Status' },
  { key: 'filesize', label: 'File Size' },
  { key: 'hashBinary', label: 'Hash (Binary)' },
  { key: 'hashContent', label: 'Hash (Content)' },
  { key: 'created_at', label: 'Created At' },
  { key: 'updated_at', label: 'Updated At' },
]

const panelSx = {
  bgcolor: 'background.paper',
  border: '1px solid',
  borderColor: 'rgba(53, 88, 52, 0.15)',
  boxShadow: 2,
  p: { xs: 2.5, md: 3 },
}

const contentDedupTextSourceIdMetadataKeys = new Set(['content_dedup_text_source_id', 'content_hash_timestamp'])

const fedoraSourceMetadataKeys = new Set([
  'fedora_csv_source_id',
  'fedora_publication_source_document_id',
  'fedora_url',
])

const ocrSourceMetadataKeys = new Set([
  'ocr_metadata_source_file',
  'ocr_source_document_id',
  'ocr_source_document_name',
  'ocr_source_pdf_origin',
  'ocr_text_url',
  'ocr_version_document_id',
])

const originSourceMetadataKeys = new Set([
  'folder_context',
  'origin_parent_name',
  'origin_parent_source_id',
  'origin_source_id',
  'origin_url',
  'original_filename',
])

const rotatorSourceMetadataKeys = new Set(['rotation_source_document_id', 'rotation_source_document_name'])

const sourceMetadataKeys = new Set([
  'source_created_at',
  'source_folder_id',
  'source_folder_structure',
  'source_id',
  'source_updated_at',
])

const splitterSourceMetadataKeys = new Set(['split_parent_document_id', 'split_parent_document_name'])

const recordedSourceMetadataKeys = new Set([
  ...contentDedupTextSourceIdMetadataKeys,
  ...fedoraSourceMetadataKeys,
  ...ocrSourceMetadataKeys,
  ...originSourceMetadataKeys,
  ...rotatorSourceMetadataKeys,
  ...sourceMetadataKeys,
  ...splitterSourceMetadataKeys,
])

function renderMetadataValue(field: MetadataField): ReactNode {
  if (field.name === 'needs_review') {
    return <NeedsReviewReasons value={field.value} />
  }

  const parsed = parseMetadataValue(field.value, field.value_type)

  if (
    [
      'content_dedup_text_source_id',
      'fedora_csv_source_id',
      'fedora_publication_source_document_id',
      'ocr_source_document_id',
      'ocr_version_document_id',
      'origin_source_id',
      'rotation_source_document_id',
      'source_id',
      'split_parent_document_id',
    ].includes(field.name)
  ) {
    return <SourceId value={parsed.display as string} />
  }

  if (['source_folder_id', 'origin_parent_source_id'].includes(field.name)) {
    return <SourceFolderId value={parsed.display as string} />
  }

  if (['content_hash_timestamp', 'source_created_at', 'source_updated_at'].includes(field.name)) {
    return <DateAtom value={parsed.display as number} />
  }

  return parsed.display
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
              'Inspect the full document record, metadata payload, audit trail, review history, and duplicate relationships.'
            }
          />
          <ReturnToPreviousPage href={returnHref} label={returnLabel} />
          <NoDataState message={'No document data is available for this record yet.'} />
        </Stack>
      )
    }

    const { audits, document, metadata, reviews, version_family, versions } = detail
    const recordedSourceMetadata = metadata.filter((field) => recordedSourceMetadataKeys.has(field.name))
    const displayedMetadata = metadata.filter((field) => !recordedSourceMetadataKeys.has(field.name))

    const documentFieldValues = {
      id: document.id,
      name: document.name ?? '—',
      idLegacy: document.id_legacy ?? '—',
      accessLevels: detail.access_levels,
      filesize: document.filesize,
      hashBinary: document.hash_binary ?? '—',
      hashContent: document.hash_content ?? '—',
      created_at: document.created_at,
      updated_at: document.updated_at,
    } as Record<string, string | bigint | number | string[] | null | undefined>

    return (
      <Stack spacing={4} sx={{ width: '100%' }}>
        <ReturnToPreviousPage href={returnHref} label={returnLabel} />
        <PageHeader
          eyebrow={PAGE_LABELS.documentDetail}
          title={document.name || document.id}
          description={
            'Inspect the full document record, metadata payload, audit trail, review history, and duplicate relationships.'
          }
        />

        <DetailPageSection title={'Document Fields'}>
          <DetailFieldGrid
            fields={documentFieldLabels.map((field) => ({
              key: field.key,
              label: field.label,
              value:
                field.key === 'accessLevels' ? (
                  (documentFieldValues[field.key] as string[]).join(', ') || '—'
                ) : field.key === 'filesize' ? (
                  <FileSize value={documentFieldValues.filesize as bigint | number | null | undefined} />
                ) : field.key === 'created_at' || field.key === 'updated_at' ? (
                  <DateAtom value={documentFieldValues[field.key] as string | Date | null | undefined} />
                ) : (
                  documentFieldValues[field.key] || '—'
                ),
            }))}
          />
        </DetailPageSection>

        <Stack component={'section'} spacing={4}>
          <Paper component={'section'} elevation={0} sx={panelSx}>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              sx={{ alignItems: { xs: 'stretch', md: 'flex-start' }, justifyContent: 'space-between' }}
            >
              <Box>
                <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
                  {'Versions'}
                </Typography>
                <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 1 }}>
                  {'Open the related document versions and duplicates for this record.'}
                </Typography>
              </Box>
              {version_family ? (
                <DocumentVersionsButton
                  versionFamily={version_family}
                  returnHref={currentDocumentHref}
                  returnDocumentName={document.name || document.id}
                />
              ) : null}
            </Stack>
            {versions.length > 0 ? (
              <Stack spacing={3} sx={{ mt: 3 }}>
                {versions.map((version) => (
                  <DetailFieldGrid
                    key={version.id}
                    fields={[
                      { key: 'version-group', label: 'Version Group', value: version.version_group_id },
                      { key: 'changes-summary', label: 'Changes Summary', value: version.changes_summary ?? '-' },
                      { key: 'notes', label: 'Notes', value: version.notes ?? '-' },
                      {
                        key: 'similarity',
                        label: 'Similarity',
                        value: version.similarity_score !== null ? version.similarity_score : '-',
                      },
                      {
                        key: 'analyzed-at',
                        label: 'Analyzed At',
                        value: version.analyzed_at !== null ? <DateAtom value={version.analyzed_at} /> : '-',
                      },
                    ]}
                  />
                ))}
              </Stack>
            ) : null}
            {version_family && versions.length === 0 ? (
              <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 2 }}>
                {'No version membership records are stored for this document.'}
              </Typography>
            ) : null}
            {!version_family && detail.document.is_duplicate ? (
              <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 2 }}>
                {
                  'This document is tagged as a duplicate, but the current registry data did not include a version group or duplicate family for it. The overview can flag it as duplicate, but the related duplicate set is not available to display here yet.'
                }
              </Typography>
            ) : null}
            {!version_family && !detail.document.is_duplicate ? (
              <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 2 }}>
                {'No related versions available.'}
              </Typography>
            ) : null}
            <DocumentLineageSection detail={detail} />
          </Paper>

          <Paper component={'section'} elevation={0} sx={panelSx}>
            <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
              {'Tags'}
            </Typography>
            <Box sx={{ mt: 3 }}>
              <DocumentTagsEditor documentId={document.id} initialTags={detail.document_to_tags} />
            </Box>
          </Paper>

          <Paper component={'section'} elevation={0} sx={panelSx}>
            <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
              {'Metadata'}
            </Typography>
            <MetadataTable fields={displayedMetadata} renderValue={renderMetadataValue} />
            {recordedSourceMetadata.length > 0 ? (
              <>
                <Divider sx={{ my: 4 }} />
                <Typography component={'h3'} variant={'h6'} color={'text.primary'}>
                  {'Recorded source metadata'}
                </Typography>
                <MetadataTable fields={recordedSourceMetadata} minWidth={520} renderValue={renderMetadataValue} />
              </>
            ) : null}
          </Paper>

          <Paper component={'section'} elevation={0} sx={panelSx}>
            <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
              {'Batches'}
            </Typography>
            <DocumentBatchAssociations
              batchAssociations={detail.document_to_batches}
              batchReturnHref={currentDocumentHref}
              batchReturnLabel={PAGE_LABELS.documentDetail}
            />
            <Box sx={{ mt: 4 }}>
              <DocumentReadinessDiagnostics
                readiness={detail.readiness}
                activeReviewReasons={detail.document.needs_review_reasons}
              />
            </Box>
          </Paper>
        </Stack>

        <Box
          component={'section'}
          sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', xl: 'repeat(2, minmax(0, 1fr))' } }}
        >
          <Paper component={'section'} elevation={0} sx={panelSx}>
            <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
              {'Audit History'}
            </Typography>
            <Box sx={{ mt: 3 }}>
              <AuditHistoryTable audits={audits} />
            </Box>
          </Paper>

          <Paper component={'section'} elevation={0} sx={panelSx}>
            <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
              {'Review History'}
            </Typography>
            <Box sx={{ mt: 3 }}>
              <ReviewHistoryTable reviews={reviews} />
            </Box>
          </Paper>
        </Box>
      </Stack>
    )
  } catch {
    return (
      <Stack spacing={4} sx={{ width: '100%' }}>
        <PageHeader
          eyebrow={PAGE_LABELS.documentDetail}
          title={'No Data'}
          description={
            'Inspect the full document record, metadata payload, audit trail, review history, and duplicate relationships.'
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
