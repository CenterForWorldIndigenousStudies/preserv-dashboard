import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentRoleBadges } from './DocumentRoleBadges'

const meta = {
  title: 'Molecules/DocumentRoleBadges',
  component: DocumentRoleBadges,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <Box sx={{ width: '100%', p: 2 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DocumentRoleBadges>

export default meta
type Story = StoryObj<typeof meta>

export const CandidateAndCanonical: Story = {
  args: {
    isCandidate: true,
    isCanonical: true,
  },
}

export const CandidateOnly: Story = {
  args: {
    isCandidate: true,
    isCanonical: false,
  },
}

export const CanonicalOnly: Story = {
  args: {
    isCandidate: false,
    isCanonical: true,
  },
}
