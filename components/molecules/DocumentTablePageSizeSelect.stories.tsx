import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { DocumentTablePageSizeSelect } from '@molecules/DocumentTablePageSizeSelect'

const meta = {
  title: 'Molecules/DocumentTablePageSizeSelect',
  component: DocumentTablePageSizeSelect,
  tags: ['autodocs'],
  args: {
    options: [10, 25, 50, 100],
    value: 25,
    onChange: fn(),
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof DocumentTablePageSizeSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LargePageSize: Story = {
  args: {
    value: 100,
  },
}
