import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Box } from '@mui/material'
import { expect, screen } from 'storybook/test'
import { PRESERVATION_PIPELINE_TITLE } from '@constants/branding'
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
  play: async () => {
    await expect(screen.getByText(PRESERVATION_PIPELINE_TITLE)).toBeVisible()
  },
}

export const MobileOpen: Story = {
  decorators: [
    (StoryComponent) => (
      <Box sx={{ minHeight: '100vh', bgcolor: 'sand.main' }}>
        <StoryComponent />
      </Box>
    ),
  ],
  args: {
    variant: 'mobile',
    isOpen: true,
    onClose: () => {},
  },
  play: async () => {
    await expect(screen.getByLabelText(/close navigation menu/i)).toBeVisible()
  },
}

export const MobileClosed: Story = {
  decorators: [
    (StoryComponent) => (
      <Box
        sx={{
          bgcolor: 'sand.main',
          minHeight: '100vh',
          p: 3,
        }}
      >
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 3,
            maxWidth: 24 * 16,
            minHeight: 16 * 16,
            p: 3,
          }}
        >
          <Box component={'p'} sx={{ color: 'text.secondary', m: 0 }}>
            {'Mobile canvas with the navigation drawer closed.'}
          </Box>
          <StoryComponent />
        </Box>
      </Box>
    ),
  ],
  args: {
    variant: 'mobile',
    isOpen: false,
    onClose: () => {},
  },
}
