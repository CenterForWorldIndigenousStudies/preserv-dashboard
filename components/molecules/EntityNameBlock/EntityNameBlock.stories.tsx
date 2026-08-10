import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Badge } from '@atoms/Badges/Badge'
import { DOCUMENTS_PATH } from '@constants/paths'
import { EntityNameBlock } from './EntityNameBlock'

const meta = {
  title: 'Molecules/EntityNameBlock',
  component: EntityNameBlock,
  tags: ['autodocs'],
  args: {
    name: 'Annual Report 2023',
    id: 'abc12345-6789-def0-1234-567890abcdef',
    legacyId: 'AR-2023-001',
    sourceId: '1ABC123XYZ',
  },
  argTypes: {
    name: { control: 'text' },
    id: { control: 'text' },
    legacyId: { control: 'text' },
    sourceId: { control: 'text' },
    fallbackName: { control: 'text' },
    href: { control: 'text' },
    maxTruncationLength: { control: 'number' },
  },
  parameters: {
    backgrounds: {
      default: 'sand',
    },
  },
} satisfies Meta<typeof EntityNameBlock>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  name: 'Default (all fields)',
  parameters: {
    docs: {
      description: {
        story: 'All fields populated: name, id, legacyId, and sourceId.',
      },
    },
  },
}

export const WithStatusContent: Story = {
  args: {
    badges: (
      <Badge variant={'success'} outlined>
        {'Canonical'}
      </Badge>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Optional status content can be displayed beside the entity name.',
      },
    },
  },
}

export const WithLongLegacyId: Story = {
  name: 'With long legacy ID',
  args: {
    name: 'Quarterly Review Q4 2023',
    id: 'abc12345-6789-def0-1234-567890abcdef',
    legacyId: 'AR-VERY-LONG-LEGACY-ID-THAT-EXCEEDS-TWENTY-CHARS',
    sourceId: null,
  },
  parameters: {
    docs: {
      description: {
        story:
          'The legacy ID is longer than 20 characters and will be truncated with an ellipsis. Hover to see the full value in a tooltip.',
      },
    },
  },
}

export const WithLongSourceId: Story = {
  name: 'With long source ID',
  args: {
    name: 'Meeting Notes January',
    id: '1a2B3c4D5e6F7g8H9I0J',
    legacyId: null,
    sourceId: 'this_source_id_is_also_very_long_and_will_be_truncated',
  },
  parameters: {
    docs: {
      description: {
        story:
          'The source ID is longer than 20 characters and will be truncated with an ellipsis. Hover to see the full value in a tooltip.',
      },
    },
  },
}

export const Untitled: Story = {
  args: {
    name: null,
    id: 'abc12345-6789-def0-1234-567890abcdef',
    legacyId: 'LEG-001',
    sourceId: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'When name is null, renders "Untitled document" in text.primary (not moss green).',
      },
    },
  },
}

export const UntitledBatch: Story = {
  args: {
    name: null,
    id: '12345678-90ab-cdef-1234-567890abcdef',
    fallbackName: 'Untitled batch',
    legacyId: 'BATCH-001',
    sourceId: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'The fallback name can be customized for another named entity such as a batch.',
      },
    },
  },
}

export const NoSecondaryIds: Story = {
  name: 'No secondary IDs',
  args: {
    name: 'Project Proposal',
    id: 'f0e1d2c3-b4a5-6789-abcd-ef0123456789',
    legacyId: null,
    sourceId: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Only the document name and short ID are shown when no legacy or source ID is present.',
      },
    },
  },
}

export const AsPlainText: Story = {
  name: 'As plain text (no href)',
  args: {
    name: 'Budget Spreadsheet 2024',
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    legacyId: 'BUD-2024',
    sourceId: null,
    href: undefined,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When href is not provided, the name renders as a Typography component (plain text) instead of a clickable MUI Link.',
      },
    },
  },
}

export const WithShortId: Story = {
  name: 'With short ID (8 chars)',
  args: {
    name: 'Invoice 2024-03',
    id: 'abc12345',
    legacyId: null,
    sourceId: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Short IDs (8 characters or fewer) display in full without truncation.',
      },
    },
  },
}

export const WithHref: Story = {
  name: 'With href (clickable)',
  args: {
    name: 'Strategic Plan 2025',
    id: 'doc-2025-strat-plan-001',
    legacyId: 'SP-2025',
    sourceId: 'drive_abc123',
    href: `${DOCUMENTS_PATH}/doc-2025-strat-plan-001`,
  },
  parameters: {
    docs: {
      description: {
        story:
          'When href is provided, the name renders as a MUI Link with hover underline and navigates to the specified path.',
      },
    },
  },
}
