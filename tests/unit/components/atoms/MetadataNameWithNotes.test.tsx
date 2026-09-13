// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { MetadataNameWithNotes } from '@atoms/MetadataNameWithNotes'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

afterEach(() => {
  act(() => {
    mountedRoot?.unmount()
  })
  mountedRoot = undefined
  document.body.replaceChildren()
})

describe('MetadataNameWithNotes', () => {
  it('shows metadata notes in an accessible tooltip', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MetadataNameWithNotes name={'title'} notes={'The document title from the source record.'} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Title')
    expect(markup).not.toContain('>title</span>')
    expect(markup).toContain('title: The document title from the source record.')
  })

  it('renders metadata without a tooltip when notes are unavailable', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <MetadataNameWithNotes name={'title'} notes={null} />
      </ThemeProvider>,
    )

    expect(markup).toContain('>Title</span>')
    expect(markup).not.toContain('aria-label')
  })

  it('toggles between the human-readable and original metadata names when clicked', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(<MetadataNameWithNotes name={'content_hash_algorithm'} notes={null} />)
    })

    const label = container.querySelector('[role="button"]')
    expect(label?.textContent).toBe('Content Hash Algorithm')

    act(() => {
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(label?.textContent).toBe('content_hash_algorithm')

    act(() => {
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(label?.textContent).toBe('Content Hash Algorithm')
  })

  it('uses a supplied display name while preserving the original name on click', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(
        <MetadataNameWithNotes name={'comment_additional'} displayName={'Additional Comment'} notes={null} />,
      )
    })

    const label = container.querySelector('[role="button"]')
    expect(label?.textContent).toBe('Additional Comment')

    act(() => {
      label?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(label?.textContent).toBe('comment_additional')
  })
})
