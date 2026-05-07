import type { ReactElement } from 'react'
import { Box, List, ListItem, Paper, Stack, Typography } from '@mui/material'

import type { IngestBatchStatus } from '@lib/ingestBatches'
import { IngestStatusBadge } from '@atoms/Badges/IngestStatusBadge'

interface IngestBatchStatusCardProps {
  batch: IngestBatchStatus
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function Metric({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Box>
  )
}

function DetailRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
        {label}:
      </Box>{' '}
      {value}
    </Typography>
  )
}

export function IngestBatchStatusCard({ batch }: IngestBatchStatusCardProps): ReactElement {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={2.5}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
          }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
              Batch
            </Typography>
            <Typography variant="h5" sx={{ mt: 1 }}>
              {batch.batchName ?? batch.batchId}
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {batch.startedBy ?? 'Unknown starter'}
            </Typography>
          </Box>
          <IngestStatusBadge status={batch.status} />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 2,
            gridTemplateColumns: {
              xs: '1fr 1fr',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
          }}
        >
          <Metric label="Processed" value={batch.processedCount} />
          <Metric label="Ingested" value={batch.ingestedCount} />
          <Metric label="Duplicates" value={batch.duplicateCount} />
          <Metric label="Same Origin Skips" value={batch.skippedSameOriginCount} />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
            },
          }}
        >
          <DetailRow label="Started" value={formatDateTime(batch.startedAt ?? batch.createdAt)} />
          <DetailRow label="Completed" value={formatDateTime(batch.completedAt)} />
          <DetailRow label="Last Transition" value={formatDateTime(batch.lastTransitionAt)} />
          <DetailRow label="Callback Delivery" value={batch.callbackDeliveryStatus ?? '—'} />
          <DetailRow label="Callback Received" value={formatDateTime(batch.callbackReceivedAt)} />
        </Box>

        {batch.collectionName ? (
          <DetailRow
            label="Collection"
            value={
              batch.collectionNotes
                ? `${batch.collectionName} — ${batch.collectionNotes}`
                : batch.collectionName
            }
          />
        ) : null}

        {batch.sourceFolderIds.length > 0 ? (
          <Box>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
              Source folders
            </Typography>
            <List dense disablePadding>
              {batch.sourceFolderIds.map((folderId) => (
                <ListItem key={folderId} disablePadding sx={{ py: 0.5 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>
                    {folderId}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        ) : null}

        {batch.error ? (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(156, 74, 63, 0.08)' }}>
            <Typography variant="body2" sx={{ color: '#9c4a3f' }}>
              {batch.error}
            </Typography>
          </Paper>
        ) : null}

        {batch.callbackErrorMessage ? (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(29, 42, 47, 0.05)' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Callback diagnostic:
              </Box>{' '}
              {batch.callbackErrorType ?? 'Error'}
              {batch.callbackHttpStatus ? ` (${batch.callbackHttpStatus})` : ''} — {batch.callbackErrorMessage}
            </Typography>
          </Paper>
        ) : null}
      </Stack>
    </Paper>
  )
}
