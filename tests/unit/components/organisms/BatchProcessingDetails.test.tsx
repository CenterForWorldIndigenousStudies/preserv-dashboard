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

  it('can omit its heading when the surrounding section supplies one', () => {
    const markup = renderToStaticMarkup(
      <BatchProcessingDetails properties={[{ key: 'total_documents', value: 5 }]} showHeading={false} />,
    )

    expect(markup).not.toContain('Processing Details')
    expect(markup).toContain('total_documents')
  })

  it('formats the total processing cost as a cost value', () => {
    const markup = renderToStaticMarkup(
      <BatchProcessingDetails properties={[{ key: 'Total Cost', value: 0.127778 }]} />,
    )

    expect(markup).toContain('$0.127778')
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

  it('formats contract-defined costs consistently with other dashboard costs', () => {
    const markup = renderToStaticMarkup(
      <BatchProcessingDetails
        properties={[{ key: 'legacyImport', value: { costUsd: 2.5, costSavedUsd: 0.5 } }]}
      />,
    )

    expect(markup).toContain('$2.50')
    expect(markup).toContain('$0.50')
  })

  it('renders legacy notebook statuses as status pills without changing the import status', () => {
    const markup = renderToStaticMarkup(
      <BatchProcessingDetails
        properties={[
          {
            key: 'legacyImport',
            value: {
              status: 'historical',
              notebook1Registry: { status: 'COMPLETED' },
            },
          },
        ]}
      />,
    )

    expect(markup).toContain('historical')
    expect(markup).toContain('Completed')
    expect(markup.match(/<span class="MuiChip-label/g)).toHaveLength(1)
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
