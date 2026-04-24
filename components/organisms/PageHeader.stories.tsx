import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PageHeader } from '@organisms/PageHeader'

const meta: Meta<typeof PageHeader> = {
  title: 'Organisms/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  argTypes: {
    eyebrow: {
      control: 'text',
      description: 'Small uppercase label above the title',
    },
    title: {
      control: 'text',
      description: 'Main page heading',
    },
    description: {
      control: 'text',
      description: 'Supporting paragraph below the title',
    },
  },
  args: {
    eyebrow: 'Preservation Pipeline',
    title: 'Document Review Queue',
    description:
      'Review and approve documents that have been processed through the CWIS preservation pipeline. Documents requiring attention appear here based on workflow triggers.',
  },
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'sand',
    },
  },
}

export default meta
type Story = StoryObj<typeof PageHeader>

export const Default: Story = {}

export const FailuresView: Story = {
  args: {
    eyebrow: 'Pipeline Status',
    title: 'Pipeline Failures',
    description:
      'Documents that encountered errors during the preservation pipeline. Each failure includes the error type, timestamp, and retry controls.',
  },
}

export const DatabaseView: Story = {
  args: {
    eyebrow: 'System Overview',
    title: 'Database Schema',
    description:
      'Entity-relationship diagram of the CWIS preservation database. Covers documents, collections, reviews, and pipeline events.',
  },
}
