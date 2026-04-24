import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import SidebarToggle from '@molecules/SidebarToggle'

const meta: Meta<typeof SidebarToggle> = {
  title: 'Molecules/SidebarToggle',
  component: SidebarToggle,
  tags: ['autodocs'],
  argTypes: {
    onClick: { action: 'clicked' },
  },
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof SidebarToggle>

export const Default: Story = {
  args: {
    onClick: () => {},
  },
}
