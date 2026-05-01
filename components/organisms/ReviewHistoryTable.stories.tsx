import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { ReviewItem } from '@lib/types'

import { ReviewHistoryTable } from './ReviewHistoryTable'

const UUIDS = {
  doc1: '00000001-0001-0001-0001-000000000001',
  doc2: '00000002-0002-0002-0002-000000000002',
} as const

const meta = {
  component: ReviewHistoryTable,
  tags: ['autodocs'],
} satisfies Meta<typeof ReviewHistoryTable>

export default meta
type Story = StoryObj<typeof meta>

const sampleReviews: ReviewItem[] = [
  {
    id: 'rev-001',
    document_id: UUIDS.doc1,
    field_name: 'dc_title',
    winning_source: 'source_ingest',
    winning_value: 'Nicaragua: A History',
    conflicting_values: [
      { source: 'source_ingest', value: 'Nicaragua: A History' },
      { source: 'source_marc', value: 'Nicaragua: A History of Violence' },
    ],
    status: 'RESOLVED',
    created_at: '2026-04-10T08:00:00Z',
  },
  {
    id: 'rev-002',
    document_id: UUIDS.doc1,
    field_name: 'dc_subject',
    winning_source: 'source_marc',
    winning_value: 'Indigenous peoples -- Nicaragua',
    conflicting_values: [
      { source: 'source_ingest', value: 'Nicaragua' },
      { source: 'source_marc', value: 'Indigenous peoples -- Nicaragua' },
    ],
    status: 'PENDING',
    created_at: '2026-04-12T11:30:00Z',
  },
  {
    id: 'rev-003',
    document_id: UUIDS.doc2,
    field_name: 'dc_rights',
    winning_source: 'manual_edit',
    winning_value: null,
    conflicting_values: [
      { source: 'manual_edit', value: '' },
      { source: 'source_ingest', value: 'Public Domain' },
    ],
    status: 'RESOLVED',
    created_at: '2026-04-14T16:00:00Z',
  },
]

export const Default: Story = {
  args: {
    reviews: sampleReviews,
  },
}

export const Empty: Story = {
  args: {
    reviews: [],
  },
}

export const SingleItem: Story = {
  args: {
    reviews: [sampleReviews[0]],
  },
}