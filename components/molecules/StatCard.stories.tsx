import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DOCUMENTS_API_PATH, FAILED_PATH, REVIEWS_PATH } from '@constants/paths'
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
    href: REVIEWS_PATH,
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard title="Total Documents" value={12847} href={DOCUMENTS_API_PATH} />
      <StatCard title="Pending Review" value={342} href={REVIEWS_PATH} />
      <StatCard title="Failed Pipeline" value={7} href={FAILED_PATH} />
    </div>
  ),
}
