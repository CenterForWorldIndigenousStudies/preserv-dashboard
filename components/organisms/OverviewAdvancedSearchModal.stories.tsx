import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { OverviewAdvancedSearchFilters, OverviewFilterOptions } from '@lib/overview-search'

import { OverviewAdvancedSearchModal } from './OverviewAdvancedSearchModal'

const defaultFilters: OverviewAdvancedSearchFilters = {
  author: '',
  statuses: [],
  documentType: 'all',
  batch: '',
  createdFrom: '',
  createdTo: '',
  collection: '',
  accessLevel: undefined,
}

const defaultFilterOptions: OverviewFilterOptions = {
  collections: [
    'Nicaragua Conflict Documentation',
    'First Nations Canada',
    'Indigenous Health Conference',
  ],
  accessLevels: ['open access', 'restricted', 'internal', 'confidential'],
}

const meta: Meta<typeof OverviewAdvancedSearchModal> = {
  component: OverviewAdvancedSearchModal,
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
      statuses: ['under_review', 'approved'],
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
    },
  },
}