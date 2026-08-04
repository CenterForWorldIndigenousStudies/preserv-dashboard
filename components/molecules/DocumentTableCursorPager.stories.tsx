import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, within } from 'storybook/test'

import { DocumentTableCursorPager } from '@molecules/DocumentTableCursorPager'
import type { DocumentTablePageInfo } from '@organisms/DocumentTable/types'

const pageInfo = (hasPreviousPage: boolean, hasNextPage: boolean): DocumentTablePageInfo => ({
  pageSize: 25,
  hasPreviousPage,
  hasNextPage,
  startCursor: { id: 'document-start', value: 'Document start' },
  endCursor: { id: 'document-end', value: 'Document end' },
})

const meta = {
  title: 'Molecules/DocumentTableCursorPager',
  component: DocumentTableCursorPager,
  tags: ['autodocs'],
  args: {
    page: 2,
    pageInfo: pageInfo(true, true),
    onNext: fn(),
    onPrevious: fn(),
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof DocumentTableCursorPager>

export default meta
type Story = StoryObj<typeof meta>

export const FirstPage: Story = {
  args: {
    page: 1,
    pageInfo: pageInfo(false, true),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('button', { name: 'Previous' })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeEnabled()
  },
}

export const MiddlePage: Story = {}

export const LastPage: Story = {
  args: {
    page: 3,
    pageInfo: pageInfo(true, false),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole('button', { name: 'Previous' })).toBeEnabled()
    await expect(canvas.getByRole('button', { name: 'Next' })).toBeDisabled()
  },
}
