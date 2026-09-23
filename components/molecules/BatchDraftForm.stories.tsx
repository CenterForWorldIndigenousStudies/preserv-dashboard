import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import {
  BATCH_DRAFT_STAGE_OPTIONS,
  batchDraftPipelineConfigToRequestedStages,
  getBatchDraftDownstreamStages,
  getBatchDraftInitialConfig,
  getDefaultBatchDraftPipelineConfig,
} from '@lib/batchDraftPipeline'
import { BatchDraftForm } from '@molecules/BatchDraftForm'

const config = getBatchDraftInitialConfig()

const meta = {
  title: 'Molecules/BatchDraftForm',
  component: BatchDraftForm,
  tags: ['autodocs'],
  args: {
    name: 'Initial preservation batch',
    collectionName: 'Collection',
    collectionNotes: '',
        startStage: 'data_ingester' as const,
    requestedStages: batchDraftPipelineConfigToRequestedStages(config),
    pipelineConfig: config,
    stageOptions: BATCH_DRAFT_STAGE_OPTIONS,
    getDownstreamStages: getBatchDraftDownstreamStages,
    getDefaultPipelineConfig: getDefaultBatchDraftPipelineConfig,
    getRequestedStages: batchDraftPipelineConfigToRequestedStages,
    reason: 'Initial preservation batch',
    isSubmitting: false,
    canSubmit: true,
    error: null,
    onNameChange: fn(),
    onCollectionNameChange: fn(),
    onCollectionNotesChange: fn(),
    onStartStageChange: fn(),
    onRequestedStagesChange: fn(),
    onPipelineConfigChange: fn(),
    onReasonChange: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof BatchDraftForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const ExistingName: Story = { args: { nameExists: true } }
export const Disabled: Story = { args: { disabled: true, canSubmit: false } }
