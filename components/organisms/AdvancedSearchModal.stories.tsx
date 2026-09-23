import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ACCESS_LEVEL_OPTIONS } from '@constants/accessLevels'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { VALIDATION_STATUSES, VALIDATION_STATUS_OPTIONS } from '@constants/validationStatuses'
import { DOCUMENT_TYPE_OPTIONS, type AdvancedSearchFilters, type FilterOptions } from '@lib/search'

import { AdvancedSearchModal } from './AdvancedSearchModal'

const defaultFilters: AdvancedSearchFilters = {
  contributor: '',
  publisher: '',
  statuses: [],
  lifecycleStatuses: [],
  documentType: DOCUMENT_TYPE_OPTIONS[0],
  batch: '',
  createdFrom: '',
  createdTo: '',
  collection: '',
  accessLevel: undefined,
}

const defaultFilterOptions: FilterOptions = {
  collections: ['Nicaragua Conflict Documentation', 'First Nations Canada', 'Indigenous Health Conference'],
  accessLevels: [...ACCESS_LEVEL_OPTIONS],
  statuses: [...VALIDATION_STATUS_OPTIONS],
  lifecycleStatuses: Object.values(GENERATED_BATCH_LIFECYCLE_STATUSES),
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
      contributor: 'Maria Gonzalez',
      publisher: 'Example Press',
      statuses: [VALIDATION_STATUSES.NEEDS_REVIEW, VALIDATION_STATUSES.APPROVED],
      lifecycleStatuses: [GENERATED_BATCH_LIFECYCLE_STATUSES.FAILED],
      documentType: DOCUMENT_TYPE_OPTIONS[1],
      batch: 'BATCH-2026-04',
      createdFrom: '2026-01-01',
      createdTo: '2026-04-30',
      collection: 'First Nations Canada',
      accessLevel: ACCESS_LEVEL_OPTIONS[1],
    },
    filterOptions: defaultFilterOptions,
  },
}

export const NoCollections: Story = {
  args: {
    filters: defaultFilters,
    filterOptions: {
      collections: [],
      accessLevels: [...ACCESS_LEVEL_OPTIONS],
      statuses: [VALIDATION_STATUSES.APPROVED, VALIDATION_STATUSES.NEEDS_REVIEW],
    },
  },
}
