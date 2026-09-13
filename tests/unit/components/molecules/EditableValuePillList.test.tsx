// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { EditableValuePillList } from '@molecules/EditableValuePillList'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('EditableValuePillList', () => {
  let root: Root | undefined

  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    document.body.replaceChildren()
  })

  it('adds a trimmed value through the inline add control', () => {
    const onChange = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(<EditableValuePillList values={['Existing value']} onChange={onChange} />)
    })

    act(() => {
      container.querySelector('[aria-label="Add value"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const input = container.querySelector('input') as HTMLInputElement
    act(() => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(input, '  New value  ')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      container.querySelector('[aria-label="Add"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onChange).toHaveBeenCalledWith(['Existing value', 'New value'])
  })

  it('removes a value through the shared value pill control', () => {
    const onChange = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    act(() => {
      root?.render(<EditableValuePillList values={['Existing value']} onChange={onChange} />)
    })
    act(() => {
      container
        .querySelector('[aria-label="Remove Existing value"]')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onChange).toHaveBeenCalledWith([])
  })
})
