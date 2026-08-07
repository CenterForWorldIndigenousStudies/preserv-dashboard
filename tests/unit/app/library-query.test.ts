import { describe, expect, it } from 'vitest'

import { parseLibraryQueryParams } from '@root/app/library/query'

describe('parseLibraryQueryParams', () => {
  it('normalizes empty Library URL parameters to the shared table defaults', () => {
    expect(parseLibraryQueryParams({})).toEqual({
      page: 1,
      pageSize: 25,
      filters: {},
    })
  })

  it('preserves the full Advanced Search and cursor query contract', () => {
    expect(
      parseLibraryQueryParams({
        page: '2',
        pageSize: '50',
        search: 'document author',
        author: 'Rÿser',
        tag: 'collection tag',
        statuses: 'APPROVED,VALIDATED',
        documentType: 'unique',
        batch: 'batch-2026',
        createdFrom: '2026-01-01',
        createdTo: '2026-01-31',
        collection: 'Collection A',
        accessLevel: 'PUBLIC',
        orderBy: 'name',
        sortDirection: 'desc',
        cursorValue: 'cursor-value',
        cursorId: 'document-id',
        cursorDirection: 'next',
      }),
    ).toEqual({
      page: 2,
      pageSize: 50,
      search: 'document author',
      orderBy: 'name',
      sortDirection: 'desc',
      cursorValue: 'cursor-value',
      cursorId: 'document-id',
      cursorDirection: 'next',
      filters: {
        author: 'Rÿser',
        tag: 'collection tag',
        statuses: ['APPROVED', 'VALIDATED'],
        documentType: 'unique',
        batch: 'batch-2026',
        createdFrom: '2026-01-01',
        createdTo: '2026-01-31',
        collection: 'Collection A',
        accessLevel: 'public',
      },
    })
  })
})
