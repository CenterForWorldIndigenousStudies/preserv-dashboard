// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ValuePill } from '@atoms/ValuePill'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

afterEach(() => {
  act(() => {
    mountedRoot?.unmount()
  })
  mountedRoot = undefined
  document.body.replaceChildren()
  document.head.replaceChildren()
})

describe('ValuePill', () => {
  it('renders a read-only value without a remove action', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ValuePill value={'Indigenous governance'} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Indigenous governance')
    expect(markup).not.toContain('Remove Indigenous governance')
  })

  it('renders an accessible remove action when provided', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ValuePill value={'Review needed'} onRemove={() => undefined} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Review needed')
    expect(markup).toContain('Remove Review needed')
  })

  it('renders a linked value when an href is provided', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ValuePill value={'Example Press'} href={'/documents?publisher=Example+Press'} />
      </ThemeProvider>,
    )

    expect(markup).toContain('href="/documents?publisher=Example+Press"')
    expect(markup).toContain('Example Press')
  })

  it('adds an interactive hover state to linked values', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(
        <ThemeProvider>
          <ValuePill value={'Example Press'} href={'/documents?publisher=Example+Press'} />
        </ThemeProvider>,
      )
    })

    const linkedPill = container.querySelector('a')
    const stylesheetText = Array.from(document.styleSheets)
      .flatMap((stylesheet) => Array.from(stylesheet.cssRules))
      .map((rule) => rule.cssText)
      .join(' ')

    expect(linkedPill).not.toBeNull()
    expect(stylesheetText).toContain('cursor: pointer')
    expect(stylesheetText).toContain('color: rgb(142, 62, 25)')
    expect(stylesheetText).toContain('background-color: rgba(204, 90, 37, 0.2)')
  })
})
