import { describe, expect, it, vi } from 'vitest'

vi.mock('@lib/editHistory', () => ({ createEditHistoryEntry: vi.fn() }))

import { normalizeDocumentAccessLevels } from '@lib/queries/queries'

describe('normalizeDocumentAccessLevels', () => {
  it('removes blank values and sorts all assigned levels alphabetically', () => {
    expect(normalizeDocumentAccessLevels(['restricted', ' ', null, 'internal'])).toEqual(['internal', 'restricted'])
  })
})
