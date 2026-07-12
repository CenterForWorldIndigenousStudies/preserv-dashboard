import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { AdvancedSearchFilters, FilterOptions } from '@lib/search'

import { AdvancedSearchModal } from './AdvancedSearchModal'

const defaultFilters: AdvancedSearchFilters = {
  author: '',
  statuses: [],
  documentType: 'all',
  batch: '',
  createdFrom: '',
  createdTo: '',
  collection: '',
  accessLevel: undefined,
}

const defaultFilterOptions: FilterOptions = {
  collections: ['Nicaragua Conflict Documentation', 'First Nations Canada', 'Indigenous Health Conference'],
  accessLevels: ['open access', 'restricted', 'internal', 'confidential'],
  statuses: ['APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'VALIDATED'],
}

const meta: Meta<typeof AdvancedSearchModal> = {
  component: AdvancedSearchModal,
  tags: ['autodocs'],
  args: {
    filters: defaultFilters,
    filterOptions: defaultFilterOptions,
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithActiveFilters: Story = {
  args: {
    filters: {
      author: 'Maria Gonzalez',
      statuses: ['NEEDS_REVIEW', 'APPROVED'],
      documentType: 'unique',
      batch: 'BATCH-2026-04',
      createdFrom: '2026-01-01',
      createdTo: '2026-04-30',
      collection: 'First Nations Canada',
      accessLevel: 'restricted',
    },
    filterOptions: defaultFilterOptions,
  },
}

export const NoCollections: Story = {
  args: {
    filters: defaultFilters,
    filterOptions: {
      collections: [],
      accessLevels: ['open access', 'restricted'],
      statuses: ['APPROVED', 'NEEDS_REVIEW'],
    },
  },
}
