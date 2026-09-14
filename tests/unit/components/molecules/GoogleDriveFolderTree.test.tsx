// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_TITLE, GoogleDriveFolderTree } from '@molecules/GoogleDriveFolderTree'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let mountedRoot: Root | undefined

function renderTree(): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mountedRoot = createRoot(container)

  act(() => {
    mountedRoot?.render(
      <GoogleDriveFolderTree
        rootFolders={[{ id: 'folder-1', name: 'Source Folder' }]}
        childFoldersByParent={{}}
        expandedFolderIds={{}}
        selectedFolderIds={{}}
        error={null}
        onToggleFolderSelection={() => {}}
        onToggleFolderExpansion={() => {}}
      />,
    )
  })

  return container
}

describe('GoogleDriveFolderTree', () => {
  afterEach(() => {
    act(() => {
      mountedRoot?.unmount()
    })
    mountedRoot = undefined
    document.body.replaceChildren()
  })

  it('renders the Google Drive section as an accordion expanded by default', () => {
    const container = renderTree()

    expect(container.querySelector('[aria-expanded="true"]')).not.toBeNull()
    expect(container.textContent).toContain(DEFAULT_TITLE)
    expect(container.textContent).toContain('Source Folder')
  })
})
