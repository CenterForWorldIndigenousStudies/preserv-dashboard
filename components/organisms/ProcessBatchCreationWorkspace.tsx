'use client'

import type { ReactElement } from 'react'
import { Box, Stack } from '@mui/material'

import { GoogleDriveFolderTree } from '@molecules/GoogleDriveFolderTree'
import { ProcessBatchFormPanel } from '@molecules/ProcessBatchFormPanel'
import { ProcessSelectedFoldersPanel } from '@molecules/ProcessSelectedFoldersPanel'
import { PipelineProfileSelector } from '@components/ProcessDocuments/PipelineProfileSelector'
import { PipelineStepsModal } from '@components/ProcessDocuments/PipelineStepsModal'
import type { DriveFolderOption } from '@lib/googleDrive'
import type { ProfileId } from '@constants/pipeline'
import type { PipelineSelectionDraft } from '@lib/pipelineConfig'

interface ProcessBatchCreationWorkspaceProps {
  batchName: string
  collectionName: string
  collectionNotes: string
  isSubmitting: boolean
  isRefreshing: boolean
  canSubmit: boolean
  submitError: string | null
  acceptedBatchName: string | null
  pipelineDraft: PipelineSelectionDraft
  isPipelineStepsModalOpen: boolean
  rootFolders: DriveFolderOption[]
  childFoldersByParent: Record<string, DriveFolderOption[]>
  expandedFolderIds: Record<string, boolean>
  selectedFolders: Record<string, DriveFolderOption>
  foldersError: string | null
  onBatchNameChange: (value: string) => void
  onCollectionNameChange: (value: string) => void
  onCollectionNotesChange: (value: string) => void
  onSubmit: () => void
  onRefresh: () => void
  onProfileChange: (profileId: ProfileId) => void
  onConvertToCustom: () => void
  onProfileDraftChange: (draft: PipelineSelectionDraft) => void
  onOpenStepsModal: () => void
  onCloseStepsModal: () => void
  onToggleFolderSelection: (folder: DriveFolderOption) => void
  onToggleFolderExpansion: (folderId: string) => void
}

export function ProcessBatchCreationWorkspace({
  batchName,
  collectionName,
  collectionNotes,
  isSubmitting,
  isRefreshing,
  canSubmit,
  submitError,
  acceptedBatchName,
  pipelineDraft,
  isPipelineStepsModalOpen,
  rootFolders,
  childFoldersByParent,
  expandedFolderIds,
  selectedFolders,
  foldersError,
  onBatchNameChange,
  onCollectionNameChange,
  onCollectionNotesChange,
  onSubmit,
  onRefresh,
  onProfileChange,
  onConvertToCustom,
  onProfileDraftChange,
  onOpenStepsModal,
  onCloseStepsModal,
  onToggleFolderSelection,
  onToggleFolderExpansion,
}: ProcessBatchCreationWorkspaceProps): ReactElement {
  return (
    <Stack spacing={4}>
      <Box
        sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1.15fr) minmax(0, 0.85fr)',
          },
        }}
      >
        <ProcessBatchFormPanel
          batchName={batchName}
          collectionName={collectionName}
          collectionNotes={collectionNotes}
          isSubmitting={isSubmitting}
          isRefreshing={isRefreshing}
          canSubmit={canSubmit}
          submitError={submitError}
          acceptedBatchName={acceptedBatchName}
          onBatchNameChange={onBatchNameChange}
          onCollectionNameChange={onCollectionNameChange}
          onCollectionNotesChange={onCollectionNotesChange}
          onSubmit={onSubmit}
          onRefresh={onRefresh}
        />

        <Stack spacing={3}>
          <PipelineProfileSelector
            draft={pipelineDraft}
            onProfileChange={onProfileChange}
            onConvertToCustom={onConvertToCustom}
            onOpenStepsModal={onOpenStepsModal}
          />
          <PipelineStepsModal
            open={isPipelineStepsModalOpen}
            draft={pipelineDraft}
            onClose={onCloseStepsModal}
            onDraftChange={onProfileDraftChange}
          />
          <ProcessSelectedFoldersPanel folders={Object.values(selectedFolders)} />
        </Stack>
      </Box>

      <GoogleDriveFolderTree
        rootFolders={rootFolders}
        childFoldersByParent={childFoldersByParent}
        expandedFolderIds={expandedFolderIds}
        selectedFolderIds={selectedFolders}
        error={foldersError}
        onToggleFolderSelection={onToggleFolderSelection}
        onToggleFolderExpansion={onToggleFolderExpansion}
      />
    </Stack>
  )
}
