import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { NeedsReviewReasons } from './NeedsReviewReasons'

const meta = {
  title: 'Molecules/NeedsReviewReasons',
  component: NeedsReviewReasons,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NeedsReviewReasons>

export default meta
type Story = StoryObj<typeof meta>

export const SingleServiceSingleReason: Story = {
  args: {
    value: {
      document_splitter_1: ['Ambiguous boundary between source pages 78 and 79 (logical boundary 136)'],
    },
  },
}

export const SingleServiceMultipleReasons: Story = {
  args: {
    value: {
      document_splitter_1: [
        'Ambiguous boundary between source pages 78 and 79 (logical boundary 136)',
        'Ambiguous boundary between source pages 84 and 85 (logical boundary 142)',
      ],
    },
  },
}

export const MultipleServices: Story = {
  args: {
    value: {
      document_splitter_1: ['Ambiguous boundary between source pages 78 and 79 (logical boundary 136)'],
      page_rotator_2: ['Mixed page orientations require manual review.'],
      ocr_processor: ['OCR output confidence is too low for metadata extraction.'],
    },
  },
}

export const LegacyStringValue: Story = {
  args: {
    value: 'download failed',
  },
}

export const MalformedFallback: Story = {
  args: {
    value: {
      unexpected: { nested: true },
    },
  },
}

export const EmptyState: Story = {
  args: {
    value: null,
  },
}

export const ReadyForLibraryStaticBlockers: Story = {
  args: {
    value: {
      metadata_requirements: [
        'Required Dublin Core field dc_rights is missing.',
        'Required Dublin Core field dc_subject is missing.',
      ],
      collection_requirements: ['Document is not linked to a real collection.'],
      access_requirements: ['Access level must be set before Fedora handoff can proceed.'],
    },
  },
}

export const ReadyForLibraryStaticAndRuntimeChecks: Story = {
  args: {
    value: {
      static_readiness: [
        'Required Dublin Core field dc_rights is missing.',
        'Document is not linked to a real collection.',
      ],
      runtime_checks: [
        'Runtime ingest checks are still required before Fedora handoff can proceed.',
        'Drive or Workbench state may still block ingest at execution time.',
      ],
    },
  },
}

export const ReadyForLibraryRuntimeChecksOnly: Story = {
  args: {
    value: {
      runtime_checks: [
        'No dashboard-visible static blocker is currently recorded.',
        'Runtime ingest checks are still required before Fedora handoff can proceed.',
        'Fedora or Workbench execution may still reject this document at handoff time.',
      ],
    },
  },
}

export const ReadyForLibraryNoKnownBlockers: Story = {
  args: {
    value: null,
    emptyMessage:
      'No known dashboard-visible blockers are recorded. Runtime ingest checks are still required before Fedora handoff can proceed.',
  },
}
