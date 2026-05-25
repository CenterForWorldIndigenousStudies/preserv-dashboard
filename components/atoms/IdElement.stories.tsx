import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { IdElement } from './IdElement'

const meta = {
  title: 'Atoms/IdElement',
  component: IdElement,
  tags: ['autodocs'],
  args: {
    id: 'fd14a84b-72fa-4bba-83cf-340fc0790950',
    label: 'DB ID',
    title: 'The ID of the Document',
  },
  argTypes: {
    id: {
      control: 'text',
      description: 'The Document UUID',
    },
    label: {
      control: 'text',
      description: 'The label for the ID',
    },
    title: {
      control: 'text',
      description: 'The optional tooltip',
    },
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof IdElement>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Renders an ID element',
      },
    },
  },
}
