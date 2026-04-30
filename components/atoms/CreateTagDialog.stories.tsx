import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CreateTagDialog } from '@atoms/CreateTagDialog'

const mockSuggestions = [
  {
    id: 'tag-1',
    name: 'Cherokee Language Curriculum',
    notes: 'Existing classroom materials tag.',
    score: 98,
  },
  {
    id: 'tag-2',
    name: 'Cherokee Language Archive',
    notes: 'Historical materials.',
    score: 86,
  },
]

const meta = {
  title: 'Atoms/CreateTagDialog',
  component: CreateTagDialog,
  tags: ['autodocs'],
  args: {
    open: true,
    initialName: 'Cherokee Language',
    initialNotes: 'Used for language preservation materials.',
    onClose: () => undefined,
    onCreate: () => Promise.resolve(),
  },
  beforeEach: () => {
    const originalFetch = globalThis.fetch

    globalThis.fetch = async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (requestUrl.startsWith('/api/tags/search')) {
        return new Response(JSON.stringify({ tags: mockSuggestions }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }

      return originalFetch(input, init)
    }

    return () => {
      globalThis.fetch = originalFetch
    }
  },
} satisfies Meta<typeof CreateTagDialog>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Empty: Story = {
  args: {
    initialName: '',
    initialNotes: '',
  },
}
