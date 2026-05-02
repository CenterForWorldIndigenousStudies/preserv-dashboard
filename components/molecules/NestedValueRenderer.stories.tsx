import type { Meta, StoryObj } from '@storybook/react'
import { NestedValueRenderer } from './NestedValueRenderer'

const meta = {
  title: 'DesignSystem/Molecules/NestedValueRenderer',
  component: NestedValueRenderer,
  tags: ['autodocs'],
} satisfies Meta<typeof NestedValueRenderer>

export default meta
type Story = StoryObj<typeof meta>

export const PrimitiveString: Story = {
  args: {
    value: 'hello world',
  },
}

export const PrimitiveNumber: Story = {
  args: {
    value: 42,
  },
}

export const EmptyArray: Story = {
  args: {
    value: [],
  },
}

export const SimpleArray: Story = {
  args: {
    value: ['alpha', 'beta', 'gamma'],
  },
}

export const MixedArray: Story = {
  args: {
    value: ['alpha', 2, true, { nested: 'object' }],
  },
}

export const EmptyObject: Story = {
  args: {
    value: {},
  },
}

export const FlatObject: Story = {
  args: {
    value: {
      batch_id: 'abc123',
      batch_name: 'Nicaragua Batch',
      status: 'complete',
      file_count: 47,
    },
  },
}

export const NestedObject: Story = {
  args: {
    value: {
      config: {
        timeout: 30,
        retryCount: 3,
        endpoints: ['https://api1.com', 'https://api2.com'],
      },
      metadata: {
        createdAt: '2026-04-01T10:00:00Z',
        author: 'system',
      },
    },
  },
}

export const DeepNesting: Story = {
  args: {
    value: {
      level1: {
        level2: {
          level3: {
            level4: {
              level5: 'deep value',
            },
          },
        },
      },
    },
    maxDepth: 6,
  },
}

export const BatchMetadataStyle: Story = {
  args: {
    value: {
      started_at: '2026-04-28T14:23:00Z',
      completed_at: '2026-04-28T14:31:00Z',
      processing_time_ms: 482000,
      files_total: 23,
      files_success: 22,
      files_with_errors: 1,
      error_files: ['doc-004.pdf'],
    },
  },
}
