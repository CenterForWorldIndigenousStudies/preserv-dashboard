import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { DetailFieldGrid } from './DetailFieldGrid'

const meta = {
  title: 'Molecules/DetailFieldGrid',
  component: DetailFieldGrid,
  tags: ['autodocs'],
} satisfies Meta<typeof DetailFieldGrid>

export default meta
type Story = StoryObj<typeof meta>

export const ResponsiveCards: Story = {
  args: {
    fields: [
      { key: 'group', label: 'Version Group', value: 'version-group-1' },
      { key: 'summary', label: 'Changes Summary', value: 'Updated metadata' },
      { key: 'notes', label: 'Notes', value: 'Reviewed by the preservation team.' },
      { key: 'similarity', label: 'Similarity', value: '0.98' },
      { key: 'analyzed-at', label: 'Analyzed At', value: '2026-09-05 12:00 UTC' },
    ],
  },
}
