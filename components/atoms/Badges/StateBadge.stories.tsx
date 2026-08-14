import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Stack } from '@mui/material'
import { StateBadge } from '@atoms/Badges/StateBadge'
import { DOCUMENT_STATES } from '@constants/documentStates'

const states = [...new Set([...Object.values(DOCUMENT_STATES), 'pending'])]
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
    <Stack direction={'row'} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      {states.map((state, index) => (
        <StateBadge key={`${state}-${index}`} state={state} />
      ))}
    </Stack>
  ),
}
