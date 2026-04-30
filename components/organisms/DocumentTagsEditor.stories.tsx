import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DocumentTagsEditor } from '@organisms/DocumentTagsEditor'

const initialTagsMap = {
  empty: [] as Array<{
    id: string
    document_id: string
    tag_id: string
    notes: string | null
    tags: {
      id: string
      name: string | null
      notes: string | null
    }
  }>,
  populated: [
    {
      id: 'doc-tag-1',
      document_id: 'document-1',
      tag_id: 'tag-1',
      notes: null,
      tags: {
        id: 'tag-1',
        name: 'Cherokee Language',
        notes: 'Language preservation materials',
      },
    },
    {
      id: 'doc-tag-2',
      document_id: 'document-1',
      tag_id: 'tag-2',
      notes: null,
      tags: {
        id: 'tag-2',
        name: 'Oral History',
        notes: 'Recorded interviews and recollections',
      },
    },
  ],
}

const meta = {
  title: 'Organisms/DocumentTagsEditor',
  component: DocumentTagsEditor,
  tags: ['autodocs'],
  args: {
    documentId: 'document-1',
    initialTags: initialTagsMap.populated,
  },
} satisfies Meta<typeof DocumentTagsEditor>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    initialTags: initialTagsMap.empty,
  },
}
