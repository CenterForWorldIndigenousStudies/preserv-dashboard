import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

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

export const Populated: Story = {
  args: {
    stage: createProcessStage({
      status: 'completed',
      mode: 'direct',
      initiatedAt: '2026-05-29T09:30:00.000Z',
      startedAt: '2026-05-29T09:31:00.000Z',
      completedAt: '2026-05-29T09:45:00.000Z',
      lastTransitionAt: '2026-05-29T09:45:00.000Z',
      currentPass: 2,
      maxPasses: 2,
      collectionName: 'Preservation Review Collection',
      collectionNotes: 'Records requiring archivist review.',
      sourceFolderIds: ['drive-folder-1', 'drive-folder-2'],
    }),
  },
}

export const OpenAIBatch: Story = {
  args: {
    stage: createProcessStage({
      status: 'running',
      mode: 'openai_batch',
      openaiBatchWave1: {
        status: 'completed',
        openaiBatchId: 'provider-batch-wave-1',
        submittedAt: '2026-05-29T10:00:00.000Z',
        checkedAt: '2026-05-29T10:15:00.000Z',
        completedAt: '2026-05-29T10:20:00.000Z',
        processedCount: 48,
        succeededCount: 46,
        failedCount: 2,
        failures: [],
      },
      openaiBatchWave2: {
        status: 'not_started',
        openaiBatchId: null,
        submittedAt: null,
        checkedAt: null,
        completedAt: null,
        processedCount: 0,
        succeededCount: 0,
        failedCount: 0,
        failures: [],
      },
    }),
  },
}
