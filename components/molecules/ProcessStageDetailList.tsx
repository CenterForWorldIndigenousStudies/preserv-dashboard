import type { ReactElement } from 'react'
import { Box, List, ListItem, Typography } from '@mui/material'

import type { ProcessStageStatus } from 'types/pipelineContracts'

interface ProcessStageDetailListProps {
  stage: ProcessStageStatus
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

export function ProcessStageDetailList({ stage }: ProcessStageDetailListProps): ReactElement {
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
        <DetailRow label="Initiated" value={formatDateTime(stage.initiatedAt)} />
        <DetailRow label="Started" value={formatDateTime(stage.startedAt)} />
        <DetailRow label="Completed" value={formatDateTime(stage.completedAt)} />
        <DetailRow label="Last Transition" value={formatDateTime(stage.lastTransitionAt)} />
        <DetailRow label="Pass" value={`${stage.currentPass} / ${stage.maxPasses}`} />
        <DetailRow label="Callback Delivery" value={stage.callbackDeliveryStatus ?? '—'} />
        <DetailRow label="Callback Received" value={formatDateTime(stage.callbackReceivedAt)} />
      </Box>

      {stage.collectionName ? (
        <Box sx={{ mt: 2 }}>
          <DetailRow
            label="Collection"
            value={stage.collectionNotes ? `${stage.collectionName} — ${stage.collectionNotes}` : stage.collectionName}
          />
        </Box>
      ) : null}

      {stage.sourceFolderIds.length > 0 ? (
        <Box sx={{ mt: 2 }}>
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
    </Box>
  )
}
