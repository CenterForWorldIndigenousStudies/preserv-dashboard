import Link from 'next/link'
import type { ReactElement } from 'react'
import { Box, Paper, Stack, Typography } from '@mui/material'

import { DateAtom } from '@atoms/Date'
import { StatusPill } from '@atoms/Badges/StatusPill'
import { AccordionPanel } from '@molecules/AccordionPanel'
import { DetailFieldGrid } from '@molecules/DetailFieldGrid'
import { getPipelineServiceDisplayName } from '@constants/pipelineServices'
import { formatMetadataValue } from '@lib/metadata'
import type { PipelineDiagnosticEvent, PipelineEventBatchLink } from 'types/commentPipeline'

interface PipelineEventHistoryProps {
  events: PipelineDiagnosticEvent[]
  batchLinks?: Record<string, PipelineEventBatchLink>
  defaultExpanded?: boolean
}

function eventDetailsValue(details: unknown): ReactElement | null {
  if (details === null || details === undefined) return null

  return (
    <Box
      component={'pre'}
      sx={{
        bgcolor: 'background.default',
        borderRadius: 2,
        m: 0,
        mt: 2,
        overflowX: 'auto',
        p: 2,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
      }}
    >
      {formatMetadataValue(details)}
    </Box>
  )
}

export function PipelineEventHistory({
  events,
  batchLinks = {},
  defaultExpanded = false,
}: PipelineEventHistoryProps): ReactElement | null {
  if (events.length === 0) return null

  return (
    <AccordionPanel
      id={'pipeline-event-history'}
      defaultExpanded={defaultExpanded}
      summary={
        <Stack direction={'row'} spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography component={'h3'} variant={'h6'} color={'text.primary'}>
            {'Pipeline Event History'}
          </Typography>
          <Typography variant={'body2'} color={'text.secondary'}>
            {`${events.length} ${events.length === 1 ? 'event' : 'events'}`}
          </Typography>
        </Stack>
      }
    >
      <Stack spacing={2}>
        {events.map((event) => {
          const batchLink = event.batchId ? batchLinks[event.batchId] : undefined
          const batchValue = batchLink ? <Link href={batchLink.href}>{batchLink.name}</Link> : (event.batchId ?? '—')

          return (
            <Paper key={event.runKey} variant={'outlined'} sx={{ p: 2 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}
              >
                <Typography component={'div'} variant={'subtitle1'} color={'text.primary'}>
                  {getPipelineServiceDisplayName(event.service)}
                </Typography>
                <Stack direction={'row'} spacing={1.5} sx={{ alignItems: 'center' }}>
                  <StatusPill status={event.status} />
                  <DateAtom value={event.timestamp} />
                </Stack>
              </Stack>
              <Typography variant={'body2'} color={'text.primary'} sx={{ mt: 1.5 }}>
                {event.message}
              </Typography>
              <DetailFieldGrid
                fields={[
                  { key: `${event.runKey}-batch`, label: 'Batch', value: batchValue },
                  { key: `${event.runKey}-request`, label: 'Request ID', value: event.requestId ?? '—' },
                  { key: `${event.runKey}-severity`, label: 'Severity', value: event.severity ?? '—' },
                  { key: `${event.runKey}-document`, label: 'Document ID', value: event.documentId ?? '—' },
                ]}
              />
              {eventDetailsValue(event.details)}
            </Paper>
          )
        })}
      </Stack>
    </AccordionPanel>
  )
}
