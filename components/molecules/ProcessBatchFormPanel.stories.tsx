import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'
import { fn } from 'storybook/test'

import { ProcessBatchFormPanel } from '@molecules/ProcessBatchFormPanel'

const meta = {
  title: 'Molecules/ProcessBatchFormPanel',
  component: ProcessBatchFormPanel,
  tags: ['autodocs'],
  args: {
    batchName: 'May 2026 Refugee Mental Health Ingest',
    collectionName: 'Refugee Mental Health Archive',
    collectionNotes: 'Documents selected for the May preservation run.',
    isSubmitting: false,
    isRefreshing: false,
    canSubmit: true,
    submitError: null,
    acceptedBatchName: null,
    batchNameSearchError: null,
    batchNameExists: false,
    onBatchNameChange: fn(),
    onCollectionNameChange: fn(),
    onCollectionNotesChange: fn(),
    onSubmit: fn(),
    onRefresh: fn(),
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 760 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessBatchFormPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Ready: Story = {}

export const Submitting: Story = {
  args: {
    isSubmitting: true,
    canSubmit: false,
  },
}

export const Accepted: Story = {
  args: {
    acceptedBatchName: 'May 2026 Refugee Mental Health Ingest',
  },
}

export const SubmitError: Story = {
  args: {
    submitError: 'Unable to start the pipeline. Please verify the selected folders and try again.',
  },
}

export const ExistingBatchName: Story = {
  args: {
    batchNameExists: true,
    canSubmit: false,
  },
}

export const BatchSearchError: Story = {
  args: {
    batchNameSearchError: 'Unable to search batches right now.',
  },
}
