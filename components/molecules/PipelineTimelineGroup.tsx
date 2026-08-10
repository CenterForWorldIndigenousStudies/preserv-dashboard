'use client'

import type { ReactElement } from 'react'
import { Box, Collapse, List, ListItem, ListItemIcon, Typography } from '@mui/material'

import { StatusDot } from '@atoms/StatusDot'
import type { PipelineStepRuntimeStatus } from '@lib/pipelineExecution'

export interface TimelineStep {
  label: string
  status: PipelineStepRuntimeStatus
  warningText?: string | null
  subSteps?: Array<{ label: string; status: PipelineStepRuntimeStatus; warningText?: string | null }>
}

const statusLabelMap: Record<PipelineStepRuntimeStatus, string> = {
  completed: 'Done',
  running: 'Running...',
  queued: 'Queued',
  failed: 'Failed',
  review_needed: 'Needs review',
  pending: 'Waiting',
}

function formatStatusLabel(status: PipelineStepRuntimeStatus): string {
  return statusLabelMap[status] || 'Waiting'
}

interface PipelineTimelineGroupProps {
  step: TimelineStep
  isLast: boolean
}

export function PipelineTimelineGroup({ step, isLast }: PipelineTimelineGroupProps): ReactElement {
  return (
    <Box sx={{ position: 'relative' }}>
      {!isLast && (
        <Box
          sx={{
            position: 'absolute',
            left: 4,
            top: 28,
            bottom: 0,
            width: 2,
            bgcolor: 'divider',
            zIndex: 0,
          }}
        />
      )}
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
          <StatusDot status={step.status} />
        </Box>

        <Box sx={{ flex: 1, pb: isLast ? 0 : 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography
              variant={'body2'}
              sx={{
                fontWeight: step.status === 'completed' ? 500 : 600,
                color:
                  step.status === 'completed'
                    ? 'text.secondary'
                    : step.status === 'failed'
                      ? 'error.main'
                      : 'text.primary',
              }}
            >
              {step.label}
            </Typography>
            <Typography variant={'caption'} sx={{ color: 'text.secondary' }}>
              {formatStatusLabel(step.status)}
            </Typography>
          </Box>
          {step.warningText ? (
            <Typography variant={'caption'} sx={{ color: 'warning.main', display: 'block', mt: 0.25 }}>
              {step.warningText}
            </Typography>
          ) : null}

          {step.subSteps && step.subSteps.length > 0 ? (
            <Collapse in={step.status !== 'pending'} timeout={'auto'} unmountOnExit>
              <List dense disablePadding sx={{ pl: 2 }}>
                {step.subSteps.map((subStep) => (
                  <ListItem key={subStep.label} disablePadding sx={{ py: 0.25 }}>
                    <ListItemIcon sx={{ minWidth: 28 }}>
                      <StatusDot status={subStep.status} />
                    </ListItemIcon>
                    <Typography
                      variant={'caption'}
                      sx={{
                        fontWeight: 500,
                        color: subStep.status === 'completed' ? 'text.secondary' : 'text.primary',
                        mr: 1,
                      }}
                    >
                      {subStep.label}
                    </Typography>
                    <Typography variant={'caption'} sx={{ color: 'text.secondary' }}>
                      {formatStatusLabel(subStep.status)}
                    </Typography>
                    {subStep.warningText ? (
                      <Typography variant={'caption'} sx={{ color: 'warning.main', ml: 1 }}>
                        {subStep.warningText}
                      </Typography>
                    ) : null}
                  </ListItem>
                ))}
              </List>
            </Collapse>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}
