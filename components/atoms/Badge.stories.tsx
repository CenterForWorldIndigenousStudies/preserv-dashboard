import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Badge, variantMap } from '@atoms/Badge'

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: Object.keys(variantMap),
      description: 'Color variant of the badge',
    },
    children: {
      control: 'text',
      description: 'Badge label text',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for custom styling',
    },
  },
  args: {
    variant: 'sky',
    children: 'In Review',
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Default Badge',
  args: {},
}

export const CustomClass: Story = {
  args: {
    className: 'custom-class',
    children: 'Custom Styled',
  },
}
