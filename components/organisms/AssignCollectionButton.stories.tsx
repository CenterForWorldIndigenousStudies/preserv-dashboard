import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
import { AssignCollectionButton } from '@organisms/AssignCollectionButton'

const meta = {
  title: 'Organisms/AssignCollectionButton',
  component: AssignCollectionButton,
  tags: ['autodocs'],
  argTypes: {
    documentId: { control: 'text' },
    currentTags: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 'min(100%, 36rem)', p: 2 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof AssignCollectionButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    documentId: 'DOC-2024-0042',
    currentTags: [],
  },
}

export const WithTags: Story = {
  args: {
    documentId: 'DOC-2024-0018',
    currentTags: ['Cherokee Language', 'Oral History'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Tags assigned.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Edit assignment' })).toBeVisible()
  },
}

export const MultipleTags: Story = {
  args: {
    documentId: 'DOC-2024-0031',
    currentTags: ['Cultural Archive', 'Legal Treaty', 'Oral History'],
  },
}
