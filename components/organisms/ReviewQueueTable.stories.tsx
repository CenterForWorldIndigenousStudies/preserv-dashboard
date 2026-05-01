import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import type { ReviewQueueItem } from '@lib/types'

import { ReviewQueueTable } from './ReviewQueueTable'

const UUIDS = {
  doc1: '00000001-0001-0001-0001-000000000001',
  doc2: '00000002-0002-0002-0002-000000000002',
  doc3: '00000003-0003-0003-0003-000000000003',
  doc4: '00000004-0004-0004-0004-000000000004',
} as const

const meta = {
  component: ReviewQueueTable,
  tags: ['autodocs'],
} satisfies Meta<typeof ReviewQueueTable>

export default meta
type Story = StoryObj<typeof meta>

const sampleItems: ReviewQueueItem[] = [
  {
    id: UUIDS.doc1,
    name: 'Miskito-Sumo-Rama Conflict Analysis',
    validation_status: 'NEEDS_REVIEW',
    validation_type: 'METADATA_ISSUES',
    validator_name: 'Maria Gonzalez',
    validator_email: 'mgonzalez@cwis.org',
    needs_review: true,
    sensitive: false,
  },
  {
    id: UUIDS.doc2,
    name: 'Nicaraguan War: Peace Negotiations Document',
    validation_status: 'FORMAT_ERRORS',
    validation_type: 'FORMAT',
    validator_name: 'John Smith',
    validator_email: 'jsmith@cwis.org',
    needs_review: true,
    sensitive: true,
  },
  {
    id: UUIDS.doc3,
    name: 'First Nations in Canada: Regional Overview',
    validation_status: 'APPROVED',
    validation_type: 'MANUAL',
    validator_name: null,
    validator_email: null,
    needs_review: false,
    sensitive: false,
  },
  {
    id: UUIDS.doc4,
    name: null,
    validation_status: 'NEEDS_REVIEW',
    validation_type: 'METADATA_ISSUES',
    validator_name: 'Jane Doe',
    validator_email: 'jdoe@cwis.org',
    needs_review: true,
    sensitive: false,
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

export const ManyNeedsReview: Story = {
  args: {
    initialData: {
      items: [
        ...sampleItems,
        {
          id: '00000005-0005-0005-0005-000000000005',
          name: 'Another Document Requiring Review',
          validation_status: 'NEEDS_REVIEW',
          validation_type: 'GENERAL_ERRORS',
          validator_name: 'Test Validator',
          validator_email: 'test@cwis.org',
          needs_review: true,
          sensitive: false,
        },
      ],
      total: 5,
    },
  },
}