import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ProcessingTime } from './ProcessingTime'

const meta = {
  title: 'Atoms/ProcessingTime',
  component: ProcessingTime,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
  },
} satisfies Meta<typeof ProcessingTime>

export default meta
type Story = StoryObj<typeof meta>

export const Seconds: Story = {
  args: { value: 42 },
}

export const OneSecond: Story = {
  args: { value: 1 },
}

export const Unknown: Story = {
  args: { value: 'Unknown' },
}

export const Empty: Story = {
  args: { value: null },
}
