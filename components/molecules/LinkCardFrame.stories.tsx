import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Box, Typography } from '@mui/material'

import { LinkCardFrame } from '@molecules/LinkCardFrame'
import { DOCUMENTS_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'

const meta = {
  title: 'Molecules/LinkCardFrame',
  component: LinkCardFrame,
  tags: ['autodocs'],
  args: {
    actionLabel: 'Open',
    eyebrow: 'Shared Frame',
    href: DOCUMENTS_PATH,
    title: 'Documents',
    children: <Typography variant="body2">Browse the document collection.</Typography>,
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof LinkCardFrame>

export default meta
type Story = StoryObj<typeof meta>

export const WithEyebrow: Story = {}

export const WithoutEyebrow: Story = {
  args: {
    eyebrow: undefined,
    title: 'Review Queue',
    href: REVIEW_QUEUE_PATH,
    children: <Typography variant="body2">Review documents requiring human decisions.</Typography>,
  },
}

export const CardGrid: Story = {
  render: () => (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
        },
      }}
    >
      <LinkCardFrame actionLabel="Open Documents" eyebrow="Collection" href={DOCUMENTS_PATH} title="Documents">
        <Typography variant="body2">Browse the document collection.</Typography>
      </LinkCardFrame>
      <LinkCardFrame actionLabel="Open Review Queue" href={REVIEW_QUEUE_PATH} title="Review Queue">
        <Typography variant="body2">Review documents requiring human decisions.</Typography>
      </LinkCardFrame>
    </Box>
  ),
}
