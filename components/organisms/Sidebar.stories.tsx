import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { COMPONENT_LIBRARY_PATH } from '@constants/paths'
import Sidebar from '@organisms/Sidebar'

const meta = {
  title: 'Organisms/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['desktop', 'mobile'] },
    isOpen: { control: 'boolean' },
    onClose: { action: 'closed' },
  },
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'fullscreen',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: COMPONENT_LIBRARY_PATH,
      },
    },
  },
} satisfies Meta<typeof Sidebar>

export default meta
type Story = StoryObj<typeof meta>

export const Desktop: Story = {
  args: {
    variant: 'desktop',
    isOpen: true,
    onClose: () => {},
  },
}

export const MobileOpen: Story = {
  args: {
    variant: 'mobile',
    isOpen: true,
    onClose: () => {},
  },
}

export const MobileClosed: Story = {
  args: {
    variant: 'mobile',
    isOpen: false,
    onClose: () => {},
  },
}
