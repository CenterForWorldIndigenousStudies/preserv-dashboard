import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { MetadataTable } from '@molecules/MetadataTable'
import { DocumentEditContext, type DocumentEditContextValue } from '@lib/hooks/useDocumentEditContext'

describe('MetadataTable', () => {
  it('renders metadata values and notes through the shared table presentation', () => {
    const markup = renderToStaticMarkup(
      <MetadataTable
        fields={[
          {
            name: 'title',
            value: 'Document title',
            value_type: 'string',
            notes: 'The human-readable document title.',
          },
        ]}
      />,
    )

    expect(markup).toContain('Field')
    expect(markup).toContain('Value')
    expect(markup).toContain('title')
    expect(markup).toContain('Document title')
    expect(markup).toContain('aria-label="title: The human-readable document title."')
  })

  it('keeps editable metadata in the table and uses pills for list values', () => {
    const contextValue: DocumentEditContextValue = {
      isEditing: true,
      draft: {
        metadata: {
          dc_subject: ['History', 'Archives'],
        },
        quality: { comment: null, commentAdditional: null },
        tags: [],
        contributors: [],
        publishers: [],
      },
      updateMetadata: vi.fn(),
      updateQuality: vi.fn(),
      updateTags: vi.fn(),
      deleteTag: vi.fn(),
      updateContributors: vi.fn(),
      updatePublishers: vi.fn(),
    }

    const markup = renderToStaticMarkup(
      <DocumentEditContext.Provider value={contextValue}>
        <MetadataTable
          fields={[
            {
              name: 'dc_subject',
              value: JSON.stringify({ value: ['History', 'Archives'] }),
              value_type: 'json',
              notes: null,
            },
          ]}
        />
      </DocumentEditContext.Provider>,
    )

    expect(markup).toContain('<table')
    expect(markup).toContain('History')
    expect(markup).toContain('Archives')
    expect(markup).toContain('Add value')
    expect(markup).not.toContain('Enter one value per line.')
  })

  it('uses quality values for comment metadata rows while editing', () => {
    const contextValue: DocumentEditContextValue = {
      isEditing: true,
      draft: {
        metadata: {},
        quality: { comment: 'Control comment', commentAdditional: 'Additional comment' },
        tags: [],
        contributors: [],
        publishers: [],
      },
      updateMetadata: vi.fn(),
      updateQuality: vi.fn(),
      updateTags: vi.fn(),
      deleteTag: vi.fn(),
      updateContributors: vi.fn(),
      updatePublishers: vi.fn(),
    }

    const markup = renderToStaticMarkup(
      <DocumentEditContext.Provider value={contextValue}>
        <MetadataTable
          fields={[
            { name: 'comment', value: '', value_type: 'string', notes: null },
            { name: 'comment_additional', value: '', value_type: 'string', notes: null },
          ]}
        />
      </DocumentEditContext.Provider>,
    )

    expect(markup).toContain('Control comment')
    expect(markup).toContain('Additional comment')
  })
})
