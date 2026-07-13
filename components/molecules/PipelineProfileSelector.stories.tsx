import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { PipelineProfileSelector } from '@molecules/PipelineProfileSelector'
import { createDefaultDraft, expandPresetToDraft } from '@lib/pipelineConfig'

const meta = {
  title: 'Molecules/PipelineProfileSelector',
  component: PipelineProfileSelector,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  args: {
    draft: createDefaultDraft(),
    onProfileChange: fn(),
    onConvertToCustom: fn(),
    onOpenStepsModal: fn(),
  },
} satisfies Meta<typeof PipelineProfileSelector>

export default meta
type Story = StoryObj<typeof meta>

export const CustomProfile: Story = {}

export const IngestNormalizeOcr: Story = {
  args: {
    draft: expandPresetToDraft('ingest-normalize-ocr'),
  },
}

export const IngestNormalizeOcrDedup: Story = {
  args: {
    draft: expandPresetToDraft('ingest-normalize-ocr-dedup'),
  },
}
