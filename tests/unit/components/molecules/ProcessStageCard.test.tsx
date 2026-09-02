// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { ProcessStageCard } from '@molecules/ProcessStageCard'
import { createProcessStage } from '@molecules/processStoryFixtures'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

function renderStage(status: string): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(
      <ProcessStageCard label={'Ingest'} stage={createProcessStage({ status })} />,
    )
  })

  return container
}

describe('ProcessStageCard', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
  })

  it.each(['accepted', 'queued', 'running', 'failed', 'review_needed'])('starts %s stages expanded with one summary label and a status badge', (status) => {
    const container = renderStage(status)

    expect(container.querySelector('button[aria-expanded="true"]')).not.toBeNull()
    expect(Array.from(container.querySelectorAll('*')).filter((element) => element.textContent === 'Ingest')).toHaveLength(1)
    expect(container.textContent).toContain(status)
  })

  it('closes an expanded stage when its status becomes completed', () => {
    const container = renderStage('running')

    act(() => {
      mountedRoot?.render(
        <ProcessStageCard label={'Ingest'} stage={createProcessStage({ status: 'completed' })} />,
      )
    })

    expect(container.querySelector('button[aria-expanded="false"]')).not.toBeNull()
  })
})
