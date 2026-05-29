import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SourceId } from './SourceId'

const meta = {
  title: 'Atoms/SourceId',
  component: SourceId,
  tags: ['autodocs'],
  args: {
    value: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    maxTruncationLength: 0,
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'A Google Drive file ID, plain text fallback, or empty value.',
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
} satisfies Meta<typeof SourceId>

export default meta
type Story = StoryObj<typeof meta>

export const GoogleDriveLink: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Renders a Google Drive link when the value looks like a Drive file ID.',
      },
    },
  },
}

export const PreservationDocumentLink: Story = {
  args: {
    value: '550e8400-e29b-41d4-a716-446655440000',
  },
  parameters: {
    docs: {
      description: {
        story: 'Renders a preservation document link when the value looks like a preservation document ID (UUID).',
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
