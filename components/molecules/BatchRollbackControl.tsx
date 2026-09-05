'use client'

import { useState } from 'react'
import { Alert, Button, Stack, TextField, Typography } from '@mui/material'

import { requestBatchRollback, retryBatchRollback } from '@lib/batchRollback'
import { BATCH_LIFECYCLE_STATUSES } from '@constants/batchLifecycleStatuses'
import { BATCH_PUBLICATION_STATUSES } from '@constants/batchPublicationStatuses'

interface BatchRollbackControlProps {
  batchId: string
  lifecycleStatus?: string | null
  publicationStatus?: string | null
  manualEditAfterStart?: boolean
  rollbackStatus?: string | null
  onRollbackRequested?: () => void
}

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
    publicationStatus === BATCH_PUBLICATION_STATUSES.NOT_STARTED &&
    new Set<string>([BATCH_LIFECYCLE_STATUSES.QUEUED, BATCH_LIFECYCLE_STATUSES.RUNNING, BATCH_LIFECYCLE_STATUSES.FAILED]).has(lifecycleStatus ?? '') &&
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
    publicationStatus === BATCH_PUBLICATION_STATUSES.NOT_STARTED &&
    lifecycleStatus === BATCH_LIFECYCLE_STATUSES.ROLLBACK_FAILED &&
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

  const canRequest = isRollbackRequestEligible({
    publicationStatus,
    lifecycleStatus,
    manualEditAfterStart,
    rollbackStatus,
  })
  const canRetry = isRollbackRetryEligible({ publicationStatus, lifecycleStatus, manualEditAfterStart, rollbackStatus })

  async function handleRetry() {
    if (!window.confirm('Retry this batch rollback? Previously completed compensation will be kept.')) {
      return
    }

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

  if (canRetry) {
    return (
      <Stack spacing={1.5}>
        <Typography variant={'subtitle2'}>Retry rollback</Typography>
        <Button variant={'outlined'} color={'warning'} onClick={() => void handleRetry()} disabled={pending}>
          {pending ? 'Retrying rollback…' : 'Retry rollback'}
        </Button>
        {message ? <Alert severity={'info'}>{message}</Alert> : null}
        {error ? <Alert severity={'error'}>{error}</Alert> : null}
      </Stack>
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

  async function handleRollback() {
    if (!window.confirm('Undo this batch? Its queued work and reversible changes will be rolled back.')) {
      return
    }

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

  return (
    <Stack spacing={1.5}>
      <Typography variant={'subtitle2'}>{'Undo batch'}</Typography>
      <TextField
        label={'Reason (optional)'}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        multiline
        minRows={2}
        size={'small'}
      />
      <Button variant={'outlined'} color={'warning'} onClick={() => void handleRollback()} disabled={pending}>
        {pending ? 'Requesting rollback…' : 'Undo batch'}
      </Button>
      {message ? <Alert severity={'info'}>{message}</Alert> : null}
      {error ? <Alert severity={'error'}>{error}</Alert> : null}
    </Stack>
  )
}
