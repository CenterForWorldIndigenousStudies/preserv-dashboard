import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AuditValuePopover } from './AuditValuePopover'

const meta = {
  title: 'Molecules/AuditValuePopover',
  component: AuditValuePopover,
  tags: ['autodocs'],
} satisfies Meta<typeof AuditValuePopover>

export default meta
type Story = StoryObj<typeof meta>

export const BeforeValue: Story = {
  args: {
    label: 'before',
    value:
      'This is a long audit value that is kept out of the table cell until the user chooses to inspect the complete content.',
  },
}

export const AfterValue: Story = {
  args: {
    label: 'after',
    value: 'The updated value can contain multiple lines.\nThe popover preserves those line breaks.',
  },
}
