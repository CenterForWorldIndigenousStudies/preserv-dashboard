import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TableStat } from './TableStat'

const meta = {
  title: 'Atoms/TableStat',
  component: TableStat,
  tags: ['autodocs'],
  args: {
    label: 'Some Label',
    value: 42,
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'The label of the value',
    },
    value: {
      control: 'text',
      description: 'The actual value',
    },
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof TableStat>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Renders a statistic for use in a table',
      },
    },
  },
}
