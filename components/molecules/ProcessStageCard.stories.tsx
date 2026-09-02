import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProcessStageCard } from '@molecules/ProcessStageCard'
import { createProcessStage } from './processStoryFixtures'

const meta = {
  title: 'Molecules/ProcessStageCard',
  component: ProcessStageCard,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 820 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessStageCard>

export default meta
type Story = StoryObj<typeof meta>

export const Running: Story = {
  args: {
    label: 'Page Rotator',
    stage: createProcessStage({
      status: 'running',
      processedCount: 40,
      rotatedCount: 26,
      passedThroughCount: 14,
    }),
  },
}

export const Pending: Story = {
  args: {
    label: 'OCR Processor',
    stage: createProcessStage({ status: 'pending' }),
  },
}

export const Completed: Story = {
  args: {
    label: 'Document Splitter',
    stage: createProcessStage({
      status: 'completed',
      processedCount: 40,
      splitCount: 12,
      childCount: 52,
    }),
  },
}

export const Failed: Story = {
  args: {
    label: 'OCR Processor',
    stage: createProcessStage({
      status: 'failed',
      error: 'The OCR worker exited before processing the final document.',
      failedCount: 1,
    }),
  },
}
