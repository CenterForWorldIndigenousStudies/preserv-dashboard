import { describe, expect, it } from 'vitest'

import { buildOverviewAuthorSearchConditionSql } from '@lib/queries/documentQuerySupport'

describe('document query support', () => {
  it('builds an author-only condition against contributors', () => {
    const query = buildOverviewAuthorSearchConditionSql('  Rudy, Rÿser  ') as unknown as {
      strings: string[]
      values: unknown[]
    }

    expect(query.strings.join(' ')).toContain('FROM document_to_contributors dtc')
    expect(query.strings.join(' ')).toContain('INNER JOIN contributors c ON c.id = dtc.contributor_id')
    expect(query.strings.join(' ')).toContain("dtc.role = 'author'")
    expect(query.values).toEqual(['%rudy%', '%ryser%'])
  })
})
