import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'

const meta = {
  title: 'Molecules/TagSearchCombobox',
  component: TagSearchCombobox,
  tags: ['autodocs'],
  args: {
    open: true,
    value: 'Cherokee',
    onSelectExisting: () => Promise.resolve(),
    onSelectCreate: () => undefined,
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof TagSearchCombobox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
