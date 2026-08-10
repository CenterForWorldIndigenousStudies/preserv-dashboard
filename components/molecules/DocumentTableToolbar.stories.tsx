import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@atoms/Button'
import { fn } from 'storybook/test'

import { DocumentTableToolbar } from '@molecules/DocumentTableToolbar'

const meta = {
  title: 'Molecules/DocumentTableToolbar',
  component: DocumentTableToolbar,
  tags: ['autodocs'],
  args: {
    searchPlaceholder: 'Search documents',
    searchValue: '',
    onSearchChange: fn(),
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    onPageSizeChange: fn(),
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof DocumentTableToolbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithResultsAndSlots: Story = {
  args: {
    searchValue: 'language',
    totalCount: 42,
    leadingSlot: <Button variant={'secondary'}>{'Advanced Search'}</Button>,
    trailingSlot: <Button variant={'ghost'}>{'Export'}</Button>,
  },
}
