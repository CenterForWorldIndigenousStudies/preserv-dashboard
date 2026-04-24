import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DateAtom } from '@atoms/Date'

const meta = {
  title: 'Atoms/Date',
  component: DateAtom,
  tags: ['autodocs'],
  args: {
    value: '2026-04-23T21:57:00.000-07:00',
  },
  argTypes: {
    value: {
      control: 'object',
      description: 'ISO string, Unix timestamp (seconds or ms), Date object, or null. You MUST enter strings in quotes to prevent Storybook from trying to parse them as dates.',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof DateAtom>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  name: 'Default Date',
}

export const DateOnly: Story = {
  name: 'Date Only (no time)',
  args: {
    value: '2026-04-23T00:00:00.000-07:00',
  },
}

export const YearAndMonthOnly: Story = {
  args: {
    value: '2026-04',
  },
}

export const YearOnly: Story = {
  args: {
    value: '2026',
  },
}

export const NullValue: Story = {
  args: {
    value: null,
  },
}

export const UnixTimestampSeconds: Story = {
  name: 'Unix Timestamp (seconds)',
  args: {
    value: 1770097020,
  },
}

export const UnixTimestampMillis: Story = {
  name: 'Unix Timestamp (milliseconds)',
  args: {
    value: 1770097020000,
  },
}

export const ToggleInteraction: Story = {
  name: 'Toggle Interaction (click to see raw)',
  args: {
    value: '2026-04-23T21:57:00.000-07:00',
  },
  parameters: {
    docs: {
      description: {
        story: 'Click the displayed date to toggle between the human-readable format and the raw ISO value.',
      },
    },
  },
}
