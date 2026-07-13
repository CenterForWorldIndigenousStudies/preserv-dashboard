import type { ReactElement, ReactNode } from 'react'

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
import { SourceFolderId } from '@atoms/SourceFolderId'
import { SourceId } from '@atoms/SourceId'
import { parseMetadataValue } from '@lib/metadata'
import type { DocumentDetail, DocumentMetadataField } from 'types/documents'

const provenanceMetadataKeys = new Set([
  'content_dedup_text_source_id',
  'content_hash_timestamp',
  'fedora_csv_source_id',
  'fedora_publication_source_document_id',
  'ocr_source_document_id',
  'ocr_source_document_name',
  'ocr_version_document_id',
  'origin_parent_name',
  'origin_parent_source_id',
  'origin_source_id',
  'origin_url',
  'rotation_source_document_id',
  'rotation_source_document_name',
  'source_created_at',
  'source_folder_id',
  'source_id',
  'source_updated_at',
  'split_parent_document_id',
  'split_parent_document_name',
])

const lineageCardSx = {
  border: 1,
  borderColor: 'divider',
  p: 3,
}

const metadataValuePanelSx = {
  backgroundColor: 'rgba(244, 241, 240, 0.45)',
  borderRadius: 1.5,
  p: 2,
}

const tableHeaderCellSx = {
  backgroundColor: 'sand.main',
  borderBottom: '2px solid',
  borderBottomColor: 'moss.main',
  color: 'text.primary',
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.1em',
  px: 1.5,
  py: 1,
  textTransform: 'uppercase' as const,
}

const tableBodyCellSx = {
  borderBottom: '1px solid',
  borderColor: 'divider',
  px: 1.5,
  py: 1.5,
  verticalAlign: 'top',
}

function renderMetadataValue(field: DocumentMetadataField): ReactNode {
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

  if (['origin_parent_source_id', 'source_folder_id'].includes(field.name)) {
    return <SourceFolderId value={parsed.display as string} />
  }

  if (['content_hash_timestamp', 'source_created_at', 'source_updated_at'].includes(field.name)) {
    return <DateAtom value={parsed.display as number | string} />
  }

  return parsed.display
}

function getCurrentDocumentStatus(detail: DocumentDetail): string | null {
  if (detail.version_family?.canonical_document_id === detail.document.id) {
    return 'Canonical document'
  }

  if (detail.document.is_duplicate) {
    return 'Duplicate document'
  }

  if (detail.version_family) {
    return 'Related document'
  }

  return null
}

export function DocumentLineageSection({ detail }: { detail: DocumentDetail }): ReactElement {
  const recordedSourceMetadata = detail.metadata.filter((field) => provenanceMetadataKeys.has(field.name))
  const batchLinks = detail.document_to_batches.filter(
    (batchLink) => batchLink.batch_name !== null || batchLink.batch_origin !== null || batchLink.added_at !== null,
  )
  const currentDocumentStatus = getCurrentDocumentStatus(detail)
  const hasSignals =
    detail.version_family !== null ||
    currentDocumentStatus !== null ||
    recordedSourceMetadata.length > 0 ||
    batchLinks.length > 0

  return (
    <Stack component="section" spacing={3}>
      <Box>
        <Typography component="h2" variant="h5" color="text.primary">
          Lineage and Provenance
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Review related version family details, recorded source metadata, and batch links that are already stored for
          this document.
        </Typography>
      </Box>

      {!hasSignals ? (
        <Paper elevation={0} sx={lineageCardSx}>
          <Typography variant="body2" color="text.secondary">
            No lineage or provenance details are available for this document.
          </Typography>
        </Paper>
      ) : null}

      {detail.version_family !== null || currentDocumentStatus !== null ? (
        <Paper elevation={0} sx={lineageCardSx}>
          <Typography component="h3" variant="h6" color="text.primary">
            Related version family
          </Typography>
          <Box
            component="dl"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              gap: 2,
              m: 0,
              mt: 3,
            }}
          >
            {currentDocumentStatus !== null ? (
              <Box component="div" sx={metadataValuePanelSx}>
                <Typography component="dt" variant="overline" color="text.secondary">
                  Current document status
                </Typography>
                <Typography component="dd" variant="body2" color="text.primary" sx={{ m: 0, mt: 1 }}>
                  {currentDocumentStatus}
                </Typography>
              </Box>
            ) : null}

            {detail.version_family !== null ? (
              <>
                <Box component="div" sx={metadataValuePanelSx}>
                  <Typography component="dt" variant="overline" color="text.secondary">
                    Canonical document ID
                  </Typography>
                  <Typography component="dd" variant="body2" color="text.primary" sx={{ m: 0, mt: 1, overflowWrap: 'anywhere' }}>
                    {detail.version_family.canonical_document_id}
                  </Typography>
                </Box>
                <Box component="div" sx={metadataValuePanelSx}>
                  <Typography component="dt" variant="overline" color="text.secondary">
                    Related documents
                  </Typography>
                  <Typography component="dd" variant="body2" color="text.primary" sx={{ m: 0, mt: 1 }}>
                    {detail.version_family.documents.length}
                  </Typography>
                </Box>
              </>
            ) : null}
          </Box>

          {detail.version_family === null && detail.document.is_duplicate ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              A duplicate document tag is recorded for this document, but no related version family is available to
              display.
            </Typography>
          ) : null}
        </Paper>
      ) : null}

      {recordedSourceMetadata.length > 0 ? (
        <Paper elevation={0} sx={lineageCardSx}>
          <Typography component="h3" variant="h6" color="text.primary">
            Recorded source metadata
          </Typography>
          <TableContainer sx={{ mt: 3, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 520 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Field</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recordedSourceMetadata.map((field) => (
                  <TableRow key={field.name}>
                    <TableCell component="th" scope="row" sx={{ ...tableBodyCellSx, fontWeight: 600 }}>
                      {field.name}
                    </TableCell>
                    <TableCell sx={tableBodyCellSx}>{renderMetadataValue(field)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      {batchLinks.length > 0 ? (
        <Paper elevation={0} sx={lineageCardSx}>
          <Typography component="h3" variant="h6" color="text.primary">
            Batch links
          </Typography>
          <TableContainer sx={{ mt: 3, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderCellSx}>Batch name</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Batch origin</TableCell>
                  <TableCell sx={tableHeaderCellSx}>Added at</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {batchLinks.map((batchLink) => (
                  <TableRow key={batchLink.id}>
                    <TableCell component="th" scope="row" sx={{ ...tableBodyCellSx, fontWeight: 600 }}>
                      {batchLink.batch_name ?? '—'}
                    </TableCell>
                    <TableCell sx={tableBodyCellSx}>{batchLink.batch_origin ?? '—'}</TableCell>
                    <TableCell sx={tableBodyCellSx}>
                      <DateAtom value={batchLink.added_at} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}
    </Stack>
  )
}
