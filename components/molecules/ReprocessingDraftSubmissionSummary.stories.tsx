import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { ReprocessingDraftSubmissionSummary } from '@molecules/ReprocessingDraftSubmissionSummary'

const meta = {
  title: 'Molecules/ReprocessingDraftSubmissionSummary',
  component: ReprocessingDraftSubmissionSummary,
  tags: ['autodocs'],
  args: {
    documentCount: 4,
    restartStage: 'metadata_extractor',
    collectionName: 'Review collection',
    collectionNotes: 'Documents selected for metadata correction.',
    reason: 'Correct extracted metadata before publication.',
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 760 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ReprocessingDraftSubmissionSummary>

export default meta
type Story = StoryObj<typeof meta>

export const MetadataExtractor: Story = {}

export const RightsDeterminatorWithoutCollection: Story = {
  args: {
    documentCount: 1,
    restartStage: 'rights_determinator',
    collectionName: null,
    collectionNotes: null,
    reason: 'Retry rights determination after review.',
  },
}
