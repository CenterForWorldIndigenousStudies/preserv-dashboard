import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecules/MetadataTable', () => ({
  MetadataTable: ({ fields }: { fields: Array<{ name: string }> }) => (
    <div data-testid={'metadata-table'}>{fields.map((field) => field.name).join('|')}</div>
  ),
}))

vi.mock('@molecules/DocumentMetadataRelationships', () => ({
  DocumentMetadataRelationships: () => <div>{'Contributors and Publishers'}</div>,
}))

import { DocumentMetadataSection } from '@organisms/DocumentMetadataSection'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

const field = (name: string): MetadataField => ({
  name,
  value: JSON.stringify({ value: 'value' }),
  value_type: 'string',
  notes: null,
})

describe('DocumentMetadataSection', () => {
  it('renders primary metadata, relationships, stage metadata, and recorded source metadata', () => {
    const markup = renderToStaticMarkup(
      <DocumentMetadataSection
        metadata={[field('dc_title'), field('ocr_generated'), field('source_id')]}
        accessLevels={['restricted']}
        contributors={[] as DocumentDetail['document_to_contributors']}
        publishers={[] as DocumentDetail['document_to_publishers']}
      />,
    )

    expect(markup).toContain('Metadata')
    expect(markup).toContain('dc_title')
    expect(markup).toContain('Contributors and Publishers')
    expect(markup).toContain('OCR Processor')
    expect(markup).toContain('Recorded source metadata')
    expect(markup).toContain('source_id')
    expect(markup).toContain('access_level')
    expect(markup.indexOf('access_level')).toBeLessThan(markup.indexOf('dc_title'))
  })
})
