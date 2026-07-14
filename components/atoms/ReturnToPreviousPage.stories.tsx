import Box from '@mui/material/Box'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { ReturnToPreviousPage } from './ReturnToPreviousPage'
import { DOCUMENTS_PATH, REVIEW_QUEUE_PATH } from '@constants/paths'

const meta = {
  title: 'Atoms/ReturnToPreviousPage',
  component: ReturnToPreviousPage,
  tags: ['autodocs'],
  args: {
    href: `${DOCUMENTS_PATH}?page=2&pageSize=25`,
    label: 'Return to documents',
  },
  argTypes: {
    href: {
      control: 'text',
      description: 'Internal path and query string for the page that opened the current view',
    },
    label: {
      control: 'text',
      description: 'Visible return action label',
    },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (Story) => (
      <Box sx={{ p: 3 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof ReturnToPreviousPage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Returns to the page that supplied the current sender href.',
      },
    },
  },
}

export const CustomLabel: Story = {
  args: {
    label: 'Return to review queue',
    href: `${REVIEW_QUEUE_PATH}?statuses=needs_review&page=1`,
  },
}
