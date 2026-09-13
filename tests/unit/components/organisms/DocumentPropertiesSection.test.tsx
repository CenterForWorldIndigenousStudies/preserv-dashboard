import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { DocumentPropertiesSection } from '@organisms/DocumentPropertiesSection'

const baseDocument = {
  id: 'document-1',
  name: 'Document One',
  id_legacy: 'legacy-1',
  filesize: 123,
  hash_binary: 'binary-hash',
  hash_content: 'content-hash',
  created_at: null,
  updated_at: null,
  is_duplicate: false,
}

describe('DocumentPropertiesSection', () => {
  it('renders document properties and the legacy subsection when legacy data exists', () => {
    const markup = renderToStaticMarkup(
      <DocumentPropertiesSection
        document={baseDocument}
        metadata={[
          {
            name: 'legacy_file_size_origin',
            value: '{"value":456}',
            value_type: 'number',
            notes: null,
          },
          {
            name: 'legacy_format_origin',
            value: '{"value":"PDF"}',
            value_type: 'string',
            notes: null,
          },
          {
            name: 'mime_type',
            value: '{"value":"application/pdf"}',
            value_type: 'string',
            notes: null,
          },
          {
            name: 'file_extension',
            value: '{"value":"pdf"}',
            value_type: 'string',
            notes: null,
          },
        ]}
      />,
    )

    expect(markup).toContain('Document Properties')
    expect(markup).toContain('Document ID')
    expect(markup).toContain('Legacy')
    expect(markup).toContain('Legacy ID')
    expect(markup).toContain('Legacy Origin File Format')
    expect(markup).toContain('MIME Type')
    expect(markup).toContain('application/pdf')
    expect(markup).toContain('File Extension')
    expect(markup).toContain('>pdf<')
  })
})
