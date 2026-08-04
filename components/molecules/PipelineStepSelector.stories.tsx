import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { PipelineStepSelector } from '@molecules/PipelineStepSelector'
import { createDefaultDraft, expandPresetToDraft } from '@lib/pipelineConfig'

const meta = {
  title: 'Molecules/PipelineStepSelector',
  component: PipelineStepSelector,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  args: {
    draft: createDefaultDraft(),
    mode: 'custom',
    onDraftChange: fn(),
  },
} satisfies Meta<typeof PipelineStepSelector>

export default meta
type Story = StoryObj<typeof meta>

export const CustomPipeline: Story = {}

export const PresetBeforeConversion: Story = {
  args: {
    draft: expandPresetToDraft('ingest-normalize-ocr'),
    mode: 'preset',
  },
}

export const FullPipeline: Story = {
  args: {
    draft: {
      ...createDefaultDraft(),
      steps: {
        ...createDefaultDraft().steps,
        normalizePass1: {
          enabled: true,
          advancedOpen: true,
          subSelection: { split: true, rotate: true },
        },
        normalizePass2: {
          enabled: true,
          advancedOpen: true,
          subSelection: { split: true, rotate: true },
        },
        ocrProcessor: true,
        contentDedup: true,
        metadataExtraction: true,
        metadataValidation: true,
        rightsDeterminator: true,
      },
    },
    mode: 'custom',
  },
}
