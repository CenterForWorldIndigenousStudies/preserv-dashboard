import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Badge, variantMap } from '@atoms/Badges/Badge'

const meta = {
  title: 'Atoms/Badges/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: Object.keys(variantMap),
      description: 'Semantic badge variant',
    },
    outlined: {
      control: 'boolean',
      description: 'Render the badge with a transparent background and colored border',
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
    variant: 'info',
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

export const Outlined: Story = {
  args: {
    outlined: true,
    variant: 'success',
    children: 'Canonical',
  },
}
