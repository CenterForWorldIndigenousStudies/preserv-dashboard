import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentRelationshipEditor } from '@molecules/DocumentRelationshipEditor'

const meta = {
  title: 'Molecules/DocumentRelationshipEditor',
  component: DocumentRelationshipEditor,
  tags: ['autodocs'],
  args: {
    contributors: [
      { contributorId: 'contributor-1', name: 'Ada Example', role: 'author', type: 'primary', notes: 'Primary author' },
    ],
    publishers: [{ publisherId: 'publisher-1', name: 'Example Press', notes: null }],
    onContributorsChange: () => undefined,
    onPublishersChange: () => undefined,
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 'min(100%, 60rem)', p: 2 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DocumentRelationshipEditor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: { contributors: [], publishers: [] },
}
