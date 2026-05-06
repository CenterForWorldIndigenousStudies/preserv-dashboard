import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TagSearchCombobox } from '@molecules/TagSearchCombobox'

const DISABLED_TAG_ID = 'disabled-tag-id'

const meta = {
  title: 'Molecules/TagSearchCombobox',
  component: TagSearchCombobox,
  tags: ['autodocs'],
  args: {
    open: true,
    value: 'Cherokee',
    onSelectExisting: () => Promise.resolve(),
    onSelectCreate: () => undefined,
  },
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof TagSearchCombobox>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithDisabledOptions: Story = {
  args: {
    getOptionDisabled: (tag) => tag.id === DISABLED_TAG_ID,
    getOptionHelperText: (tag) => (tag.id === DISABLED_TAG_ID ? 'Already a collection' : null),
  },
}
