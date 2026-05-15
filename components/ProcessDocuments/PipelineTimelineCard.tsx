'use client'

import { type ReactElement } from 'react'
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  Paper,
  Typography,
} from '@mui/material'

import type { ProcessBatchStatus } from '@lib/processBatches'
import {
  getExecutionStepRuntimeStatus,
  getOrchestratedExecutionPlan,
  type PipelineStepRuntimeStatus,
} from '@lib/pipelineExecution'
import type { PipelineExecutionStep } from '@lib/pipelineConfig'

interface PipelineTimelineCardProps {
  batch: ProcessBatchStatus
}

const STATUS_COLORS: Record<PipelineStepRuntimeStatus, string> = {
  pending: '#e0e0e0',
  queued: '#94d9f8',
  running: '#ff7637',
  completed: '#355834',
  failed: '#e96954',
  review_needed: '#8d5f58',
}

function StatusDot({ status }: { status: PipelineStepRuntimeStatus }): ReactElement {
  return (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: STATUS_COLORS[status],
        flexShrink: 0,
      }}
    />
  )
}

interface TimelineStep {
  label: string
  status: PipelineStepRuntimeStatus
  subSteps?: Array<{ label: string; status: PipelineStepRuntimeStatus }>
}

function formatStatusLabel(status: PipelineStepRuntimeStatus): string {
  if (status === 'completed') return 'Done'
  if (status === 'running') return 'Running...'
  if (status === 'queued') return 'Queued'
  if (status === 'failed') return 'Failed'
  if (status === 'review_needed') return 'Needs review'
  return 'Waiting'
}

function getGroupStatus(
  subSteps: Array<{ label: string; status: PipelineStepRuntimeStatus }>,
): PipelineStepRuntimeStatus {
  if (subSteps.some((step) => step.status === 'failed')) {
    return 'failed'
  }
  if (subSteps.some((step) => step.status === 'review_needed')) {
    return 'review_needed'
  }
  if (subSteps.every((step) => step.status === 'completed')) {
    return 'completed'
  }
  if (subSteps.some((step) => step.status === 'running')) {
    return 'running'
  }
  if (subSteps.some((step) => step.status === 'queued')) {
    return 'queued'
  }
  return 'pending'
}

function buildTimelineSteps(batch: ProcessBatchStatus): TimelineStep[] {
  const executionPlan = getOrchestratedExecutionPlan(batch)
  const normalizeGroups = new Map<string, PipelineExecutionStep[]>()
  const timelineSteps: TimelineStep[] = []

  for (const step of executionPlan) {
    if (step.stepId === 'normalize-pass-1' || step.stepId === 'normalize-pass-2') {
      const current = normalizeGroups.get(step.stepId) ?? []
      current.push(step)
      normalizeGroups.set(step.stepId, current)
      continue
    }

    timelineSteps.push({
      label: step.label,
      status: getExecutionStepRuntimeStatus(batch, step),
    })
  }

  const pass1Steps = normalizeGroups.get('normalize-pass-1')
  if (pass1Steps && pass1Steps.length > 0) {
    const subSteps = pass1Steps.map((step) => ({
      label: step.label,
      status: getExecutionStepRuntimeStatus(batch, step),
    }))

    timelineSteps.splice(1, 0, {
      label: 'Normalize Pass 1',
      status: getGroupStatus(subSteps),
      subSteps,
    })
  }

  const pass2Steps = normalizeGroups.get('normalize-pass-2')
  if (pass2Steps && pass2Steps.length > 0) {
    const subSteps = pass2Steps.map((step) => ({
      label: step.label,
      status: getExecutionStepRuntimeStatus(batch, step),
    }))

    const insertIndex = timelineSteps.findIndex((step) => step.label === 'OCR Processor')
    if (insertIndex === -1) {
      timelineSteps.push({
        label: 'Normalize Pass 2',
        status: getGroupStatus(subSteps),
        subSteps,
      })
    } else {
      timelineSteps.splice(insertIndex, 0, {
        label: 'Normalize Pass 2',
        status: getGroupStatus(subSteps),
        subSteps,
      })
    }
  }

  return timelineSteps
}

export function PipelineTimelineCard({
  batch,
}: PipelineTimelineCardProps): ReactElement {
  const timelineSteps = buildTimelineSteps(batch)

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 4,
        p: 3,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Pipeline Timeline
          </Typography>
          {batch.createdAt && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Created {new Date(batch.createdAt).toLocaleString()}
            </Typography>
          )}
        </Box>
        <Typography
          variant="caption"
          sx={{
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: 'secondary.main',
            color: 'ink.main',
            fontWeight: 500,
          }}
        >
          {timelineSteps.length} steps
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {timelineSteps.map((step, index) => {
          const isLast = index === timelineSteps.length - 1
          return (
            <Box key={step.label} sx={{ position: 'relative' }}>
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
                      variant="body2"
                      sx={{
                        fontWeight: step.status === 'completed' ? 500 : 600,
                        color:
                          step.status === 'completed'
                            ? 'text.secondary'
                            : step.status === 'failed'
                              ? 'error.main'
                              : 'ink.main',
                      }}
                    >
                      {step.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {formatStatusLabel(step.status)}
                    </Typography>
                  </Box>

                  {step.subSteps && step.subSteps.length > 0 && (
                    <Collapse in={step.status !== 'pending'} timeout="auto" unmountOnExit>
                      <List dense disablePadding sx={{ pl: 2 }}>
                        {step.subSteps.map((subStep) => (
                          <ListItem key={subStep.label} disablePadding sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <StatusDot status={subStep.status} />
                            </ListItemIcon>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 500,
                                color: subStep.status === 'completed' ? 'text.secondary' : 'ink.main',
                                mr: 1,
                              }}
                            >
                              {subStep.label}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {formatStatusLabel(subStep.status)}
                            </Typography>
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  )}
                </Box>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}
