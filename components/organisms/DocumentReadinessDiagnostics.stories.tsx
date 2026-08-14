import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentReadinessDiagnostics } from '@organisms/DocumentReadinessDiagnostics'

const meta = {
  title: 'Organisms/DocumentReadinessDiagnostics',
  component: DocumentReadinessDiagnostics,
  tags: ['autodocs'],
} satisfies Meta<typeof DocumentReadinessDiagnostics>

export default meta
type Story = StoryObj<typeof meta>

export const NeedsReview: Story = {
  args: {
    readiness: {
      isPreservationCandidate: true,
      approved: false,
      unmetRequirements: ['dc_subject', 'access_level'],
      reasonGroups: [
        {
          serviceKey: 'readiness',
          serviceLabel: 'Readiness',
          reasons: ['Missing required metadata: dc_subject.', 'At least one access level is required.'],
        },
      ],
    },
    activeReviewReasons: [
      {
        serviceKey: 'readiness',
        serviceLabel: 'Readiness',
        reasons: ['Missing required metadata: dc_subject.', 'At least one access level is required.'],
      },
    ],
  },
}

export const Ready: Story = {
  args: {
    readiness: {
      isPreservationCandidate: true,
      approved: true,
      unmetRequirements: [],
      reasonGroups: [],
    },
  },
}
