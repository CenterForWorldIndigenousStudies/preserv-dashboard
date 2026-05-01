import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { ReadyForLibraryItem } from '@lib/types'

import { ReadyForLibraryTable } from './ReadyForLibraryTable'

const UUIDS = {
  doc1: '00000001-0001-0001-0001-000000000001',
  doc2: '00000002-0002-0002-0002-000000000002',
  doc3: '00000003-0003-0003-0003-000000000003',
  doc4: '00000004-0004-0004-0004-000000000004',
} as const

const meta = {
  component: ReadyForLibraryTable,
  tags: ['autodocs'],
} satisfies Meta<typeof ReadyForLibraryTable>

export default meta
type Story = StoryObj<typeof meta>

const sampleItems: ReadyForLibraryItem[] = [
  {
    id: UUIDS.doc1,
    name: 'Miskito-Sumo-Rama Conflict Analysis',
    validation_status: 'APPROVED',
    validation_timestamp: '2026-04-28T10:00:00Z',
    metadata_complete: true,
  },
  {
    id: UUIDS.doc2,
    name: 'Nicaragua: A History of Indigenous Resistance',
    validation_status: 'APPROVED',
    validation_timestamp: '2026-04-27T15:30:00Z',
    metadata_complete: true,
  },
  {
    id: UUIDS.doc3,
    name: null,
    validation_status: 'APPROVED',
    validation_timestamp: '2026-04-26T09:15:00Z',
    metadata_complete: false,
  },
  {
    id: UUIDS.doc4,
    name: 'First Nations in Canada: Regional Overview',
    validation_status: 'APPROVED',
    validation_timestamp: '2026-04-25T14:00:00Z',
    metadata_complete: true,
  },
]

export const Default: Story = {
  args: {
    initialData: {
      items: sampleItems,
      total: sampleItems.length,
    },
  },
}

export const Empty: Story = {
  args: {
    initialData: {
      items: [],
      total: 0,
    },
  },
}

export const SomeIncomplete: Story = {
  args: {
    initialData: {
      items: [
        ...sampleItems,
        {
          id: '00000005-0005-0005-0005-000000000005',
          name: 'Incomplete Metadata Document',
          validation_status: 'APPROVED',
          validation_timestamp: '2026-04-24T11:00:00Z',
          metadata_complete: false,
        },
      ],
      total: 5,
    },
  },
}