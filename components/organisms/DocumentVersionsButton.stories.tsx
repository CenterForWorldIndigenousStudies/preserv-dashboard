import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { VersionFamily, VersionFamilyDocument } from '@lib/types'

import { DocumentVersionsButton } from './DocumentVersionsButton'

const docId = (n: number) => `0000000${n}-000${n}-000${n}-000${n}-00000000000${n}`

const meta = {
  component: DocumentVersionsButton,
  tags: ['autodocs'],
} satisfies Meta<typeof DocumentVersionsButton>

export default meta
type Story = StoryObj<typeof meta>

const makeDoc = (n: number, name: string, isCanonical: boolean, isDup: boolean): VersionFamilyDocument => ({
  id: docId(n),
  name,
  id_legacy: `CWIS-2024-${String(n).padStart(3, '0')}`,
  filesize: 1024 * 1024 * n,
  source_id: null,
  hash_binary: `binary-${n}`,
  hash_content: `content-${n}`,
  is_duplicate: isDup,
  is_canonical: isCanonical,
  created_at: `2026-0${n % 4 + 1}-${String(n % 28 + 1).padStart(2, '0')}T09:00:00Z`,
  updated_at: `2026-0${n % 4 + 1}-${String(n % 28 + 1).padStart(2, '0')}T14:00:00Z`,
})

const canonicalFamily: VersionFamily = {
  version_group_id: 'vg-001',
  canonical_document_id: docId(1),
  documents: [
    makeDoc(1, 'Nicaragua: A History', true, false),
    makeDoc(2, 'Nicaragua: A History', false, true),
    makeDoc(3, 'Nicaragua: A History (revised)', false, false),
  ],
}

const singleDocFamily: VersionFamily = {
  version_group_id: 'vg-002',
  canonical_document_id: docId(4),
  documents: [makeDoc(4, 'First Nations Overview', true, false)],
}

export const Default: Story = {
  args: {
    versionFamily: canonicalFamily,
  },
}

export const SingleDocument: Story = {
  args: {
    versionFamily: singleDocFamily,
  },
}

export const ManyDuplicates: Story = {
  args: {
    versionFamily: {
      version_group_id: 'vg-003',
      canonical_document_id: docId(5),
      documents: [
        makeDoc(5, 'Indigenous Peoples Overview', true, false),
        makeDoc(6, 'Indigenous Peoples Overview', false, true),
        makeDoc(7, 'Indigenous Peoples Overview', false, true),
        makeDoc(8, 'Indigenous Peoples Overview', false, true),
      ],
    },
  },
}