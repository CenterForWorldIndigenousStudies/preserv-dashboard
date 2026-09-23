import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import {
  getDefaultReprocessingPipelineConfig,
  getReprocessingDownstreamStages,
  pipelineConfigToReprocessingRequestedStages,
  REPROCESSING_STAGE_OPTIONS,
} from '@lib/reprocessingDrafts'
import { PipelineStageSelection } from '@molecules/PipelineStageSelection'

const meta = {
  title: 'Molecules/PipelineStageSelection',
  component: PipelineStageSelection,
  tags: ['autodocs'],
  args: {
    startStage: 'document_splitter' as const,
    requestedStages: pipelineConfigToReprocessingRequestedStages(getDefaultReprocessingPipelineConfig('document_splitter')),
    pipelineConfig: getDefaultReprocessingPipelineConfig('document_splitter'),
    stageOptions: REPROCESSING_STAGE_OPTIONS,
    getDownstreamStages: getReprocessingDownstreamStages,
    getDefaultPipelineConfig: getDefaultReprocessingPipelineConfig,
    getRequestedStages: pipelineConfigToReprocessingRequestedStages,
    onStartStageChange: fn(),
    onRequestedStagesChange: fn(),
    onPipelineConfigChange: fn(),
    showNormalizationPasses: true,
  },
} satisfies Meta<typeof PipelineStageSelection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const StartAtMetadataExtraction: Story = {
  args: {
    startStage: 'metadata_extractor',
    requestedStages: ['metadata_extractor'],
    pipelineConfig: getDefaultReprocessingPipelineConfig('metadata_extractor'),
  },
}
export const Disabled: Story = { args: { disabled: true } }
