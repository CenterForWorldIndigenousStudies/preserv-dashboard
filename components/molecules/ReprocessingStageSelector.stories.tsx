import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import {
  getDefaultReprocessingPipelineConfig,
  pipelineConfigToReprocessingRequestedStages,
} from '@lib/reprocessingDrafts'
import { ReprocessingStageSelector } from '@molecules/ReprocessingStageSelector'

const meta = {
  title: 'Molecules/ReprocessingStageSelector',
  component: ReprocessingStageSelector,
  tags: ['autodocs'],
  args: {
    restartStage: 'document_splitter' as const,
    requestedStages: pipelineConfigToReprocessingRequestedStages(getDefaultReprocessingPipelineConfig('document_splitter')),
    pipelineConfig: getDefaultReprocessingPipelineConfig('document_splitter'),
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
    pipelineConfig: getDefaultReprocessingPipelineConfig('metadata_extractor'),
  },
}
export const Disabled: Story = { args: { disabled: true } }
