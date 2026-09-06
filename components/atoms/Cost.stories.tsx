import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { Cost } from '@atoms/Cost'

const meta = {
  title: 'Atoms/Cost',
  component: Cost,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof Cost>

export default meta
type Story = StoryObj<typeof meta>

export const Formatted: Story = {
  args: { value: '$12.50' },
}

export const RawNumber: Story = {
  args: { value: 0.127778 },
}

export const Missing: Story = {
  args: { value: null },
}
