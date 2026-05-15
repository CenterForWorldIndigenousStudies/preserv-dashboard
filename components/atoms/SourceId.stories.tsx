import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SourceId } from './SourceId'

const meta = {
  title: 'Atoms/SourceId',
  component: SourceId,
  tags: ['autodocs'],
  args: {
    value: '1poTSVemTJceJNCqWlhzNuUnrO4oX21Dy',
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'A Google Drive file ID, plain text fallback, or empty value.',
    },
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof SourceId>

export default meta
type Story = StoryObj<typeof meta>

export const GoogleDriveLink: Story = {
  args: {
    value: '1poTSVemTJceJNCqWlhzNuUnrO4oX21Dy',
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders a Google Drive link when the value looks like a Drive file ID.',
      },
    },
  },
}

export const PlainTextFallback: Story = {
  args: {
    value: 'not-a-google-drive-id',
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders plain text when the value does not look like a Google Drive file ID.',
      },
    },
  },
}

export const EmptyValue: Story = {
  args: {
    value: '',
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders a dash when the value is null, undefined, or empty.',
      },
    },
  },
}

export const NullValue: Story = {
  args: {
    value: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders a dash when the value is null, undefined, or empty.',
      },
    },
  },
}
