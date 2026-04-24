import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FilterPill } from '@components/atoms/FilterPill'

const meta = {
  title: 'Atoms/FilterPill',
  component: FilterPill,
  tags: ['autodocs'],
  args: {
    isActive: false,
    href: '/documents',
    label: 'Filter',
  },
  argTypes: {
    label: { control: 'text' },
    isActive: { control: 'boolean' },
    href: { control: 'text' },
    className: { control: 'text' },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof FilterPill>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Default FilterPill',
  args: {},
}

export const AllFilters: Story = {
  argTypes: {
    label: { control: false },
    isActive: { control: false },
    href: { control: false },
    className: { control: false },
  },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <FilterPill label="All" isActive={true} href="/documents" />
      <FilterPill label="Completed" isActive={false} href="/documents?state=completed" />
      <FilterPill label="Failed" isActive={false} href="/documents?state=failed" />
      <FilterPill label="Under Review" isActive={false} href="/documents?state=under_review" />
    </div>
  ),
}
