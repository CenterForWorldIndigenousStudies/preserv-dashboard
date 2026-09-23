import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import {
  METADATA_EXTRACTOR_SERVICE,
  OCR_PROCESSOR_SERVICE,
} from '@constants/pipeline'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { BATCH_PUBLICATION_STATES } from '@lib/batchLifecycle'
import { BatchOverviewFields } from '@molecules/BatchOverviewFields'

const meta = {
  title: 'Molecules/BatchOverviewFields',
  component: BatchOverviewFields,
  tags: ['autodocs'],
  decorators: [
    (StoryComponent) => (
      <Box sx={{ m: '0 auto', maxWidth: 980 }}>
        <StoryComponent />
      </Box>
    ),
  ],
} satisfies Meta<typeof BatchOverviewFields>

export default meta
type Story = StoryObj<typeof meta>

export const ProcessingBatch: Story = {
  args: {
    createdAt: '2026-09-01T10:00:00.000Z',
    startedAt: '2026-09-05T10:00:00.000Z',
    requestedStages: [OCR_PROCESSOR_SERVICE, METADATA_EXTRACTOR_SERVICE],
    lifecycleStatus: GENERATED_BATCH_LIFECYCLE_STATUSES.RUNNING,
    publicationState: BATCH_PUBLICATION_STATES.NOT_STARTED,
  },
}

export const DraftBatch: Story = {
  args: {
    createdAt: '2026-09-01T10:00:00.000Z',
    startedAt: null,
    requestedStages: [OCR_PROCESSOR_SERVICE],
    lifecycleStatus: GENERATED_BATCH_LIFECYCLE_STATUSES.DRAFT,
    publicationState: BATCH_PUBLICATION_STATES.NOT_STARTED,
  },
}
