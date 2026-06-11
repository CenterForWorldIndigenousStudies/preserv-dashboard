import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SourceFolderId } from './SourceFolderId'

const meta = {
  title: 'Atoms/SourceFolderId',
  component: SourceFolderId,
  tags: ['autodocs'],
  args: {
    value: '1ZdR3L5sY2q8uVf9X0aB6cDEfGhIjKlmN',
    maxTruncationLength: 0,
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'A Google Drive folder ID, plain text fallback, or empty value.',
    },
    maxTruncationLength: {
      control: 'number',
      description:
        'Maximum length of the displayed value before truncation. Set to 0 or leave undefined for no truncation.',
    },
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof SourceFolderId>

export default meta
type Story = StoryObj<typeof meta>

export const GoogleDriveLink: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Renders a Google Drive link when the value looks like a Drive folder ID.',
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
        story: 'Renders plain text when the value does not look like a Google Drive folder ID.',
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
