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
import { PIPELINE_STAGE_STATUSES } from '@constants/pipelineStageStatuses'
import type { PipelineExecutionStep } from '@lib/pipelineConfig'
import type { ProcessBatchStatus } from 'types/pipelineContracts'

interface PipelineTimelineCardProps {
  batch: ProcessBatchStatus
  steps?: TimelineStep[]
  title?: string
}

type PipelineTimelineStatus = Extract<
  PipelineStepRuntimeStatus,
  | typeof PIPELINE_STAGE_STATUSES.PENDING
  | typeof PIPELINE_STAGE_STATUSES.RUNNING
  | typeof PIPELINE_STAGE_STATUSES.COMPLETED
  | typeof PIPELINE_STAGE_STATUSES.FAILED
>

const timelineStatusLabelMap: Record<PipelineTimelineStatus, string> = {
  [PIPELINE_STAGE_STATUSES.PENDING]: 'Waiting',
  [PIPELINE_STAGE_STATUSES.RUNNING]: 'Running',
  [PIPELINE_STAGE_STATUSES.COMPLETED]: 'Completed',
  [PIPELINE_STAGE_STATUSES.FAILED]: 'Failed',
}

function getGroupStatus(
  subSteps: Array<{ label: string; status: PipelineStepRuntimeStatus }>,
): PipelineStepRuntimeStatus {
  if (subSteps.some((step) => step.status === PIPELINE_STAGE_STATUSES.FAILED)) {
    return PIPELINE_STAGE_STATUSES.FAILED
  }
  if (subSteps.some((step) => step.status === PIPELINE_STAGE_STATUSES.REVIEW_NEEDED)) {
    return PIPELINE_STAGE_STATUSES.REVIEW_NEEDED
  }
  if (subSteps.every((step) => step.status === PIPELINE_STAGE_STATUSES.COMPLETED)) {
    return PIPELINE_STAGE_STATUSES.COMPLETED
  }
  if (subSteps.some((step) => step.status === PIPELINE_STAGE_STATUSES.RUNNING)) {
    return PIPELINE_STAGE_STATUSES.RUNNING
  }
  if (subSteps.some((step) => step.status === PIPELINE_STAGE_STATUSES.QUEUED)) {
    return PIPELINE_STAGE_STATUSES.QUEUED
  }
  return PIPELINE_STAGE_STATUSES.PENDING
}

function getTimelineStatus(steps: TimelineStep[]): PipelineTimelineStatus {
  if (
    steps.some(
      (step) =>
        step.status === PIPELINE_STAGE_STATUSES.FAILED ||
        step.status === PIPELINE_STAGE_STATUSES.REVIEW_NEEDED,
    )
  ) {
    return PIPELINE_STAGE_STATUSES.FAILED
  }
  if (steps.length > 0 && steps.every((step) => step.status === PIPELINE_STAGE_STATUSES.COMPLETED)) {
    return PIPELINE_STAGE_STATUSES.COMPLETED
  }
  if (
    steps.some(
      (step) =>
        step.status === PIPELINE_STAGE_STATUSES.RUNNING ||
        step.status === PIPELINE_STAGE_STATUSES.QUEUED,
    )
  ) {
    return PIPELINE_STAGE_STATUSES.RUNNING
  }
  return PIPELINE_STAGE_STATUSES.PENDING
}

function buildTimelineSteps(batch: ProcessBatchStatus): TimelineStep[] {
  const executionPlan = getOrchestratedExecutionPlan(batch)
  const normalizeGroups = new Map<1 | 2, PipelineExecutionStep[]>()
  const timelineSteps: TimelineStep[] = []

  for (const step of executionPlan) {
    if (step.pass === 1 || step.pass === 2) {
      const current = normalizeGroups.get(step.pass) ?? []
      current.push(step)
      normalizeGroups.set(step.pass, current)
      continue
    }

    timelineSteps.push({
      label: step.label,
      status: getExecutionStepRuntimeStatus(batch, step),
      warningText: formatReviewWarning(getExecutionStepReviewWarningCount(batch, step)),
    })
  }

  const pass1Steps = normalizeGroups.get(1)
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

  const pass2Steps = normalizeGroups.get(2)
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

export function PipelineTimelineCard({ batch, steps, title = 'Pipeline Timeline' }: PipelineTimelineCardProps): ReactElement {
  const timelineSteps = steps ?? buildTimelineSteps(batch)
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
              <Typography component={'h3'} variant={'h6'} sx={{ fontWeight: 700 }}>
                {title}
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
