import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import type { StateHistoryEntry } from 'types/documents'

import { StateHistoryTable } from './StateHistoryTable'

const sampleStates: StateHistoryEntry[] = [
  {
    id: 'state-3',
    document_id: 'document-1',
    previous_state: 'normalized',
    new_state: 'ocr_complete',
    changed_at: '2026-04-17T08:00:00Z',
  },
  {
    id: 'state-2',
    document_id: 'document-1',
    previous_state: 'ingested',
    new_state: 'normalized',
    changed_at: '2026-04-16T08:00:00Z',
  },
  {
    id: 'state-1',
    document_id: 'document-1',
    previous_state: null,
    new_state: 'ingested',
    changed_at: '2026-04-15T08:00:00Z',
  },
]

const meta = {
  title: 'Organisms/StateHistoryTable',
  component: StateHistoryTable,
  tags: ['autodocs'],
} satisfies Meta<typeof StateHistoryTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    states: sampleStates,
    documentId: 'document-1',
  },
}

export const Empty: Story = {
  args: {
    states: [],
    documentId: 'document-1',
  },
}

export const NeedsReview: Story = {
  args: {
    documentId: 'document-1',
    needsReviewReasons: [
      {
        serviceKey: 'ocr_processor',
        serviceLabel: 'OCR Processor',
        reasons: ['OCR confidence is too low for metadata extraction.'],
      },
    ],
    states: [
      {
        id: 'state-review',
        document_id: 'document-1',
        previous_state: 'ocr_complete',
        new_state: 'needs_review',
        changed_at: '2026-04-18T08:00:00Z',
      },
    ],
  },
}
