'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { Box, Stack, Typography } from '@mui/material'

import { StatusDot } from '@atoms/StatusDot'
import { AccordionPanel } from '@molecules/AccordionPanel'
import { PipelineTimelineGroup, type TimelineStep } from '@molecules/PipelineTimelineGroup'
import { formatDateTime } from '@lib/dateTime'
import { formatReviewWarning } from '@lib/pipelineFormatting'
import {
  getExecutionStepRuntimeStatus,
  getExecutionStepReviewWarningCount,
  getOrchestratedExecutionPlan,
  type PipelineStepRuntimeStatus,
} from '@lib/pipelineExecution'
import type { PipelineExecutionStep } from '@lib/pipelineConfig'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface PipelineTimelineCardProps {
  batch: ProcessBatchStatus
}

type PipelineTimelineStatus = Extract<PipelineStepRuntimeStatus, 'pending' | 'running' | 'completed' | 'failed'>

const timelineStatusLabelMap: Record<PipelineTimelineStatus, string> = {
  pending: 'Waiting',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
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

function getTimelineStatus(steps: TimelineStep[]): PipelineTimelineStatus {
  if (steps.some((step) => step.status === 'failed' || step.status === 'review_needed')) {
    return 'failed'
  }
  if (steps.length > 0 && steps.every((step) => step.status === 'completed')) {
    return 'completed'
  }
  if (steps.some((step) => step.status === 'running' || step.status === 'queued')) {
    return 'running'
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
      warningText: formatReviewWarning(getExecutionStepReviewWarningCount(batch, step)),
    })
  }

  const pass1Steps = normalizeGroups.get('normalize-pass-1')
  if (pass1Steps && pass1Steps.length > 0) {
    const subSteps = pass1Steps.map((step) => ({
      label: step.label,
      status: getExecutionStepRuntimeStatus(batch, step),
      warningText: formatReviewWarning(getExecutionStepReviewWarningCount(batch, step)),
    }))
    const reviewWarningCount = pass1Steps.reduce(
      (total, step) => total + getExecutionStepReviewWarningCount(batch, step),
      0,
    )

    timelineSteps.splice(1, 0, {
      label: 'Normalize Pass 1',
      status: getGroupStatus(subSteps),
      subSteps,
      warningText: formatReviewWarning(reviewWarningCount),
    })
  }

  const pass2Steps = normalizeGroups.get('normalize-pass-2')
  if (pass2Steps && pass2Steps.length > 0) {
    const subSteps = pass2Steps.map((step) => ({
      label: step.label,
      status: getExecutionStepRuntimeStatus(batch, step),
      warningText: formatReviewWarning(getExecutionStepReviewWarningCount(batch, step)),
    }))
    const reviewWarningCount = pass2Steps.reduce(
      (total, step) => total + getExecutionStepReviewWarningCount(batch, step),
      0,
    )

    const insertIndex = timelineSteps.findIndex((step) => step.label === 'OCR Processor')
    if (insertIndex === -1) {
      timelineSteps.push({
        label: 'Normalize Pass 2',
        status: getGroupStatus(subSteps),
        subSteps,
        warningText: formatReviewWarning(reviewWarningCount),
      })
    } else {
      timelineSteps.splice(insertIndex, 0, {
        label: 'Normalize Pass 2',
        status: getGroupStatus(subSteps),
        subSteps,
        warningText: formatReviewWarning(reviewWarningCount),
      })
    }
  }

  return timelineSteps
}

export function PipelineTimelineCard({ batch }: PipelineTimelineCardProps): ReactElement {
  const timelineSteps = buildTimelineSteps(batch)
  const timelineStatus = getTimelineStatus(timelineSteps)
  const createdAt = formatDateTime(batch.createdAt)
  const [expanded, setExpanded] = useState(() => timelineStatus !== 'completed')

  useEffect(() => {
    if (timelineStatus === 'completed') {
      setExpanded(false)
    }
  }, [timelineStatus])

  return (
    <AccordionPanel
      expanded={expanded}
      onChange={(_event, isExpanded) => {
        setExpanded(isExpanded)
      }}
      summary={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            <Box aria-hidden={'true'} sx={{ display: 'flex', flexShrink: 0 }}>
              <StatusDot status={timelineStatus} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant={'h6'} sx={{ fontWeight: 700 }}>
                {'Pipeline Timeline'}
              </Typography>
              {createdAt ? (
                <Typography variant={'caption'} sx={{ color: 'text.secondary' }}>
                  {`Created ${createdAt}`}
                </Typography>
              ) : null}
            </Box>
          </Box>
          <Stack direction={'row'} spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Typography variant={'caption'} sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {timelineStatusLabelMap[timelineStatus]}
            </Typography>
            <Typography
              variant={'caption'}
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: 1,
                bgcolor: 'secondary.main',
                color: 'text.primary',
                fontWeight: 500,
              }}
            >
              {`${timelineSteps.length} steps`}
            </Typography>
          </Stack>
        </Box>
      }
      summarySx={{ px: 3, py: 1.5 }}
      detailsSx={{ px: 3, pt: 0, pb: 3 }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {timelineSteps.map((step, index) => (
          <PipelineTimelineGroup key={step.label} step={step} isLast={index === timelineSteps.length - 1} />
        ))}
      </Box>
    </AccordionPanel>
  )
}
