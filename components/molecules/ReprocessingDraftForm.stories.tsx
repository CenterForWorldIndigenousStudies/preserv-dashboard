import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { fn } from 'storybook/test'

import { DEFAULT_REPROCESSING_START_STAGE } from '@lib/reprocessingDrafts'
import { ReprocessingDraftForm } from '@molecules/ReprocessingDraftForm'

const meta = {
  title: 'Molecules/ReprocessingDraftForm',
  component: ReprocessingDraftForm,
  tags: ['autodocs'],
  args: {
    name: 'Needs review corrections',
    collectionName: 'CWIS collection',
    collectionNotes: 'Metadata correction run.',
    restartStage: DEFAULT_REPROCESSING_START_STAGE,
    reason: 'Correct metadata after review.',
    isSubmitting: false,
    canSubmit: true,
    error: null,
    onNameChange: fn(),
    onCollectionNameChange: fn(),
    onCollectionNotesChange: fn(),
    onRestartStageChange: fn(),
    onReasonChange: fn(),
    onSubmit: fn(),
  },
  parameters: { a11y: { disable: true } },
} satisfies Meta<typeof ReprocessingDraftForm>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Invalid: Story = { args: { canSubmit: false, error: 'A reason is required.' } }
export const Editing: Story = { args: { disableRestartStage: true, submitLabel: 'Save draft' } }
