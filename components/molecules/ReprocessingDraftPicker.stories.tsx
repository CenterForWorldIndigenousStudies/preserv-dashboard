import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { ReprocessingDraftPicker } from '@molecules/ReprocessingDraftPicker'

const draft = {
  id: 'draft-1',
  name: 'Needs review corrections',
  collectionName: 'CWIS collection',
  collectionNotes: null,
  restartStage: 'metadata_extractor' as const,
  reason: 'Correct metadata after review.',
  documentCount: 3,
  createdAt: '2026-09-03T10:00:00.000Z',
  updatedAt: '2026-09-03T10:00:00.000Z',
  createdBy: 'operator@example.com',
  updatedBy: 'operator@example.com',
}

const meta = {
  title: 'Molecules/ReprocessingDraftPicker',
  component: ReprocessingDraftPicker,
  tags: ['autodocs'],
  args: { drafts: [draft], value: null, onChange: fn() },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof ReprocessingDraftPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const MatchingStage: Story = { args: { restartStage: 'metadata_extractor' } }
