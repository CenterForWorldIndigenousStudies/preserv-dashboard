import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentHistorySections } from '@organisms/DocumentHistorySections'
import type { AuditEntry, StateHistoryEntry } from 'types/documents'

const audits: AuditEntry[] = [
  {
    document_id: 'document-1',
    field_name: 'dc_title',
    source_name: 'dashboard',
    editor_email: 'reviewer@example.org',
    before_value: 'Old title',
    after_value: 'Community history collection',
    changed_at: '2026-06-03T10:00:00Z',
  },
]

const states: StateHistoryEntry[] = [
  {
    id: 'state-1',
    document_id: 'document-1',
    previous_state: 'ingested',
    new_state: 'needs_review',
    changed_at: '2026-06-03T10:15:00Z',
  },
]

const meta = {
  title: 'Organisms/DocumentHistorySections',
  component: DocumentHistorySections,
  tags: ['autodocs'],
  parameters: { layout: 'padded', a11y: { disable: true } },
  args: {
    audits,
    states,
    documentId: 'document-1',
    needsReviewReasons: [],
  },
} satisfies Meta<typeof DocumentHistorySections>

export default meta
type Story = StoryObj<typeof meta>

export const WithHistory: Story = {}

export const EmptyHistory: Story = {
  args: { audits: [], states: [] },
}
