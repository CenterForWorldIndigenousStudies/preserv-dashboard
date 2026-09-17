'use client'

import { useState } from 'react'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'

import { requestBatchRollback, retryBatchRollback } from '@lib/batchRollback'
import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { GENERATED_BATCH_PUBLICATION_STATUSES } from '@constants/generated/batchPublicationStatuses'
import { ConfirmationDialog } from '@molecules/ConfirmationDialog'

interface BatchRollbackControlProps {
  batchId: string
  lifecycleStatus?: string | null
  publicationStatus?: string | null
  manualEditAfterStart?: boolean
  rollbackStatus?: string | null
  onRollbackRequested?: () => void
}

type ConfirmationAction = 'rollback' | 'retry' | null

function isRollbackRequestEligible({
  publicationStatus,
  lifecycleStatus,
  manualEditAfterStart,
  rollbackStatus,
}: Pick<
  BatchRollbackControlProps,
  'publicationStatus' | 'lifecycleStatus' | 'manualEditAfterStart' | 'rollbackStatus'
>): boolean {
  return (
    publicationStatus === GENERATED_BATCH_PUBLICATION_STATUSES.NOT_STARTED &&
    new Set<string>([
      GENERATED_BATCH_LIFECYCLE_STATUSES.QUEUED,
      GENERATED_BATCH_LIFECYCLE_STATUSES.RUNNING,
      GENERATED_BATCH_LIFECYCLE_STATUSES.COMPLETE,
      GENERATED_BATCH_LIFECYCLE_STATUSES.FAILED,
    ]).has(lifecycleStatus ?? '') &&
    !manualEditAfterStart &&
    !rollbackStatus
  )
}

function isRollbackRetryEligible({
  publicationStatus,
  lifecycleStatus,
  manualEditAfterStart,
  rollbackStatus,
}: Pick<
  BatchRollbackControlProps,
  'publicationStatus' | 'lifecycleStatus' | 'manualEditAfterStart' | 'rollbackStatus'
>): boolean {
  return (
    publicationStatus === GENERATED_BATCH_PUBLICATION_STATUSES.NOT_STARTED &&
    lifecycleStatus === GENERATED_BATCH_LIFECYCLE_STATUSES.ROLLBACK_FAILED &&
    rollbackStatus === 'failed' &&
    !manualEditAfterStart
  )
}

export function BatchRollbackControl({
  batchId,
  lifecycleStatus,
  publicationStatus,
  manualEditAfterStart = false,
  rollbackStatus,
  onRollbackRequested,
}: BatchRollbackControlProps) {
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction>(null)

  const canRequest = isRollbackRequestEligible({
    publicationStatus,
    lifecycleStatus,
    manualEditAfterStart,
    rollbackStatus,
  })
  const canRetry = isRollbackRetryEligible({ publicationStatus, lifecycleStatus, manualEditAfterStart, rollbackStatus })

  async function handleRetry() {
    setPending(true)
    setError(null)
    try {
      const rollback = await retryBatchRollback(batchId)
      setMessage(`Rollback ${rollback.status}. The remaining changes will be processed.`)
      onRollbackRequested?.()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Rollback retry failed.')
    } finally {
      setPending(false)
    }
  }

  async function handleRollback() {
    setPending(true)
    setError(null)
    try {
      const rollback = await requestBatchRollback(batchId, reason)
      setMessage(`Rollback ${rollback.status}. The batch will remain visible while it is processed.`)
      onRollbackRequested?.()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Rollback request failed.')
    } finally {
      setPending(false)
    }
  }

  const confirmationDialog = (
    <ConfirmationDialog
      open={confirmationAction !== null}
      title={confirmationAction === 'retry' ? 'Retry batch rollback?' : 'Roll back this batch?'}
      message={
        confirmationAction === 'retry'
          ? 'Previously completed compensation will be kept.'
          : 'Its queued work and reversible changes will be rolled back.'
      }
      confirmLabel={confirmationAction === 'retry' ? 'Retry rollback' : 'Rollback batch'}
      cancelLabel={'Cancel'}
      onConfirm={() => {
        const action = confirmationAction
        setConfirmationAction(null)
        if (action === 'retry') {
          void handleRetry()
        } else if (action === 'rollback') {
          void handleRollback()
        }
      }}
      onCancel={() => setConfirmationAction(null)}
    />
  )

  if (canRetry) {
    return (
      <>
        <Stack spacing={1.5}>
          <Typography variant={'subtitle2'}>Retry rollback</Typography>
          <Button
            variant={'outlined'}
            color={'warning'}
            onClick={() => setConfirmationAction('retry')}
            disabled={pending}
          >
            {pending ? 'Retrying rollback…' : 'Retry rollback'}
          </Button>
          {message ? <Alert severity={'info'}>{message}</Alert> : null}
          {error ? <Alert severity={'error'}>{error}</Alert> : null}
        </Stack>
        {confirmationDialog}
      </>
    )
  }

  if (!canRequest) {
    if (manualEditAfterStart && !rollbackStatus) {
      return (
        <Alert severity={'warning'}>{'Rollback unavailable: a Dashboard edit was made after the batch started.'}</Alert>
      )
    }
    if (manualEditAfterStart && rollbackStatus === 'failed') {
      return (
        <Alert severity={'warning'}>
          {'Rollback retry unavailable: a Dashboard edit was made after the batch started.'}
        </Alert>
      )
    }
    return null
  }

  return (
    <>
      <Stack spacing={1.5}>
        <Typography variant={'subtitle2'}>{'Rollback batch'}</Typography>
        <TextField
          label={'Reason (optional)'}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          multiline
          minRows={2}
          size={'small'}
        />
        <Button
          variant={'outlined'}
          color={'warning'}
          onClick={() => setConfirmationAction('rollback')}
          disabled={pending}
        >
          {pending ? 'Requesting rollback…' : 'Rollback batch'}
        </Button>
        {message ? <Alert severity={'info'}>{message}</Alert> : null}
        {error ? <Alert severity={'error'}>{error}</Alert> : null}
      </Stack>
      {confirmationDialog}
    </>
  )
}
