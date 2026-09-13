import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, within } from 'storybook/test'

import { DocumentEditCoordinator } from '@organisms/DocumentEditCoordinator'
import type { DocumentQuality } from 'types/documents'

const meta = {
  title: 'Organisms/DocumentEditCoordinator',
  component: DocumentEditCoordinator,
  tags: ['autodocs'],
  args: {
    documentId: 'document-1',
    metadata: [
      { name: 'dc_title', value: JSON.stringify({ value: 'Example document' }), value_type: 'string', notes: null },
      { name: 'dc_subject', value: JSON.stringify({ value: ['History'] }), value_type: 'json', notes: null },
    ],
    quality: { comment: 'Control note', comment_additional: null } as DocumentQuality,
    initialTags: [],
    initialContributors: [],
    initialPublishers: [],
    children: <Box sx={{ p: 3 }}>Read-only document details</Box>,
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof DocumentEditCoordinator>

export default meta
type Story = StoryObj<typeof meta>

export const ReadOnly: Story = {}

export const Editing: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByLabelText('Edit document details'))
    await expect(canvas.getByText('Read-only document details')).toBeVisible()
    await expect(canvas.getByRole('textbox', { name: 'Comment Control' })).toBeVisible()
  },
}
