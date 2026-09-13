import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { GENERATED_DOCUMENT_STATES } from '@constants/generated/documentStates'

import { StatusPill } from './StatusPill'

const meta = {
  title: 'Atoms/Badges/StatusPill',
  component: StatusPill,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: [...Object.values(GENERATED_DOCUMENT_STATES), 'pending'],
    },
  },
} satisfies Meta<typeof StatusPill>

export default meta
type Story = StoryObj<typeof meta>

export const NeedsReview: Story = {
  args: {
    status: 'NEEDS_REVIEW',
  },
}

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {Object.values(GENERATED_DOCUMENT_STATES).map((state) => (
        <StatusPill key={state} status={state} />
      ))}
    </div>
  ),
}
