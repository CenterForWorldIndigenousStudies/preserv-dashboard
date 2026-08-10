import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'
import { DOCUMENTS_API_PATH, FAILED_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'
import { StatCard } from '@molecules/StatCard'

const meta = {
  title: 'Molecules/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Label above the numeric value',
    },
    value: {
      control: 'number',
      description: 'Numeric value to display',
    },
    href: {
      control: 'text',
      description: 'Optional link URL (omit for static card)',
    },
  },
  args: {
    title: 'Total Documents',
    value: 12847,
    href: undefined,
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof StatCard>

export default meta
type Story = StoryObj<typeof meta>

export const Static: Story = {
  args: {
    title: 'Total Documents',
    value: 12847,
  },
}

export const Linked: Story = {
  args: {
    title: 'Pending Review',
    value: 342,
    href: REVIEW_QUEUE_PATH,
  },
}

export const CollectionSize: Story = {
  args: {
    title: 'Collection Size',
    value: 8754693120,
    href: DOCUMENTS_API_PATH,
  },
}

export const AllCards: Story = {
  render: () => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(3, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      <StatCard title={'Total Documents'} value={12847} href={DOCUMENTS_API_PATH} />
      <StatCard title={'Pending Review'} value={342} href={REVIEW_QUEUE_PATH} />
      <StatCard title={'Failed Pipeline'} value={7} href={FAILED_PATH} />
    </Box>
  ),
}
