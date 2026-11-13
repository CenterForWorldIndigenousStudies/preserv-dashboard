// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { PipelineEventHistory } from '@molecules/PipelineEventHistory'

describe('PipelineEventHistory', () => {
  it('renders event status, message, timestamp, and linked batch context', () => {
    const markup = renderToStaticMarkup(
      <PipelineEventHistory
        events={[
          {
            runKey: 'ocr-run',
            service: 'ocr_processor',
            status: 'failed',
            timestamp: '2026-09-11T10:00:00+00:00',
            message: 'OCR timed out.',
            requestId: 'request-1',
            batchId: 'batch-1',
            documentId: 'document-1',
            details: { timeoutSeconds: 30 },
            severity: 'error',
          },
        ]}
        batchLinks={{ 'batch-1': { name: 'September ingest', href: '/batches/batch-1' } }}
        defaultExpanded
      />,
    )

    expect(markup).toContain('Pipeline Event History')
    expect(markup).toContain('OCR Processor')
    expect(markup).toContain('Failed')
    expect(markup).toContain('OCR timed out.')
    expect(markup).toContain('September ingest')
    expect(markup).toContain('href="/batches/batch-1"')
    expect(markup).toContain('request-1')
    expect(markup).toContain('timeoutSeconds')
  })

  it('renders nothing when there are no diagnostic events', () => {
    expect(renderToStaticMarkup(<PipelineEventHistory events={[]} />)).toBe('')
  })

  it('updates expansion when review reasons change without an uncontrolled Accordion warning', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const events = [
      {
        runKey: 'ocr-run',
        service: 'ocr_processor',
        status: 'failed',
        timestamp: '2026-09-11T10:00:00+00:00',
        message: 'OCR timed out.',
        requestId: 'request-1',
        batchId: 'batch-1',
        documentId: 'document-1',
        details: null,
        severity: 'error',
      },
    ]

    try {
      act(() => {
        root.render(<PipelineEventHistory events={events} defaultExpanded={false} />)
      })
      expect(container.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false')

      act(() => {
        root.render(<PipelineEventHistory events={events} defaultExpanded />)
      })
      expect(container.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('true')
      expect(
        errors.mock.calls.some(([message]) => String(message).includes('changing the default expanded state')),
      ).toBe(false)

      act(() => {
        ;(container.querySelector('[aria-expanded]') as HTMLElement).click()
      })
      expect(container.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')).toBe('false')
    } finally {
      act(() => root.unmount())
      container.remove()
      errors.mockRestore()
    }
  })
})
