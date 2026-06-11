import type { Meta, StoryObj } from '@storybook/nextjs-vite'

import { AppVersion } from '@atoms/AppVersion'

const meta: Meta<typeof AppVersion> = {
  title: 'Atoms/AppVersion',
  component: AppVersion,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
    layout: 'centered',
  },
}

export default meta

type Story = StoryObj<typeof AppVersion>

export const Default: Story = {}
