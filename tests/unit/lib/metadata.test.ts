import { describe, expect, it } from 'vitest'

import { parseMetadataList } from '@lib/metadata'

describe('parseMetadataList', () => {
  it('unwraps a JSON metadata envelope containing an array', () => {
    expect(parseMetadataList('{"value":["Subject one","Subject two"]}', 'json')).toEqual(['Subject one', 'Subject two'])
  })

  it('parses a raw JSON array', () => {
    expect(parseMetadataList('["Keyword one","Keyword two"]', 'json')).toEqual(['Keyword one', 'Keyword two'])
  })

  it('returns an empty list for malformed or scalar values', () => {
    expect(parseMetadataList('not-json', 'json')).toEqual([])
    expect(parseMetadataList('{"value":"not a list"}', 'json')).toEqual([])
  })
})
