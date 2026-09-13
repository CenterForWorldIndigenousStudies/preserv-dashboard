import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DocumentCommentsSection } from '@organisms/DocumentCommentsSection'
import type { DocumentDetail } from 'types/documents'
import type { MetadataField } from 'types/metadata'

const meta = {
  title: 'Organisms/DocumentCommentsSection',
  component: DocumentCommentsSection,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    metadata: [
      {
        name: 'comments_additional',
        value: JSON.stringify({ value: 'Additional review context.' }),
        value_type: 'string',
        notes: null,
      },
      {
        name: 'comments_control',
        value: JSON.stringify({ value: 'Control notes for the reviewer.' }),
        value_type: 'string',
        notes: null,
      },
      {
        name: 'comments_general',
        value: JSON.stringify({ value: 'General preservation note.' }),
        value_type: 'string',
        notes: null,
      },
      {
        name: 'comment_validation',
        value: JSON.stringify({ value: 'Validation requires follow-up.' }),
        value_type: 'string',
        notes: null,
      },
      {
        name: 'comment_validation_additional',
        value: JSON.stringify({ value: 'Additional validation detail.' }),
        value_type: 'string',
        notes: null,
      },
    ] satisfies MetadataField[],
    quality: {
      comment: 'Quality review comment.',
      comment_additional: 'Additional quality review comment.',
    } as DocumentDetail['quality'],
  },
} satisfies Meta<typeof DocumentCommentsSection>

export default meta
type Story = StoryObj<typeof meta>

export const WithComments: Story = {}

export const EmptyComments: Story = {
  args: { metadata: [], quality: null },
}
