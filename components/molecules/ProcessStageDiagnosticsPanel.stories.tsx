import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import Box from '@mui/material/Box'

import { ProcessStageDiagnosticsPanel } from '@molecules/ProcessStageDiagnosticsPanel'
import { createProcessStage } from './processStoryFixtures'

const meta = {
  title: 'Molecules/ProcessStageDiagnosticsPanel',
  component: ProcessStageDiagnosticsPanel,
  tags: ['autodocs'],
  parameters: {
    backgrounds: { default: 'sand' },
  },
  decorators: [
    (StoryComponent) => <Box sx={{ m: '0 auto', maxWidth: 760 }}><StoryComponent /></Box>,
  ],
} satisfies Meta<typeof ProcessStageDiagnosticsPanel>

export default meta
type Story = StoryObj<typeof meta>

export const StageErrorAndCallbackDiagnostic: Story = {
  args: {
    stage: createProcessStage({
      status: 'failed',
      error: 'The OCR worker exited before processing the final document.',
      callbackErrorType: 'TimeoutError',
      callbackErrorMessage: 'The callback endpoint did not respond within 10 seconds.',
      callbackHttpStatus: 504,
    }),
  },
}

export const CallbackDiagnosticOnly: Story = {
  args: {
    stage: createProcessStage({
      status: 'completed',
      callbackErrorType: 'DeliveryError',
      callbackErrorMessage: 'Callback delivery was retried once before succeeding.',
      callbackHttpStatus: 502,
    }),
  },
}
