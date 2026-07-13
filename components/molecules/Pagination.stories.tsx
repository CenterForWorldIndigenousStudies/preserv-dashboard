import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Pagination } from '@molecules/Pagination'
import { DOCUMENTS_PATH } from '@constants/paths'

const meta: Meta<typeof Pagination> = {
  title: 'Molecules/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  argTypes: {
    currentPage: { control: 'number' },
    totalItems: { control: 'number' },
    pageSize: { control: 'number' },
    buildHref: { control: false },
  },
  parameters: {
    backgrounds: { default: 'sand' },
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

const buildHref = (page: number) => `${DOCUMENTS_PATH}?page=${page}`

export const FirstPage: Story = {
  args: {
    currentPage: 1,
    totalItems: 87,
    pageSize: 20,
    buildHref,
  },
}

export const MiddlePage: Story = {
  args: {
    currentPage: 3,
    totalItems: 87,
    pageSize: 20,
    buildHref,
  },
}

export const LastPage: Story = {
  args: {
    currentPage: 5,
    totalItems: 87,
    pageSize: 20,
    buildHref,
  },
}

export const SinglePage: Story = {
  args: {
    currentPage: 1,
    totalItems: 12,
    pageSize: 20,
    buildHref,
  },
}
