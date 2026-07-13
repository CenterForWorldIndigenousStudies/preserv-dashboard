import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { NormalizePassCard } from '@molecules/NormalizePassCard'

const meta = {
  title: 'Molecules/NormalizePassCard',
  component: NormalizePassCard,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  args: {
    passNumber: 1,
    state: {
      enabled: true,
      advancedOpen: false,
      subSelection: { split: true, rotate: true },
    },
    helperText: null,
    onToggle: fn(),
    onSubOptionToggle: fn(),
    onAdvancedToggle: fn(),
  },
} satisfies Meta<typeof NormalizePassCard>

export default meta
type Story = StoryObj<typeof meta>

export const Enabled: Story = {}

export const AdvancedOptionsOpen: Story = {
  args: {
    state: {
      enabled: true,
      advancedOpen: true,
      subSelection: { split: true, rotate: false },
    },
  },
}

export const DisabledWithDependency: Story = {
  args: {
    passNumber: 2,
    state: {
      enabled: false,
      advancedOpen: false,
      subSelection: { split: false, rotate: false },
    },
    helperText: 'Required by Normalize Pass 2',
    disabled: true,
  },
}
