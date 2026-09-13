import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ValuePill } from '@atoms/ValuePill'

const meta = {
  title: 'Atoms/ValuePill',
  component: ValuePill,
  tags: ['autodocs'],
  args: {
    value: 'Indigenous governance',
  },
  argTypes: {
    value: { control: 'text' },
    href: { control: 'text' },
    onRemove: { action: 'removed' },
    tooltip: { control: 'text' },
    className: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof ValuePill>

export default meta
type Story = StoryObj<typeof meta>

export const ReadOnly: Story = {
  args: {
    onRemove: undefined,
  },
}

export const Removable: Story = {
  args: {},
}

export const WithTooltip: Story = {
  args: {
    onRemove: undefined,
    tooltip: 'A value extracted from the document metadata.',
  },
}

export const Linked: Story = {
  args: {
    href: '/documents?contributor=Ada+Example',
    onRemove: undefined,
  },
}
