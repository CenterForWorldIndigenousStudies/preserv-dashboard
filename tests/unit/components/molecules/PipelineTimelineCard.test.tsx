// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import type { PipelineConfig } from '@lib/pipelineConfig'
import { PipelineTimelineCard } from '@molecules/PipelineTimelineCard'
import { createProcessBatch, createProcessStage } from '@molecules/processStoryFixtures'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const singleStepPipelineConfig = {
  profileId: 'custom',
  mode: 'custom',
  metadataExtraction: { mode: 'direct' },
  executionPlan: [
    {
      id: 'step-ingester',
      stepId: 'ingester',
      service: 'ingester',
      label: 'Ingest',
      order: 0,
      enabled: true,
    },
  ],
} satisfies PipelineConfig

let mountedRoot: Root | undefined

function buildBatch(status: string) {
  return createProcessBatch({
    pipelineConfig: singleStepPipelineConfig,
    pipelineRequestedStages: ['ingester'],
    ingester: createProcessStage({ status }),
  })
}

function buildReprocessingBatch() {
  return createProcessBatch({
    pipelineExecutionMode: 'reprocess',
    pipelineConfig: null,
    pipelineRequestedStages: ['ocr_processor'],
    ingester: createProcessStage({ status: 'completed' }),
    ocrProcessor: createProcessStage({ status: 'running' }),
  })
}

function renderTimeline(status: string): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(<PipelineTimelineCard batch={buildBatch(status)} />)
  })

  return container
}

describe('PipelineTimelineCard', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
  })

  it('shows the aggregate running status beside the title and starts expanded', () => {
    const container = renderTimeline('running')
    const summary = container.querySelector('button[aria-expanded]')

    expect(summary?.getAttribute('aria-expanded')).toBe('true')
    expect(summary?.querySelector('h3')?.textContent).toBe('Pipeline Timeline')
    expect(summary?.textContent).toContain('Running')
  })

  it('shows a failed aggregate status when a timeline step fails', () => {
    const container = renderTimeline('failed')
    const summary = container.querySelector('button[aria-expanded]')

    expect(summary?.textContent).toContain('Failed')
  })

  it('includes data ingest before the requested stages for reprocessing', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(<PipelineTimelineCard batch={buildReprocessingBatch()} />)
    })

    expect(container.textContent).toContain('Ingest')
    expect(container.textContent).toContain('OCR Processor')
  })

  it('starts completed timelines collapsed', () => {
    const container = renderTimeline('completed')

    expect(container.querySelector('button[aria-expanded="false"]')).not.toBeNull()
  })

  it('collapses when a live update changes the aggregate status to completed', () => {
    const container = renderTimeline('running')

    act(() => {
      mountedRoot?.render(<PipelineTimelineCard batch={buildBatch('completed')} />)
    })

    expect(container.querySelector('button[aria-expanded="false"]')).not.toBeNull()
  })
})
