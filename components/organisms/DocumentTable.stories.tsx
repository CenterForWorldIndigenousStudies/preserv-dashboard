import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { DocumentTable } from '@organisms/DocumentTable'
import type { Document } from '@lib/types'

const meta: Meta<typeof DocumentTable> = {
  title: 'Organisms/DocumentTable',
  component: DocumentTable,
  tags: ['autodocs'],
  argTypes: {
    documents: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
}

export default meta
type Story = StoryObj<typeof DocumentTable>

const mockDocuments: Document[] = [
  {
    id: 'DOC-2024-0018',
    name: 'cherokee-phonetics-session042.pdf',
    filesize: 2456000,
    hash_binary: 'abc123',
    hash_content: 'def456',
    id_legacy: 'LEG-001',
    created_at: '2024-11-04T14:22:11Z',
    updated_at: '2024-11-04T16:30:00Z',
  },
  {
    id: 'DOC-2024-0031',
    name: 'tribal-council-minutes-2023-Q1.pdf',
    filesize: 890000,
    hash_binary: 'ghi789',
    hash_content: 'jkl012',
    id_legacy: 'LEG-002',
    created_at: '2024-11-05T09:15:33Z',
    updated_at: '2024-11-05T10:00:00Z',
  },
  {
    id: 'DOC-2024-0037',
    name: 'cultural-ceremony-archive-archive.mp3',
    filesize: 142000000,
    hash_binary: 'mno345',
    hash_content: 'pqr678',
    id_legacy: 'LEG-003',
    created_at: '2024-11-06T11:05:00Z',
    updated_at: null,
  },
  {
    id: 'DOC-2024-0042',
    name: 'indigenous-land-map-1920.jpg',
    filesize: 4500000,
    hash_binary: 'stu901',
    hash_content: 'vwx234',
    id_legacy: 'LEG-004',
    created_at: '2024-11-06T15:30:00Z',
    updated_at: '2024-11-06T15:30:00Z',
  },
  {
    id: 'DOC-2024-0049',
    name: 'traditional-medicine-notes.docx',
    filesize: 220000,
    hash_binary: 'yza567',
    hash_content: 'bcd890',
    id_legacy: 'LEG-005',
    created_at: '2024-11-07T08:45:22Z',
    updated_at: '2024-11-07T08:45:22Z',
  },
]

export const Default: Story = {
  args: {
    documents: mockDocuments,
  },
}

export const SingleRow: Story = {
  args: {
    documents: [mockDocuments[0]],
  },
}

export const Empty: Story = {
  args: {
    documents: [],
  },
}
