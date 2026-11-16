// @vitest-environment jsdom

import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecules/SearchEntityBox', () => ({
  SearchEntityBox: (props: {
    inputValue: string
    options: { name: string; isNew?: boolean }[]
    disabled?: boolean
    onInputChange: (value: string) => void
    onSelectOption: (option: { name: string; isNew?: boolean }) => void
    renderOption: (option: { name: string; isNew?: boolean }) => ReactNode
  }) => (
    <div>
      <input
        aria-label={'Collection Name'}
        value={props.inputValue}
        onChange={(event) => props.onInputChange(event.target.value)}
      />
      {props.disabled
        ? null
        : props.options.map((option) => (
            <button key={`${option.name}:${option.isNew ?? false}`} onClick={() => props.onSelectOption(option)}>
              {props.renderOption(option)}
            </button>
          ))}
    </div>
  ),
}))

vi.mock('@organisms/AddCollectionDialog', () => ({
  AddCollectionDialog: (props: {
    initialName: string
    collections: { tag_id: string }[]
    onProposalSaved: (proposal: {
      name: string
      notes: null
      tagNotes: null
      qualifierNames: string[]
      fedoraNodeId: null
    }) => void
    onClose: () => void
  }) => (
    <div data-testid={'add-collection-dialog'} data-initial-name={props.initialName}>
      <span>{`${props.collections.length} existing collections`}</span>
      <button
        onClick={() => {
          props.onProposalSaved({
            name: props.initialName,
            notes: null,
            tagNotes: null,
            qualifierNames: [],
            fedoraNodeId: null,
          })
          props.onClose()
        }}
      >
        {'Save new collection'}
      </button>
    </div>
  ),
}))

import { CollectionNameCombobox } from '@molecules/CollectionNameCombobox'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined

describe('CollectionNameCombobox', () => {
  afterEach(() => {
    act(() => root?.unmount())
    root = undefined
    document.body.replaceChildren()
    vi.unstubAllGlobals()
  })

  it('offers existing collections and opens Add Collection for a new name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            collections: [
              { name: 'Education', tagId: 'education-tag' },
              { name: 'Energy', tagId: 'energy-tag' },
            ],
          }),
      }),
    )
    const onChange = vi.fn()
    const onProposalChange = vi.fn()
    const onValidityChange = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    await act(async () => {
      root?.render(
        <CollectionNameCombobox
          value={'Edu'}
          proposal={null}
          onChange={onChange}
          onProposalChange={onProposalChange}
          onValidityChange={onValidityChange}
        />,
      )
      await Promise.resolve()
    })

    expect(container.textContent).toContain('Education')
    expect(container.textContent).toContain('Create new collection "Edu"')
    expect(onValidityChange).toHaveBeenLastCalledWith(false)
    const existing = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Education',
    )
    act(() => existing?.click())
    expect(onChange).toHaveBeenCalledWith('Education')

    act(() => {
      root?.render(
        <CollectionNameCombobox
          value={'EDUCATION'}
          proposal={null}
          onChange={onChange}
          onProposalChange={onProposalChange}
          onValidityChange={onValidityChange}
        />,
      )
    })

    expect(container.textContent).not.toContain('Create new collection')
    expect(container.textContent).not.toContain('Collection Notes')
    expect(onValidityChange).toHaveBeenLastCalledWith(true)

    act(() => {
      root?.render(
        <CollectionNameCombobox
          value={'New collection'}
          proposal={null}
          onChange={onChange}
          onProposalChange={onProposalChange}
          onValidityChange={onValidityChange}
        />,
      )
    })
    const create = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Create new collection'),
    )
    await act(async () => {
      create?.click()
      await Promise.resolve()
    })
    expect(container.querySelector('[data-testid="add-collection-dialog"]')?.getAttribute('data-initial-name')).toBe(
      'New collection',
    )
    expect(container.textContent).not.toContain('Create new collection "New collection"')
    expect(container.textContent).toContain('2 existing collections')
    expect(onChange).not.toHaveBeenCalledWith('New collection')

    const save = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Save new collection',
    )
    act(() => save?.click())
    expect(onProposalChange).toHaveBeenCalledWith({
      name: 'New collection',
      notes: null,
      tagNotes: null,
      qualifierNames: [],
      fedoraNodeId: null,
    })
    expect(onChange).toHaveBeenCalledWith('New collection')
  })
})
