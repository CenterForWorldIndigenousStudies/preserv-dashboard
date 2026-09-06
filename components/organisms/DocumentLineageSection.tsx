import type { ReactElement } from 'react'

import { Box, Paper, Stack, Typography } from '@mui/material'

import { AccordionPanel } from '@molecules/AccordionPanel'
import { DetailFieldGrid } from '@molecules/DetailFieldGrid'
import type { DocumentDetail } from 'types/documents'

const lineageCardSx = {
  border: 1,
  borderColor: 'divider',
  p: 3,
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

interface DocumentLineageSectionProps {
  detail: DocumentDetail
}

export function DocumentLineageSection({ detail }: DocumentLineageSectionProps): ReactElement {
  const currentDocumentStatus = getCurrentDocumentStatus(detail)
  const hasSignals = detail.version_family !== null || currentDocumentStatus !== null

  return (
    <AccordionPanel
      defaultExpanded={false}
      sx={{ mt: 4 }}
      summary={
        <Box>
          <Typography variant={'h6'} color={'text.primary'}>
            {'Lineage and Provenance'}
          </Typography>
          <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 0.5 }}>
            {'Review related version family details for this document.'}
          </Typography>
        </Box>
      }
      detailsSx={{ px: 3, pt: 0, pb: 3 }}
    >
      <Stack spacing={3}>
        {!hasSignals ? (
          <Paper elevation={0} sx={lineageCardSx}>
            <Typography variant={'body2'} color={'text.secondary'}>
              {'No lineage or provenance details are available for this document.'}
            </Typography>
          </Paper>
        ) : null}

        {detail.version_family !== null || currentDocumentStatus !== null ? (
          <Paper elevation={0} sx={lineageCardSx}>
            <Typography component={'h3'} variant={'h6'} color={'text.primary'}>
              {'Related version family'}
            </Typography>
            <DetailFieldGrid
              fields={[
                ...(currentDocumentStatus !== null
                  ? [{ key: 'current-status', label: 'Current document status', value: currentDocumentStatus }]
                  : []),
                ...(detail.version_family !== null
                  ? [
                      {
                        key: 'canonical-document-id',
                        label: 'Canonical document ID',
                        value: detail.version_family.canonical_document_id,
                      },
                      {
                        key: 'related-documents',
                        label: 'Related documents',
                        value: detail.version_family.documents.length,
                      },
                    ]
                  : []),
              ]}
            />

            {detail.version_family === null && detail.document.is_duplicate ? (
              <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 2 }}>
                {
                  'A duplicate document tag is recorded for this document, but no related version family is available to display.'
                }
              </Typography>
            ) : null}
          </Paper>
        ) : null}

      </Stack>
    </AccordionPanel>
  )
}
