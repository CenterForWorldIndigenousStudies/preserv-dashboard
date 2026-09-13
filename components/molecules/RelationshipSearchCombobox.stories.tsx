import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { RelationshipSearchCombobox } from '@molecules/RelationshipSearchCombobox'

const meta = {
  title: 'Molecules/RelationshipSearchCombobox',
  component: RelationshipSearchCombobox,
  tags: ['autodocs'],
  args: {
    open: true,
    disabled: false,
    onSelect: () => undefined,
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof RelationshipSearchCombobox>

export default meta
type Story = StoryObj<typeof meta>

export const Contributor: Story = {
  args: { kind: 'contributor' },
}

export const Publisher: Story = {
  args: { kind: 'publisher' },
}

export const Disabled: Story = {
  args: { kind: 'contributor', disabled: true },
}
