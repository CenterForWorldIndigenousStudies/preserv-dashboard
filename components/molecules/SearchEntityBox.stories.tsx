import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { SearchEntityBox } from '@molecules/SearchEntityBox'

interface SearchOption {
  id: string
  name: string
  notes?: string
}

const options: SearchOption[] = [
  { id: 'batch-1', name: 'Special RCR Writings September 25 2025', notes: '12 documents' },
  { id: 'batch-2', name: 'Coastal Fisheries', notes: '8 documents' },
]

const meta = {
  title: 'Molecules/SearchEntityBox',
  component: SearchEntityBox,
  tags: ['autodocs'],
  args: {
    inputValue: 'Special',
    options,
    label: 'Search batches',
    placeholder: 'Type to search batches',
    onInputChange: fn(),
    onSelectOption: fn(),
    getOptionLabel: (option: SearchOption) => option.name,
    getOptionKey: (option: SearchOption) => option.id,
    renderOption: (option: SearchOption) => (
      <span>
        <strong>{option.name}</strong>
        {option.notes ? ` (${option.notes})` : null}
      </span>
    ),
    open: true,
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof SearchEntityBox<SearchOption>>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Loading: Story = {
  args: {
    options: [],
    loading: true,
  },
}

export const DisabledOption: Story = {
  args: {
    getOptionDisabled: (option) => (option as SearchOption).id === 'batch-2',
    helperText: 'Coastal Fisheries is unavailable in this workflow.',
  },
}

export const Error: Story = {
  args: {
    error: true,
    helperText: 'Unable to search batches right now.',
  },
}

export const EmptyFreeText: Story = {
  args: {
    inputValue: 'New batch name',
    options: [],
    helperText: 'You can enter a new value.',
  },
}
