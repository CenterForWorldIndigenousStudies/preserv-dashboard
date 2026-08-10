import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Box } from '@mui/material'
import { expect, fn, userEvent, within } from 'storybook/test'

import { SIDEBAR_CONTROL_LABELS } from '@constants/sidebar'
import { SidebarVisibilityControl } from '@molecules/SidebarVisibilityControl'

const meta = {
  title: 'Molecules/SidebarVisibilityControl',
  component: SidebarVisibilityControl,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'centered',
  },
} satisfies Meta<typeof SidebarVisibilityControl>

export default meta
type Story = StoryObj<typeof meta>

export const MobileOpen: Story = {
  args: {
    intent: 'open',
    surface: 'mobileBar',
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await userEvent.click(canvas.getByRole('button', { name: SIDEBAR_CONTROL_LABELS.openNavigation }))

    await expect(args.onClick).toHaveBeenCalled()
  },
}

export const MobileClose: Story = {
  args: {
    intent: 'close',
    surface: 'sidebarHeader',
    onClick: fn(),
  },
}

export const DesktopExpanded: Story = {
  decorators: [
    (StoryComponent) => (
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 120 }}>
        <Box
          sx={{
            height: 72,
            width: 1,
            borderRight: '1px solid rgba(53, 88, 52, 0.1)',
            bgcolor: 'sand.main',
          }}
        />
        <Box sx={{ ml: '-1px' }}>
          <StoryComponent />
        </Box>
      </Box>
    ),
  ],
  args: {
    intent: 'close',
    surface: 'desktopRail',
    onClick: fn(),
  },
}

export const DesktopCollapsed: Story = {
  decorators: [
    (StoryComponent) => (
      <Box sx={{ display: 'flex', alignItems: 'center', minHeight: 120 }}>
        <Box
          sx={{
            height: 72,
            width: 1,
            borderRight: '1px solid rgba(53, 88, 52, 0.1)',
            bgcolor: 'sand.main',
          }}
        />
        <Box sx={{ ml: '-1px' }}>
          <StoryComponent />
        </Box>
      </Box>
    ),
  ],
  args: {
    intent: 'open',
    surface: 'desktopRail',
    onClick: fn(),
  },
}
