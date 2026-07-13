import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { PipelineSelectionSummary } from '@molecules/PipelineSelectionSummary'
import { createDefaultDraft, expandPresetToDraft } from '@lib/pipelineConfig'

const meta = {
  title: 'Molecules/PipelineSelectionSummary',
  component: PipelineSelectionSummary,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  args: {
    draft: createDefaultDraft(),
  },
} satisfies Meta<typeof PipelineSelectionSummary>

export default meta
type Story = StoryObj<typeof meta>

export const IngestOnly: Story = {}

export const PresetSummary: Story = {
  args: {
    draft: expandPresetToDraft('ingest-normalize-ocr'),
  },
}

export const CustomSummary: Story = {
  args: {
    draft: {
      ...createDefaultDraft(),
      steps: {
        ...createDefaultDraft().steps,
        ocrProcessor: true,
        contentDedup: true,
        metadataExtraction: true,
      },
    },
  },
}
