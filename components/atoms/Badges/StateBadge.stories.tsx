import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { StateBadge, stateVariantMap } from '@atoms/Badges/StateBadge'

const states = [...Object.keys(stateVariantMap), 'ingested', 'normalized', 'pending']
const meta = {
  title: 'Atoms/Badges/StateBadge',
  component: StateBadge,
  tags: ['autodocs'],
  argTypes: {
    state: {
      control: 'select',
      options: states,
      description: 'Document pipeline state string',
    },
    className: { control: 'text' },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof StateBadge>

export default meta
type Story = StoryObj<typeof meta>

export const DefaultStateBadge: Story = {
  args: {},
}

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {states.map((state, index) => (
        <StateBadge key={`${state}-${index}`} state={state} />
      ))}
    </div>
  ),
}
