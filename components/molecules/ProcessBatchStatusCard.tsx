import type { ReactElement } from 'react'
import { Box, List, ListItem, Paper, Stack, Typography } from '@mui/material'

import { PipelineStageStatusBadge } from '@atoms/Badges/PipelineStageStatusBadge'
import type {
  ProcessBatchStatus,
  ProcessStageStatus,
} from '@lib/processBatches'

interface ProcessBatchStatusCardProps {
  batch: ProcessBatchStatus
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

function StageMetrics({ stageName, stage }: { stageName: string; stage: ProcessStageStatus }): ReactElement {
  const metrics: Array<{ label: string; value: number }> =
    stageName === 'Ingest'
      ? [
          { label: 'Processed', value: stage.processedCount },
          { label: 'Ingested', value: stage.ingestedCount },
          { label: 'Duplicates', value: stage.duplicateCount },
          { label: 'Same Origin Skips', value: stage.skippedSameOriginCount },
        ]
      : [
          { label: 'Processed', value: stage.processedCount },
          { label: 'Split Docs', value: stage.splitCount },
          { label: 'Child Docs', value: stage.childCount },
          { label: 'Pass Through', value: stage.passedThroughCount },
        ]

  return (
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
      {metrics.map(({ label, value }) => (
        <Metric key={label} label={label} value={value} />
      ))}
    </Box>
  )
}

function StageCard({
  label,
  stage,
}: {
  label: string
  stage: ProcessStageStatus | null
}): ReactElement | null {
  if (!stage) {
    return null
  }

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'background.default' }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1.5,
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
          }}
        >
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              {label}
            </Typography>
            <Typography variant="h6">{label}</Typography>
          </Box>
          <PipelineStageStatusBadge status={stage.status} />
        </Box>

        <StageMetrics stageName={label} stage={stage} />

        <Box
          sx={{
            display: 'grid',
            gap: 1.25,
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 1fr',
            },
          }}
        >
          <DetailRow label="Initiated" value={formatDateTime(stage.initiatedAt)} />
          <DetailRow label="Started" value={formatDateTime(stage.startedAt)} />
          <DetailRow label="Completed" value={formatDateTime(stage.completedAt)} />
          <DetailRow label="Last Transition" value={formatDateTime(stage.lastTransitionAt)} />
          <DetailRow label="Callback Delivery" value={stage.callbackDeliveryStatus ?? '—'} />
          <DetailRow label="Callback Received" value={formatDateTime(stage.callbackReceivedAt)} />
        </Box>

        {stage.collectionName ? (
          <DetailRow
            label="Collection"
            value={
              stage.collectionNotes
                ? `${stage.collectionName} — ${stage.collectionNotes}`
                : stage.collectionName
            }
          />
        ) : null}

        {stage.sourceFolderIds.length > 0 ? (
          <Box>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
              Source folders
            </Typography>
            <List dense disablePadding>
              {stage.sourceFolderIds.map((folderId) => (
                <ListItem key={folderId} disablePadding sx={{ py: 0.5 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>
                    {folderId}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        ) : null}

        {stage.error ? (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(156, 74, 63, 0.08)' }}>
            <Typography variant="body2" sx={{ color: '#9c4a3f' }}>
              {stage.error}
            </Typography>
          </Paper>
        ) : null}

        {stage.callbackErrorMessage ? (
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(29, 42, 47, 0.05)' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                Callback diagnostic:
              </Box>{' '}
              {stage.callbackErrorType ?? 'Error'}
              {stage.callbackHttpStatus ? ` (${stage.callbackHttpStatus})` : ''} —{' '}
              {stage.callbackErrorMessage}
            </Typography>
          </Paper>
        ) : null}
      </Stack>
    </Paper>
  )
}

export function ProcessBatchStatusCard({
  batch,
}: ProcessBatchStatusCardProps): ReactElement {
  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, p: 3 }}>
      <Stack spacing={2.5}>
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

        <DetailRow label="Created" value={formatDateTime(batch.createdAt)} />
        <DetailRow
          label="Requested Stages"
          value={
            batch.pipelineRequestedStages.length > 0
              ? batch.pipelineRequestedStages.join(', ')
              : 'Ingest only'
          }
        />

        <StageCard label="Ingest" stage={batch.ingester} />
        <StageCard label="Document Splitter" stage={batch.documentSplitter} />
      </Stack>
    </Paper>
  )
}
