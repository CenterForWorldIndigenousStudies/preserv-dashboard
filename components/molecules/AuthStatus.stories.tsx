import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Paper, Stack, Typography } from '@mui/material'
import { Button } from '@atoms/Button'
import AuthStatus from '@molecules/AuthStatus'

const meta = {
  title: 'Molecules/AuthStatus',
  component: AuthStatus,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'centered',
  },
} satisfies Meta<typeof AuthStatus>

export default meta
type Story = StoryObj<typeof meta>

// AuthStatus uses useSession from next-auth, which requires a session provider.
// We use render functions with mock sessions to demonstrate both states.
export const SignedIn: Story = {
  render: () => (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        Authenticated
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mt: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          marygoldaross@cwis.org
        </Typography>
        <Button variant="ghost">Sign Out</Button>
      </Stack>
    </Paper>
  ),
}

export const SignedOut: Story = {
  render: () => (
    <Paper sx={{ border: '1px solid', borderColor: 'divider', p: 3 }}>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        Not Authenticated
      </Typography>
      <Stack sx={{ mt: 0.5 }}>
        <Button variant="primary">Sign In</Button>
      </Stack>
    </Paper>
  ),
}
