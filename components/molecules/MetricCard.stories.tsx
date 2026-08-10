import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Box } from '@mui/material'

import { BATCHES_PATH, READY_FOR_LIBRARY_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'
import { MetricCard } from '@molecules/MetricCard'

const meta: Meta<typeof MetricCard> = {
  title: 'Molecules/MetricCard',
  component: MetricCard,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Label above the KPI value',
    },
    value: {
      control: 'number',
      description: 'Operational KPI value displayed in the card',
    },
    description: {
      control: 'text',
      description: 'Supporting explanation for operational users',
    },
    href: {
      control: 'text',
      description: 'Destination opened by the CTA button',
    },
    actionLabel: {
      control: 'text',
      description: 'Label for the CTA button',
    },
  },
  args: {
    title: 'Needs Review',
    value: 342,
    description: 'Documents in the current human review queue using the existing Review Queue defaults.',
    href: REVIEW_QUEUE_PATH,
    actionLabel: 'Open',
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof MetricCard>

export default meta
type Story = StoryObj<typeof meta>

export const NeedsReview: Story = {}

export const ReadyForLibrary: Story = {
  args: {
    title: 'Ready for Library',
    value: 87,
    description: 'Approved documents that meet the current library-ready handoff rules.',
    href: READY_FOR_LIBRARY_PATH,
  },
}

export const ActiveBatches: Story = {
  args: {
    title: 'Active Batches',
    value: 6,
    description: 'Recent processing batches currently classified as active in the Batches view.',
    href: BATCHES_PATH,
  },
}

export const AllCards: Story = {
  render: () => (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
      }}
    >
      <MetricCard
        title={'Needs Review'}
        value={342}
        description={'Documents in the current human review queue using the existing Review Queue defaults.'}
        href={REVIEW_QUEUE_PATH}
      />
      <MetricCard
        title={'Ready for Library'}
        value={87}
        description={'Approved documents that meet the current library-ready handoff rules.'}
        href={READY_FOR_LIBRARY_PATH}
      />
      <MetricCard
        title={'Active Batches'}
        value={6}
        description={'Recent processing batches currently classified as active in the Batches view.'}
        href={BATCHES_PATH}
      />
    </Box>
  ),
}
