import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@atoms/Button'

import { DocumentTableAdvancedSearchTrigger } from '@molecules/DocumentTableAdvancedSearchTrigger'

const meta = {
  title: 'Molecules/DocumentTableAdvancedSearchTrigger',
  component: DocumentTableAdvancedSearchTrigger,
  tags: ['autodocs'],
  args: {
    activeFilterCount: 0,
    children: <Button variant={'secondary'}>Advanced Search</Button>,
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof DocumentTableAdvancedSearchTrigger>

export default meta
type Story = StoryObj<typeof meta>

export const NoActiveFilters: Story = {}

export const ActiveFilters: Story = {
  args: {
    activeFilterCount: 3,
  },
}
