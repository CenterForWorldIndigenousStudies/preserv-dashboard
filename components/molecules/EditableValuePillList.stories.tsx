import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { EditableValuePillList } from '@molecules/EditableValuePillList'

const meta = {
  title: 'Molecules/EditableValuePillList',
  component: EditableValuePillList,
  tags: ['autodocs'],
  args: {
    values: ['Cultural history', 'Archives'],
    onChange: () => undefined,
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof EditableValuePillList>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    values: [],
  },
}
