import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CollectionDocumentManager } from '@organisms/CollectionDocumentManager'
import type { Document } from '@lib/types'

const NAME_POOL = [
  'Cherokee Syllabary Guide', 'Language Preservation Interview', 'Oral History Transcript',
  'Regional Archive Inventory', 'Peace Negotiations Document', 'First Nations Overview',
  'Miskito-Sumo Conflict Analysis', 'Nicaragua Regional Report', 'Cultural Heritage Assessment',
  'Traditional Medicine Practices', 'Land Rights Documentation', 'Treaty Analysis',
  'Elder Interviews Collection', 'Sacred Sites Registry', 'Language Recording Archive',
  'Water Rights Research', 'Indigenous Knowledge Database', 'Community Meeting Minutes',
  'Elder Storytelling Session', 'Traditional Crafts Documentation',
]

const LEGACY_PREFIXES = ['CWIS-ARCH', 'CWIS-LANG', 'CWIS-HIST', 'CWIS-CULT', 'CWIS-ORAL', 'CWIS-POLI']

function generateDocuments(count: number, inCollection: boolean): Document[] {
  const docs: Document[] = []
  const startDate = new Date('2023-01-01').getTime()
  const endDate = new Date('2026-04-30').getTime()

  for (let i = 0; i < count; i++) {
    const nameIdx = i % NAME_POOL.length
    const prefixIdx = Math.floor(i / 100) % LEGACY_PREFIXES.length
    const seqNum = String(i + 1).padStart(4, '0')

    docs.push({
      id: `doc-${inCollection ? 'in' : 'out'}-${i}`,
      name: `${NAME_POOL[nameIdx]} ${Math.floor(i / NAME_POOL.length) + 1}`,
      id_legacy: `${LEGACY_PREFIXES[prefixIdx]}-${seqNum}`,
      filesize: Math.floor(Math.random() * 9_900_000 + 100_000),
      hash_binary: null,
      hash_content: null,
      source_id: null,
      created_at: new Date(startDate + Math.random() * (endDate - startDate)),
      updated_at: new Date(),
      is_duplicate: false,
    })
  }
  return docs
}

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

export const LargeAddMode: Story = {
  args: {
    initialAction: 'add',
    loadInCollection: () => Promise.resolve(generateDocuments(500, true)),
    loadOutOfCollection: () => Promise.resolve(generateDocuments(1000, false)),
  },
}

export const LargeRemoveMode: Story = {
  args: {
    initialAction: 'remove',
    loadInCollection: () => Promise.resolve(generateDocuments(500, true)),
    loadOutOfCollection: () => Promise.resolve(generateDocuments(1000, false)),
  },
}