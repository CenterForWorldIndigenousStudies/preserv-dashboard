import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { ReprocessingStageSelector } from '@molecules/ReprocessingStageSelector'

const meta = {
  title: 'Molecules/ReprocessingStageSelector',
  component: ReprocessingStageSelector,
  tags: ['autodocs'],
  args: {
    restartStage: 'ocr_processor' as const,
    requestedStages: ['ocr_processor', 'content_dedup'] as const,
    onRestartStageChange: fn(),
    onRequestedStagesChange: fn(),
  },
} satisfies Meta<typeof ReprocessingStageSelector>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const StartAtMetadataExtraction: Story = {
  args: {
    restartStage: 'metadata_extractor',
    requestedStages: ['metadata_extractor'],
  },
}
export const Disabled: Story = { args: { disabled: true } }
