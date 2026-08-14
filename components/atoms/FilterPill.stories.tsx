import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Stack } from '@mui/material'
import { FilterPill } from '@atoms/FilterPill'
import { DOCUMENTS_PATH } from '@constants/paths'

const meta = {
  title: 'Atoms/FilterPill',
  component: FilterPill,
  tags: ['autodocs'],
  args: {
    isActive: false,
    href: DOCUMENTS_PATH,
    label: 'Filter',
  },
  argTypes: {
    label: { control: 'text' },
    isActive: { control: 'boolean' },
    href: { control: 'text' },
    className: { control: 'text' },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof FilterPill>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Default FilterPill',
  args: {},
}

export const AllFilters: Story = {
  argTypes: {
    label: { control: false },
    isActive: { control: false },
    href: { control: false },
    className: { control: false },
  },
  render: () => (
    <Stack direction={'row'} spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
      <FilterPill label={'All'} isActive={true} href={DOCUMENTS_PATH} />
      <FilterPill label={'Completed'} isActive={false} href={`${DOCUMENTS_PATH}?state=completed`} />
      <FilterPill label={'Failed'} isActive={false} href={`${DOCUMENTS_PATH}?state=failed`} />
      <FilterPill label={'Needs Review'} isActive={false} href={`${DOCUMENTS_PATH}?state=needs_review`} />
    </Stack>
  ),
}
