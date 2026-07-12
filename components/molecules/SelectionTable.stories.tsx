import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useState } from 'react'
import type { Document } from 'types/documents'

import {
  SelectionTable,
  sortDocuments,
  filterDocuments,
  DEFAULT_SELECTION_SORT,
  type SelectionSortState,
} from './SelectionTable'

const UUIDS = {
  doc1: '00000001-0001-0001-0001-000000000001',
  doc2: '00000002-0002-0002-0002-000000000002',
  doc3: '00000003-0003-0003-0003-000000000003',
  doc4: '00000004-0004-0004-0004-000000000004',
} as const

const sampleDocuments: Document[] = [
  {
    id: UUIDS.doc1,
    name: 'Miskito-Sumo-Rama Conflict Analysis',
    id_legacy: 'CWIS-2026-001',
    filesize: 1048576,
    created_at: '2026-04-01T09:00:00Z',
    updated_at: '2026-04-15T14:30:00Z',
    source_id: null,
    hash_binary: null,
    hash_content: null,
    is_duplicate: false,
  },
  {
    id: UUIDS.doc2,
    name: 'Nicaragua Peace Negotiations Document',
    id_legacy: 'CWIS-2026-002',
    filesize: 524288,
    created_at: '2026-03-28T10:00:00Z',
    updated_at: '2026-04-10T16:00:00Z',
    source_id: null,
    hash_binary: null,
    hash_content: null,
    is_duplicate: false,
  },
  {
    id: UUIDS.doc3,
    name: 'First Nations in Canada Regional Overview',
    id_legacy: 'CWIS-2026-003',
    filesize: 2097152,
    created_at: '2026-02-15T08:00:00Z',
    updated_at: '2026-03-01T12:00:00Z',
    source_id: null,
    hash_binary: null,
    hash_content: null,
    is_duplicate: false,
  },
  {
    id: UUIDS.doc4,
    name: null,
    id_legacy: 'CWIS-2026-004',
    filesize: 0,
    created_at: '2026-01-10T11:00:00Z',
    updated_at: '2026-01-10T11:00:00Z',
    source_id: null,
    hash_binary: null,
    hash_content: null,
    is_duplicate: false,
  },
]

function InteractiveWrapper(args: {
  documents: Document[]
  title: string
  searchLabel: string
  emptyMessage?: string
}) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SelectionSortState>(DEFAULT_SELECTION_SORT)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  return (
    <Stack spacing={2}>
      <SelectionTable
        {...args}
        documents={args.documents}
        searchValue={search}
        onSearchChange={setSearch}
        sortState={sort}
        onSortChange={(field) =>
          setSort({ field, direction: field === sort.field && sort.direction === 'asc' ? 'desc' : 'asc' })
        }
        isChecked={(id) => checked.has(id)}
        onToggle={(id, val) => {
          setChecked((prev) => {
            const next = new Set(prev)
            if (val) next.add(id)
            else next.delete(id)
            return next
          })
        }}
      />
      <Typography variant="body2" color="text.primary">
        Selected: {checked.size} document{checked.size !== 1 ? 's' : ''}
      </Typography>
    </Stack>
  )
}

const meta: Meta<typeof SelectionTable> = {
  title: 'Molecules/SelectionTable',
  component: SelectionTable,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SelectionTable>

export const Default: Story = {
  render: () => (
    <InteractiveWrapper
      documents={sampleDocuments}
      title="Documents in Collection"
      searchLabel="Search documents in collection"
    />
  ),
}

export const Empty: Story = {
  render: () => (
    <InteractiveWrapper
      documents={[]}
      title="Documents in Collection"
      searchLabel="Search documents in collection"
      emptyMessage="No documents in this collection."
    />
  ),
}

export const PreSelected: Story = {
  render: () => (
    <InteractiveWrapper
      documents={sampleDocuments}
      title="Documents in Collection"
      searchLabel="Search documents in collection"
    />
  ),
}

export const SortedBySizeDesc: Story = {
  render: () => {
    const sortedDocs = sortDocuments(sampleDocuments, { field: 'filesize', direction: 'desc' })
    return (
      <InteractiveWrapper
        documents={sortedDocs}
        title="Documents by Size (Largest First)"
        searchLabel="Filter by name or legacy ID"
      />
    )
  },
}

export const FilteredSearch: Story = {
  render: () => {
    const filtered = filterDocuments(sampleDocuments, 'nicaragua')
    return (
      <InteractiveWrapper
        documents={filtered}
        title="Search: Nicaragua"
        searchLabel="Search documents in collection"
        emptyMessage="No documents match your search."
      />
    )
  },
}
