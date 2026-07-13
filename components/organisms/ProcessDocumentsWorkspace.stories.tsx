import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

import { PROCESS_FOLDERS_PATH } from '@constants/paths'
import { createProcessBatch, createProcessStage } from '@molecules/processStoryFixtures'
import { ProcessDocumentsWorkspace } from '@organisms/ProcessDocumentsWorkspace'

const storyRouter: AppRouterInstance = {
  back: () => undefined,
  forward: () => undefined,
  refresh: () => undefined,
  push: () => undefined,
  replace: () => undefined,
  prefetch: () => undefined,
}

const meta = {
  title: 'Organisms/ProcessDocumentsWorkspace',
  component: ProcessDocumentsWorkspace,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (Story) => (
      <AppRouterContext.Provider value={storyRouter}>
        <Box sx={{ width: 'min(100%, 80rem)', mx: 'auto', p: 2 }}>
          <Story />
        </Box>
      </AppRouterContext.Provider>
    ),
  ],
  args: {
    initialBatches: [],
  },
  beforeEach: () => {
    const originalFetch = globalThis.fetch

    globalThis.fetch = async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (requestUrl.startsWith(PROCESS_FOLDERS_PATH)) {
        return new Response(
          JSON.stringify({
            folders: [
              { id: 'folder-1', name: 'Preservation Source Documents' },
              { id: 'folder-2', name: 'Historical Materials' },
            ],
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      return originalFetch(input, init)
    }

    return () => {
      globalThis.fetch = originalFetch
    }
  },
} satisfies Meta<typeof ProcessDocumentsWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const EmptyMonitor: Story = {}

export const WithCompletedBatch: Story = {
  args: {
    initialBatches: [
      createProcessBatch({
        batchName: 'Completed Ingest Batch',
        pipelineRequestedStages: ['ingester'],
        pipelineConfig: null,
        ingester: createProcessStage({
          status: 'completed',
          processedCount: 24,
          ingestedCount: 22,
          duplicateCount: 2,
          completedAt: '2026-05-29T09:45:00.000Z',
        }),
      }),
    ],
  },
}
