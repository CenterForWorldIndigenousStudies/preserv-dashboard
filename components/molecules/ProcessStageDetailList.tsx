import type { ReactElement } from 'react'
import { Box, List, ListItem, Typography } from '@mui/material'

import { formatDateTime } from '@lib/dateTime'
import { ProcessDetailRow } from '@molecules/ProcessDetailRow'
import type { ProcessStageStatus } from 'types/pipelineContracts'

interface ProcessStageDetailListProps {
  stage: ProcessStageStatus
}

export function ProcessStageDetailList({ stage }: ProcessStageDetailListProps): ReactElement {
  const modeLabel = stage.mode === 'openai_batch' ? 'OpenAI Batch Service' : stage.mode === 'direct' ? 'Direct' : '—'

  const waveOneLabel = stage.openaiBatchWave1
    ? `${stage.openaiBatchWave1.status ?? '—'} (${stage.openaiBatchWave1.succeededCount} succeeded, ${stage.openaiBatchWave1.failedCount} failed)`
    : '—'
  const waveTwoLabel = stage.openaiBatchWave2
    ? `${stage.openaiBatchWave2.status ?? '—'} (${stage.openaiBatchWave2.succeededCount} succeeded, ${stage.openaiBatchWave2.failedCount} failed)`
    : '—'

  return (
    <Box>
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
        <ProcessDetailRow label={'Initiated'} value={formatDateTime(stage.initiatedAt) ?? '—'} />
        <ProcessDetailRow label={'Started'} value={formatDateTime(stage.startedAt) ?? '—'} />
        <ProcessDetailRow label={'Completed'} value={formatDateTime(stage.completedAt) ?? '—'} />
        <ProcessDetailRow label={'Last Transition'} value={formatDateTime(stage.lastTransitionAt) ?? '—'} />
        <ProcessDetailRow label={'Pass'} value={`${stage.currentPass} / ${stage.maxPasses}`} />
        <ProcessDetailRow label={'Mode'} value={modeLabel} />
        <ProcessDetailRow label={'Callback Delivery'} value={stage.callbackDeliveryStatus ?? '—'} />
        <ProcessDetailRow label={'Callback Received'} value={formatDateTime(stage.callbackReceivedAt) ?? '—'} />
        {stage.mode === 'openai_batch' ? <ProcessDetailRow label={'Wave 1'} value={waveOneLabel} /> : null}
        {stage.mode === 'openai_batch' ? <ProcessDetailRow label={'Wave 2'} value={waveTwoLabel} /> : null}
      </Box>

      {stage.collectionName ? (
        <Box sx={{ mt: 2 }}>
          <ProcessDetailRow
            label={'Collection'}
            value={stage.collectionNotes ? `${stage.collectionName} — ${stage.collectionNotes}` : stage.collectionName}
          />
        </Box>
      ) : null}

      {stage.sourceFolderIds.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant={'body2'} sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
            {'Source folders'}
          </Typography>
          <List dense disablePadding>
            {stage.sourceFolderIds.map((folderId) => (
              <ListItem key={folderId} disablePadding sx={{ py: 0.5 }}>
                <Typography variant={'body2'} sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>
                  {folderId}
                </Typography>
              </ListItem>
            ))}
          </List>
        </Box>
      ) : null}
    </Box>
  )
}
