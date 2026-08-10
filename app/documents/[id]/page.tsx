import type { ReactElement } from 'react'
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'

import { DateAtom } from '@atoms/Date'
import { FileSize } from '@atoms/FileSize'
import { ReturnToPreviousPage } from '@atoms/ReturnToPreviousPage'
import { SourceId } from '@atoms/SourceId'
import { SourceFolderId } from '@atoms/SourceFolderId'
import { AuditHistoryTable } from '@organisms/AuditHistoryTable'
import { DocumentLineageSection } from '@organisms/DocumentLineageSection'
import { DocumentTagsEditor } from '@organisms/DocumentTagsEditor'
import { DocumentVersionsButton } from '@organisms/DocumentVersionsButton'
import { DetailPageSection } from '@organisms/DetailPageSection'
import { DetailFieldGrid } from '@molecules/DetailFieldGrid'
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

const insetSx = {
  bgcolor: 'rgba(244, 241, 240, 0.45)',
  borderRadius: 3,
  p: 2,
}

const detailGridSx = {
  display: 'grid',
  gap: 2,
  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
  m: 0,
  mt: 3,
}

const detailLabelSx = {
  color: 'text.secondary',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.15em',
  textTransform: 'uppercase',
}

const detailValueSx = {
  color: 'text.primary',
  mt: 1,
  overflowWrap: 'anywhere',
}

const tableHeadCellSx = {
  bgcolor: '#f4f1eb',
  borderBottom: '2px solid',
  borderBottomColor: 'primary.main',
  color: 'text.primary',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  px: 1.5,
  py: 1,
  textTransform: 'uppercase',
}

const tableBodyCellSx = {
  borderBottom: '1px solid rgba(53, 88, 52, 0.1)',
  color: 'text.primary',
  fontSize: '0.875rem',
  px: 1.5,
  py: 1.5,
  verticalAlign: 'top',
}

function DetailValue({ children }: { children: React.ReactNode }): ReactElement {
  return (
    <Box component={'dd'} sx={{ ...detailValueSx, m: 0 }}>
      {children}
    </Box>
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
              'Inspect the full document record, metadata payload, audit trail, review history, and duplicate relationships.'
            }
          />
          <ReturnToPreviousPage href={returnHref} label={returnLabel} />
          <NoDataState message={'No document data is available for this record yet.'} />
        </Stack>
      )
    }

    const { audits, document, metadata, reviews, version_family, versions } = detail

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
              <Box sx={{ ...detailGridSx, mt: 3 }}>
                {versions.map((version) => (
                  <Box key={version.id} component={'div'} sx={insetSx}>
                    <Stack component={'dl'} spacing={1.5} sx={{ m: 0 }}>
                      <Box component={'div'}>
                        <Typography component={'dt'} variant={'caption'} sx={detailLabelSx}>
                          {'Version Group'}
                        </Typography>
                        <DetailValue>{version.version_group_id}</DetailValue>
                      </Box>
                      <Box component={'div'}>
                        <Typography component={'dt'} variant={'caption'} sx={detailLabelSx}>
                          {'Changes Summary'}
                        </Typography>
                        <DetailValue>{version.changes_summary ?? '-'}</DetailValue>
                      </Box>
                      <Box component={'div'}>
                        <Typography component={'dt'} variant={'caption'} sx={detailLabelSx}>
                          {'Notes'}
                        </Typography>
                        <DetailValue>{version.notes ?? '-'}</DetailValue>
                      </Box>
                      <Box component={'div'}>
                        <Typography component={'dt'} variant={'caption'} sx={detailLabelSx}>
                          {'Similarity'}
                        </Typography>
                        <DetailValue>{version.similarity_score !== null ? version.similarity_score : '-'}</DetailValue>
                      </Box>
                      <Box component={'div'}>
                        <Typography component={'dt'} variant={'caption'} sx={detailLabelSx}>
                          {'Analyzed At'}
                        </Typography>
                        <DetailValue>
                          {version.analyzed_at !== null ? <DateAtom value={version.analyzed_at} /> : '-'}
                        </DetailValue>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Box>
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
          </Paper>

          <Paper component={'section'} elevation={0} sx={panelSx}>
            <Typography component={'h2'} variant={'h5'} color={'text.primary'}>
              {'Metadata'}
            </Typography>
            {metadata.length > 0 ? (
              <TableContainer sx={{ mt: 3, overflowX: 'auto' }}>
                <Table size={'small'} sx={{ minWidth: 560 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell scope={'col'} sx={tableHeadCellSx}>
                        {'Field'}
                      </TableCell>
                      <TableCell scope={'col'} sx={tableHeadCellSx}>
                        {'Value'}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metadata.map(({ name, value, value_type }, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ ...tableBodyCellSx, fontWeight: 500 }}>{name}</TableCell>
                        <TableCell sx={tableBodyCellSx}>
                          {(() => {
                            const parsed = parseMetadataValue(value, value_type)
                            return [
                              'content_dedup_text_source_id',
                              'fedora_csv_source_id',
                              'fedora_publication_source_document_id',
                              'ocr_source_document_id',
                              'ocr_version_document_id',
                              'origin_source_id',
                              'rotation_source_document_id',
                              'source_id',
                              'split_parent_document_id',
                            ].includes(name) ? (
                              <SourceId value={parsed.display as string} />
                            ) : ['source_folder_id', 'origin_parent_source_id'].includes(name) ? (
                              <SourceFolderId value={parsed.display as string} />
                            ) : ['content_hash_timestamp', 'source_created_at', 'source_updated_at'].includes(name) ? (
                              <DateAtom value={parsed.display as number} />
                            ) : (
                              parsed.display
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 2 }}>
                {'No metadata available.'}
              </Typography>
            )}
          </Paper>

          <DocumentLineageSection detail={detail} />

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
              {'Batches'}
            </Typography>
            {detail.document_to_batches.length > 0 ? (
              <TableContainer sx={{ mt: 3, overflowX: 'auto' }}>
                <Table size={'small'} sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell scope={'col'} sx={tableHeadCellSx}>
                        {'Batch ID'}
                      </TableCell>
                      <TableCell scope={'col'} sx={tableHeadCellSx}>
                        {'Batch Origin'}
                      </TableCell>
                      <TableCell scope={'col'} sx={tableHeadCellSx}>
                        {'Processing Time'}
                      </TableCell>
                      <TableCell scope={'col'} sx={tableHeadCellSx}>
                        {'OCR Low'}
                      </TableCell>
                      <TableCell scope={'col'} sx={tableHeadCellSx}>
                        {'OCR Medium'}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.document_to_batches.map((batchLink) => (
                      <TableRow key={batchLink.id}>
                        <TableCell sx={{ ...tableBodyCellSx, fontWeight: 500 }}>
                          {batchLink.batch_legacy_id ?? batchLink.batch_id}
                        </TableCell>
                        <TableCell sx={tableBodyCellSx}>{batchLink.batch_origin ?? '—'}</TableCell>
                        <TableCell sx={tableBodyCellSx}>{batchLink.processing_time_seconds ?? '—'}</TableCell>
                        <TableCell sx={tableBodyCellSx}>{batchLink.ocr_quality_low ? 'True' : 'False'}</TableCell>
                        <TableCell sx={tableBodyCellSx}>{batchLink.ocr_quality_medium ? 'True' : 'False'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 2 }}>
                {'No batch links available.'}
              </Typography>
            )}
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
