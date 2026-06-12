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
