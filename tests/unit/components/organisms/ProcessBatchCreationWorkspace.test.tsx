import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ProcessBatchCreationWorkspace } from '@organisms/ProcessBatchCreationWorkspace'
import { createDefaultDraft } from '@lib/pipelineConfig'

vi.mock('@molecules/AccordionPanel', () => ({
  AccordionPanel: ({
    children,
    expanded,
    summary,
  }: {
    children: ReactNode
    expanded?: boolean
    summary: ReactNode
  }) => (
    <section data-expanded={String(expanded)}>
      {summary}
      {children}
    </section>
  ),
}))

vi.mock('@molecules/GoogleDriveFolderTree', () => ({ GoogleDriveFolderTree: () => <div>{'Google Drive'}</div> }))
vi.mock('@molecules/ProcessBatchFormPanel', () => ({ ProcessBatchFormPanel: () => <div>{'Create form'}</div> }))
vi.mock('@molecules/PipelineProfileSelector', () => ({
  PipelineProfileSelector: () => <div>{'Pipeline profile'}</div>,
}))
vi.mock('@molecules/ProcessSelectedFoldersPanel', () => ({
  ProcessSelectedFoldersPanel: () => <div>{'Selected sources'}</div>,
}))
vi.mock('@organisms/PipelineStepsModal', () => ({ PipelineStepsModal: () => null }))

const baseProps = {
  batchName: '',
  collectionName: '',
  collectionNotes: '',
  isSubmitting: false,
  isRefreshing: false,
  canSubmit: false,
  submitError: null,
  acceptedBatchName: null,
  batchNameSearchError: null,
  batchNameExists: false,
  pipelineDraft: createDefaultDraft(),
  isPipelineStepsModalOpen: false,
  rootFolders: [],
  childFoldersByParent: {},
  expandedFolderIds: {},
  selectedFolders: {},
  foldersError: null,
  googleDriveExpanded: true,
  isManagingDraft: false,
  onBatchNameChange: () => {},
  onCollectionNameChange: () => {},
  onCollectionNotesChange: () => {},
  onSubmit: () => {},
  onRefresh: () => {},
  onProfileChange: () => {},
  onConvertToCustom: () => {},
  onProfileDraftChange: () => {},
  onOpenStepsModal: () => {},
  onCloseStepsModal: () => {},
  onGoogleDriveExpandedChange: () => {},
  onToggleFolderSelection: () => {},
  onToggleFolderExpansion: () => {},
}

describe('ProcessBatchCreationWorkspace', () => {
  it('expands the Create a new batch accordion for a new batch', () => {
    const markup = renderToStaticMarkup(<ProcessBatchCreationWorkspace {...baseProps} />)

    expect(markup).toContain('Create a new batch')
    expect(markup).toContain('data-expanded="true"')
  })

  it('collapses the Create a new batch accordion while managing a draft', () => {
    const markup = renderToStaticMarkup(<ProcessBatchCreationWorkspace {...baseProps} isManagingDraft />)

    expect(markup).toContain('Create a new batch')
    expect(markup).toContain('data-expanded="false"')
  })
})
