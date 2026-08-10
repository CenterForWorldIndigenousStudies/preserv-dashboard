import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { BatchProcessingDetails } from '@organisms/BatchProcessingDetails'

describe('BatchProcessingDetails', () => {
  it('owns the client boundary for its interactive processing panels', () => {
    const source = readFileSync(
      new URL('../../../../components/organisms/BatchProcessingDetails.tsx', import.meta.url),
      'utf8',
    )

    expect(source).toMatch(/^'use client'/)
  })

  it('renders scalar properties as labeled rows', () => {
    const markup = renderToStaticMarkup(<BatchProcessingDetails properties={[{ key: 'total_documents', value: 5 }]} />)

    expect(markup).toContain('total_documents')
    expect(markup).toContain('>5<')
  })

  it('renders structured properties through the nested renderer', () => {
    const markup = renderToStaticMarkup(
      <BatchProcessingDetails
        properties={[{ key: 'batch_statistics', value: { speed: 42, unit: 'documents/second' } }]}
      />,
    )

    expect(markup).toContain('batch_statistics')
    expect(markup).toContain('speed')
    expect(markup).toContain('documents/second')
  })

  it('keeps malformed scalar text as text and reports empty details', () => {
    const scalarMarkup = renderToStaticMarkup(
      <BatchProcessingDetails properties={[{ key: 'raw_value', value: '{invalid json' }]} />,
    )
    const emptyMarkup = renderToStaticMarkup(<BatchProcessingDetails properties={[]} />)

    expect(scalarMarkup).toContain('{invalid json')
    expect(emptyMarkup).toContain('No processing details are available.')
  })
})
