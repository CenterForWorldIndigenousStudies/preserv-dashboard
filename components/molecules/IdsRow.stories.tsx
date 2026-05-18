import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { IdsRow } from './IdsRow'

const meta = {
  title: 'Molecules/IdsRow',
  component: IdsRow,
  tags: ['autodocs'],
  args: {
    id: 'fd14a84b-72fa-4bba-83cf-340fc0790950',
    legacyId: '42',
    maxTruncationLength: 12,
    sourceId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  },
  argTypes: {
    id: {
      control: 'text',
      description: 'The Document UUID',
    },
    legacyId: {
      control: 'text',
      description: 'Optional legacy ID to display alongside the document name',
    },
    maxTruncationLength: {
      control: 'number',
      description: 'Maximum character length before truncating secondary IDs (default: 12)'
    },
    sourceId: {
      control: 'text',
      description: 'Optional source ID to display alongside the document name'
    }
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof IdsRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Renders a row of Ids',
      },
    },
  },
}
