'use client'

import { type ReactElement } from 'react'
import { Box, Paper, Typography } from '@mui/material'

import { PipelineTimelineGroup, type TimelineStep } from '@molecules/PipelineTimelineGroup'
import {
  getExecutionStepRuntimeStatus,
  getOrchestratedExecutionPlan,
  type PipelineStepRuntimeStatus,
} from '@lib/pipelineExecution'
import type { PipelineExecutionStep } from '@lib/pipelineConfig'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface PipelineTimelineCardProps {
  batch: ProcessBatchStatus
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

export function PipelineTimelineCard({ batch }: PipelineTimelineCardProps): ReactElement {
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
          <Typography component="h3" variant="h6" sx={{ fontWeight: 700 }}>
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
        {timelineSteps.map((step, index) => (
          <PipelineTimelineGroup key={step.label} step={step} isLast={index === timelineSteps.length - 1} />
        ))}
      </Box>
    </Paper>
  )
}
