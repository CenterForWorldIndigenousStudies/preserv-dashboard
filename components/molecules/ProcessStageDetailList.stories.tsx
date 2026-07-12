import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { ProcessStageDetailList } from '@molecules/ProcessStageDetailList'
import { createProcessStage } from './processStoryFixtures'

const meta = {
  title: 'Molecules/ProcessStageDetailList',
  component: ProcessStageDetailList,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 820 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessStageDetailList>

export default meta
type Story = StoryObj<typeof meta>

export const CompletedStage: Story = {
  args: {
    stage: createProcessStage({
      status: 'completed',
      initiatedAt: '2026-05-29T09:30:00.000Z',
      startedAt: '2026-05-29T09:31:00.000Z',
      completedAt: '2026-05-29T09:45:00.000Z',
      lastTransitionAt: '2026-05-29T09:45:00.000Z',
      currentPass: 1,
      maxPasses: 2,
      completedPasses: [1],
      callbackDeliveryStatus: 'delivered',
      callbackReceivedAt: '2026-05-29T09:45:02.000Z',
      collectionName: 'Refugee Mental Health Archive',
      collectionNotes: 'May preservation run.',
      sourceFolderIds: ['drive-folder-1', 'drive-folder-2'],
    }),
  },
}

export const MinimalPendingStage: Story = {
  args: {
    stage: createProcessStage(),
  },
}
