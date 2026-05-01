import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'
import type { Document } from '@lib/types'

const inCollectionDocuments: Document[] = [
  {
    id: 'doc-1',
    name: 'Cherokee Syllabary Guide',
    id_legacy: 'CWIS-001',
    filesize: 1250000,
    hash_binary: null,
    hash_content: null,
    source_id: null,
    created_at: new Date('2024-01-10T00:00:00.000Z'),
    updated_at: new Date('2024-01-10T00:00:00.000Z'),
    is_duplicate: false,
  },
  {
    id: 'doc-2',
    name: 'Language Preservation Interview Notes',
    id_legacy: 'CWIS-019',
    filesize: 875000,
    hash_binary: null,
    hash_content: null,
    source_id: null,
    created_at: new Date('2024-02-02T00:00:00.000Z'),
    updated_at: new Date('2024-02-02T00:00:00.000Z'),
    is_duplicate: false,
  },
]

const outOfCollectionDocuments: Document[] = [
  {
    id: 'doc-3',
    name: 'Oral History Transcript',
    id_legacy: 'CWIS-034',
    filesize: 2480000,
    hash_binary: null,
    hash_content: null,
    source_id: null,
    created_at: new Date('2023-11-14T00:00:00.000Z'),
    updated_at: new Date('2023-11-14T00:00:00.000Z'),
    is_duplicate: false,
  },
  {
    id: 'doc-4',
    name: 'Regional Archive Inventory',
    id_legacy: 'CWIS-041',
    filesize: 980000,
    hash_binary: null,
    hash_content: null,
    source_id: null,
    created_at: new Date('2024-03-18T00:00:00.000Z'),
    updated_at: new Date('2024-03-18T00:00:00.000Z'),
    is_duplicate: false,
  },
]

const meta = {
  title: 'Organisms/CollectionDocumentManager',
  component: CollectionDocumentManager,
  tags: ['autodocs'],
  args: {
    collectionId: 'collection-1',
    collectionName: 'Cherokee Language Collection',
    open: true,
    onClose: () => undefined,
    loadInCollection: () => Promise.resolve(inCollectionDocuments),
    loadOutOfCollection: () => Promise.resolve(outOfCollectionDocuments),
    addDocuments: () => Promise.resolve(),
    removeDocuments: () => Promise.resolve(),
  },
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof CollectionDocumentManager>

export default meta

type Story = StoryObj<typeof meta>

export const AddMode: Story = {
  args: {
    initialAction: 'add',
  },
}

export const RemoveMode: Story = {
  args: {
    initialAction: 'remove',
  },
}
