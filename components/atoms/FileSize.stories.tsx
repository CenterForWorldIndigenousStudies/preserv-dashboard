import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FileSize } from '@atoms/FileSize'

const meta = {
  title: 'Atoms/FileSize',
  component: FileSize,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'number' },
    className: { control: 'text' },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof FileSize>

export default meta
type Story = StoryObj<typeof meta>

export const Zero: Story = {
  name: 'Zero bytes',
  args: { value: 0 },
  parameters: {
    docs: {
      description: {
        story: 'Click the displayed date to toggle between `0` and `0 bytes`.',
      },
    },
  },
}

export const Bytes: Story = {
  args: { value: 512 },
  parameters: {
    docs: {
      description: {
        story: 'Click the displayed date to toggle between the human-readable format and raw bytes.',
      },
    },
  },
}

export const Kilobytes: Story = {
  args: { value: 1536 },
  parameters: {
    docs: {
      description: {
        story: 'Click the displayed date to toggle between the human-readable format and raw bytes.',
      },
    },
  },
}

export const Megabytes: Story = {
  args: { value: 4.7 * 1024 * 1024 },
  parameters: {
    docs: {
      description: {
        story: 'Click the displayed date to toggle between the human-readable format and raw bytes.',
      },
    },
  },
}

export const Gigabytes: Story = {
  args: { value: 2.3 * 1024 * 1024 * 1024 },
  parameters: {
    docs: {
      description: {
        story: 'Click the displayed date to toggle between the human-readable format and raw bytes.',
      },
    },
  },
}

export const Terabytes: Story = {
  args: { value: 1024 * 1024 * 1024 * 1024 },
  parameters: {
    docs: {
      description: {
        story: 'Click the displayed date to toggle between the human-readable format and raw bytes.',
      },
    },
  },
}

export const Null: Story = {
  name: 'null (dash)',
    args: { value: null },
    parameters: {
      docs: {
        description: {
          story: 'There is no toggle when there is no value.',
        },
      },
    },
}

export const Undefined: Story = {
  name: 'undefined (dash)',
  args: { value: undefined },
  parameters: {
    docs: {
      description: {
        story: 'There is no toggle when there is no value.',
      },
    },
  },
}

export const BigIntValue: Story = {
  args: { value: BigInt(1572864) },
  parameters: {
    docs: {
      description: {
        story: 'Click the displayed date to toggle between the human-readable format and raw bytes.',
      },
    },
  },
}
