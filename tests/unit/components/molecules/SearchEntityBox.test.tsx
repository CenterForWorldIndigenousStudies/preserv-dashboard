// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ThemeProvider from '@components/ThemeProvider'
import { SearchEntityBox } from '@molecules/SearchEntityBox'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface TestOption {
  id: string
  name: string
}

let mountedRoot: Root | undefined

function renderSearchBox(props: Partial<React.ComponentProps<typeof SearchEntityBox<TestOption>>> = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(
      <ThemeProvider>
        <SearchEntityBox<TestOption>
          inputValue={''}
          options={[]}
          label={'Search batches'}
          onInputChange={vi.fn()}
          getOptionLabel={(option) => option.name}
          getOptionKey={(option) => option.id}
          {...props}
        />
      </ThemeProvider>,
    )
  })

  return container
}

describe('SearchEntityBox', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
  })

  it('renders the configured label and placeholder', () => {
    const container = renderSearchBox({ placeholder: 'Type a batch name' })

    expect(container.querySelector('label')?.textContent).toContain('Search batches')
    expect(container.querySelector('input')?.getAttribute('placeholder')).toBe('Type a batch name')
  })

  it('reports free-text input changes', () => {
    const onInputChange = vi.fn()
    const container = renderSearchBox({ freeSolo: true, onInputChange })
    const input = container.querySelector<HTMLInputElement>('input')

    if (!input) {
      throw new Error('Expected SearchEntityBox input')
    }

    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, 'Special batch')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(onInputChange).toHaveBeenLastCalledWith('Special batch')
  })

  it('renders a loading state and helper text', () => {
    const container = renderSearchBox({ loading: true, open: true, helperText: 'Choose a batch' })

    expect(container.textContent).toContain('Choose a batch')
    expect(document.body.querySelector('.MuiAutocomplete-loading')).not.toBeNull()
  })
})
