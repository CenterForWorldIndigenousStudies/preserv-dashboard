import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Box } from '@mui/material'

import { DOCUMENTS_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'
import { ActionCard } from '@molecules/ActionCard'

const meta: Meta<typeof ActionCard> = {
  title: 'Molecules/ActionCard',
  component: ActionCard,
  tags: ['autodocs'],
  argTypes: {
    eyebrow: {
      control: 'text',
      description: 'Optional overline label for the card.',
    },
    title: {
      control: 'text',
      description: 'Primary destination or workflow label.',
    },
    description: {
      control: 'text',
      description: 'Supporting explanation for the destination.',
    },
    href: {
      control: 'text',
      description: 'Destination opened by the CTA button.',
    },
  },
  args: {
    eyebrow: 'Quick Action',
    title: 'Review Queue',
    description: 'Go to the current review workflow.',
    href: REVIEW_QUEUE_PATH,
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof ActionCard>

export default meta
type Story = StoryObj<typeof meta>

export const WithEyebrow: Story = {}

export const WithoutEyebrow: Story = {
  args: {
    eyebrow: undefined,
    title: 'Documents',
    description: 'Browse documents, then open Document Detail to manage tags in the current live workflow.',
    href: DOCUMENTS_PATH,
  },
}

export const CardGrid: Story = {
  render: () => (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
        },
      }}
    >
      <ActionCard
        eyebrow="Quick Action"
        title="Review Queue"
        description="Go to the current review workflow."
        href={REVIEW_QUEUE_PATH}
      />
      <ActionCard
        title="Documents"
        description="Browse documents, then open Document Detail to manage tags in the current live workflow."
        href={DOCUMENTS_PATH}
      />
    </Box>
  ),
}
