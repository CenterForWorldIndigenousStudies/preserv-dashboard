import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@atoms/Cost', () => ({
  Cost: ({ value }: { value: unknown }) => <span data-testid={'cost'}>{String(value)}</span>,
}))

vi.mock('@atoms/Date', () => ({
  DateAtom: ({ value }: { value: unknown }) => <span data-testid={'date'}>{String(value)}</span>,
}))

vi.mock('@atoms/SourceFolderId', () => ({
  SourceFolderId: ({ value }: { value: unknown }) => <span data-testid={'source-folder'}>{String(value)}</span>,
}))

vi.mock('@atoms/SourceId', () => ({
  SourceId: ({ value }: { value: unknown }) => <span data-testid={'source-id'}>{String(value)}</span>,
}))

vi.mock('@molecules/NeedsReviewReasons', () => ({
  NeedsReviewReasons: ({ value }: { value: unknown }) => (
    <span data-testid={'needs-review'}>{JSON.stringify(value)}</span>
  ),
}))

vi.mock('@molecules/ValuePillList', () => ({
  ValuePillList: ({ values }: { values: string[] }) => <span data-testid={'value-pills'}>{values.join('|')}</span>,
}))

import { MetadataValue } from '@molecules/MetadataValue'
import type { MetadataField } from 'types/metadata'

function field(name: string, value: unknown, valueType = 'string'): MetadataField {
  return { name, value: JSON.stringify({ value }), value_type: valueType, notes: null }
}

describe('MetadataValue', () => {
  it('renders the parsed display value for ordinary metadata', () => {
    const markup = renderToStaticMarkup(<MetadataValue field={field('dc_title', 'A document')} />)

    expect(markup).toContain('A document')
  })

  it('renders list metadata as value pills', () => {
    const markup = renderToStaticMarkup(<MetadataValue field={field('dc_subject', ['History', 'Archives'], 'json')} />)

    expect(markup).toContain('data-testid="value-pills"')
    expect(markup).toContain('History|Archives')
  })

  it('renders source identifiers with their dedicated components', () => {
    const sourceIdMarkup = renderToStaticMarkup(<MetadataValue field={field('source_id', 'source-1')} />)
    const sourceFolderMarkup = renderToStaticMarkup(<MetadataValue field={field('source_folder_id', 'folder-1')} />)

    expect(sourceIdMarkup).toContain('data-testid="source-id"')
    expect(sourceFolderMarkup).toContain('data-testid="source-folder"')
  })

  it('renders timestamps and costs with their dedicated components', () => {
    const dateMarkup = renderToStaticMarkup(
      <MetadataValue field={field('discrepancy_correction_timestamp', 1720000000, 'unix_timestamp')} />,
    )
    const costMarkup = renderToStaticMarkup(<MetadataValue field={field('cost_saved', 0.25, 'number')} />)

    expect(dateMarkup).toContain('data-testid="date"')
    expect(costMarkup).toContain('data-testid="cost"')
  })

  it('renders needs-review metadata through the reasons component', () => {
    const markup = renderToStaticMarkup(
      <MetadataValue field={field('needs_review', { ocr_processor: ['OCR failed.'] }, 'json')} />,
    )

    expect(markup).toContain('data-testid="needs-review"')
  })
})
