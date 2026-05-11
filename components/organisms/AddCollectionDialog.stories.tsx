import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { COLLECTIONS_PATH } from '@constants/paths'
import { AddCollectionDialog } from './AddCollectionDialog'

const meta = {
  title: 'Organisms/AddCollectionDialog',
  component: AddCollectionDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: COLLECTIONS_PATH,
      },
    },
  },
  args: {
    open: true,
    onClose: () => undefined,
    collections: [
      {
        id: '00000001-0001-0001-0001-000000000001',
        tag_id: 'tag-001',
        collection_name: 'Cherokee Language Revitalization',
        notes: 'Teaching materials and language resources.',
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
        document_count: 12,
      },
    ],
  },
} satisfies Meta<typeof AddCollectionDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
