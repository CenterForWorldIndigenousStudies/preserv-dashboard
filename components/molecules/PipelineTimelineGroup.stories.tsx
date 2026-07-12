import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { PipelineTimelineGroup } from '@molecules/PipelineTimelineGroup'

const meta = {
  title: 'Molecules/PipelineTimelineGroup',
  component: PipelineTimelineGroup,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'centered',
  },
  decorators: [
    (StoryComponent) => <Box sx={{ width: 'min(100%, 640px)' }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof PipelineTimelineGroup>

export default meta
type Story = StoryObj<typeof meta>

export const RunningWithSubSteps: Story = {
  args: {
    isLast: false,
    step: {
      label: 'Normalize Pass 1',
      status: 'running',
      subSteps: [
        { label: 'Document Splitter', status: 'completed' },
        { label: 'Page Rotator', status: 'running' },
      ],
    },
  },
}

export const Failed: Story = {
  args: {
    isLast: false,
    step: {
      label: 'OCR Processor',
      status: 'failed',
      subSteps: [{ label: 'OCR pass', status: 'failed' }],
    },
  },
}

export const PendingLastStep: Story = {
  args: {
    isLast: true,
    step: {
      label: 'Metadata Validator',
      status: 'pending',
    },
  },
}
