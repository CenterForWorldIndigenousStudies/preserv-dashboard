import { describe, expect, it } from 'vitest'

import {
  buildOverviewContributorSearchConditionSql,
  buildOverviewPublisherSearchConditionSql,
} from '@lib/queries/documentQuerySupport'

describe('document query support', () => {
  it('builds a contributor condition against all contributor roles', () => {
    const query = buildOverviewContributorSearchConditionSql('  Rudy, Rÿser  ') as unknown as {
      strings: string[]
      values: unknown[]
    }

    expect(query.strings.join(' ')).toContain('FROM document_to_contributors dtc')
    expect(query.strings.join(' ')).toContain('INNER JOIN contributors c ON c.id = dtc.contributor_id')
    expect(query.strings.join(' ')).not.toContain("dtc.role = 'author'")
    expect(query.values).toEqual(['%rudy%', '%ryser%'])
  })

  it('builds a publisher condition against publishers', () => {
    const query = buildOverviewPublisherSearchConditionSql('  Example Press  ') as unknown as {
      strings: string[]
      values: unknown[]
    }

    expect(query.strings.join(' ')).toContain('FROM document_to_publishers dtp')
    expect(query.strings.join(' ')).toContain('INNER JOIN publishers p ON p.id = dtp.publisher_id')
    expect(query.strings.join(' ')).toContain('LOWER(p.name COLLATE utf8mb4_unicode_ci)')
    expect(query.values).toEqual(['%example%', '%press%'])
  })
})
