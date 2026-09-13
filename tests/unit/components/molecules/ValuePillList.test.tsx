// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { ValuePillList } from '@molecules/ValuePillList'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

afterEach(() => {
  act(() => {
    mountedRoot?.unmount()
  })
  mountedRoot = undefined
  document.body.replaceChildren()
})

describe('ValuePillList', () => {
  it('renders multiple values as pills', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ValuePillList values={['Subject one', 'Subject two']} />
      </ThemeProvider>,
    )

    expect(markup).toContain('Subject one')
    expect(markup).toContain('Subject two')
  })

  it('renders the configured empty message when there are no values', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ValuePillList values={[]} emptyMessage={'No subjects available.'} />
      </ThemeProvider>,
    )

    expect(markup).toContain('No subjects available.')
  })

  it('passes the removed value and index to the removal callback', () => {
    const onRemove = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    mountedRoot = createRoot(container)

    act(() => {
      mountedRoot?.render(
        <ThemeProvider>
          <ValuePillList values={['Subject one', 'Subject two']} onRemove={onRemove} />
        </ThemeProvider>,
      )
    })

    act(() => {
      container
        .querySelector('[aria-label="Remove Subject two"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onRemove).toHaveBeenCalledWith('Subject two', 1)
  })

  it('passes the resolved href to each linked value', () => {
    const markup = renderToStaticMarkup(
      <ThemeProvider>
        <ValuePillList
          values={['Ada Example', 'Example Press']}
          getHref={(value) => `/documents?search=${value.replaceAll(' ', '%20')}`}
        />
      </ThemeProvider>,
    )

    expect(markup).toContain('href="/documents?search=Ada%20Example"')
    expect(markup).toContain('href="/documents?search=Example%20Press"')
  })
})
