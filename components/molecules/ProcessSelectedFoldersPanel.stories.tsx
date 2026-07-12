import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import type { DriveFolderOption } from '@lib/googleDrive'
import { ProcessSelectedFoldersPanel } from '@molecules/ProcessSelectedFoldersPanel'

const folders: DriveFolderOption[] = [
  { id: 'drive-folder-1', name: 'Refugee Mental Health Records' },
  { id: 'drive-folder-2', name: 'Community Oral Histories' },
  { id: 'drive-folder-3', name: 'Regional Reports and Interviews' },
]

const meta = {
  title: 'Molecules/ProcessSelectedFoldersPanel',
  component: ProcessSelectedFoldersPanel,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 760 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessSelectedFoldersPanel>

export default meta
type Story = StoryObj<typeof meta>

export const NoFoldersSelected: Story = {
  args: {
    folders: [],
  },
}

export const SelectedFolders: Story = {
  args: {
    folders,
  },
}
