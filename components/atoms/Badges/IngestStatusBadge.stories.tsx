import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { IngestStatusBadge, statusVariantMap } from '@atoms/Badges/IngestStatusBadge'

const meta = {
  title: 'Atoms/Badges/IngestStatusBadge',
  component: IngestStatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: Object.keys(statusVariantMap),
      description: 'Status string for the badge',
    },
    className: { control: 'text' },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof IngestStatusBadge>

export default meta
type Story = StoryObj<typeof meta>

export const DefaultIngestStatusBadge: Story = {
  args: {},
}

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      { Object.keys(statusVariantMap).map((status, index) => (
        <IngestStatusBadge key={`${status}-${index}`} status={status} />
      )) }
    </div>
  ),
}
