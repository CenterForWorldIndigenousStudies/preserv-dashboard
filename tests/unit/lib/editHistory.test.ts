import { describe, expect, it, vi } from 'vitest'

vi.mock('@root/auth', () => ({ getDashboardSession: vi.fn() }))
vi.mock('@lib/db', () => ({ db: {} }))

import { createDocumentEditHistoryEntry, type EditHistoryClient } from '@lib/editHistory'

describe('createDocumentEditHistoryEntry', () => {
  it('stores the logical field and values against the document', async () => {
    const create = vi.fn<(args: { data: Record<string, unknown> }) => Promise<void>>()
    const client = { edit_history: { create } } as unknown as EditHistoryClient

    await createDocumentEditHistoryEntry(client, {
      documentId: 'doc-1',
      fieldName: 'dc_title',
      previousValue: 'Before',
      newValue: 'After',
      editorEmail: 'editor@example.test',
      editSummary: 'Changed the document title.',
    })

    expect(create).toHaveBeenCalledWith({
      data: {
        // Vitest asymmetric matchers are typed as any.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        id: expect.any(String),
        entity_id: 'doc-1',
        entity_table: 'documents',
        previous_value: JSON.stringify({ fieldName: 'dc_title', value: 'Before' }),
        new_value: JSON.stringify({ fieldName: 'dc_title', value: 'After' }),
        editor_email: 'editor@example.test',
        edit_summary: 'Changed the document title.',
      },
    })
  })

  it('preserves a null value when a field is cleared', async () => {
    const create = vi.fn<(args: { data: Record<string, unknown> }) => Promise<void>>()
    const client = { edit_history: { create } } as unknown as EditHistoryClient

    await createDocumentEditHistoryEntry(client, {
      documentId: 'doc-1',
      fieldName: 'dc_description',
      previousValue: 'Description',
      newValue: null,
      editorEmail: 'editor@example.test',
      editSummary: 'Cleared the description.',
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: expect.objectContaining({
          new_value: JSON.stringify({ fieldName: 'dc_description', value: null }),
        }),
      }),
    )
  })
})
