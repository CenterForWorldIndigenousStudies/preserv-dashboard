import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import {
  CONTENT_DEDUP_STAGE,
  DOCUMENT_SPLITTER_STAGE,
  OCR_PROCESSOR_STAGE,
  PAGE_ROTATOR_STAGE,
} from '@constants/pipeline'
import { PipelineStageSelectorPanel } from '@molecules/PipelineStageSelectorPanel'

const meta = {
  title: 'Molecules/PipelineStageSelectorPanel',
  component: PipelineStageSelectorPanel,
  tags: ['autodocs'],
  args: {
    selectedStages: [],
    onSelectedStagesChange: fn(),
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof PipelineStageSelectorPanel>

export default meta
type Story = StoryObj<typeof meta>

export const NoStagesSelected: Story = {}

export const NormalizeAndOcrSelected: Story = {
  args: {
    selectedStages: [DOCUMENT_SPLITTER_STAGE, PAGE_ROTATOR_STAGE, OCR_PROCESSOR_STAGE],
  },
}

export const AllStagesSelected: Story = {
  args: {
    selectedStages: [DOCUMENT_SPLITTER_STAGE, PAGE_ROTATOR_STAGE, OCR_PROCESSOR_STAGE, CONTENT_DEDUP_STAGE],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('checkbox', { name: /content dedup/i })).toBeChecked()
    await userEvent.click(canvas.getByRole('checkbox', { name: /content dedup/i }))
  },
}
