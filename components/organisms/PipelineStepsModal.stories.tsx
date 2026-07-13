import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { PipelineStepsModal } from '@organisms/PipelineStepsModal'
import { createDefaultDraft, expandPresetToDraft } from '@lib/pipelineConfig'

const meta = {
  title: 'Organisms/PipelineStepsModal',
  component: PipelineStepsModal,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  args: {
    open: true,
    draft: createDefaultDraft(),
    onClose: fn(),
    onDraftChange: fn(),
  },
} satisfies Meta<typeof PipelineStepsModal>

export default meta
type Story = StoryObj<typeof meta>

export const CustomConfiguration: Story = {}

export const PresetConfiguration: Story = {
  args: {
    draft: expandPresetToDraft('ingest-normalize-ocr-dedup'),
  },
}

export const Closed: Story = {
  args: {
    open: false,
  },
}
