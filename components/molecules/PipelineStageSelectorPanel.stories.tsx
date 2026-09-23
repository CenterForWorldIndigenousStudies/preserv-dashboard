import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import {
  CONTENT_DEDUP_SERVICE,
  DOCUMENT_SPLITTER_SERVICE,
  OCR_PROCESSOR_SERVICE,
  PAGE_ROTATOR_SERVICE,
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
    selectedStages: [DOCUMENT_SPLITTER_SERVICE, PAGE_ROTATOR_SERVICE, OCR_PROCESSOR_SERVICE],
  },
}

export const AllStagesSelected: Story = {
  args: {
    selectedStages: [DOCUMENT_SPLITTER_SERVICE, PAGE_ROTATOR_SERVICE, OCR_PROCESSOR_SERVICE, CONTENT_DEDUP_SERVICE],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('checkbox', { name: /content dedup/i })).toBeChecked()
    await userEvent.click(canvas.getByRole('checkbox', { name: /content dedup/i }))
  },
}
