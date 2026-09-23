'use client'

import { useState } from 'react'
import { Alert, Button, Stack } from '@mui/material'

import { GENERATED_BATCH_LIFECYCLE_STATUSES } from '@constants/generated/batchLifecycleStatuses'
import { cancelBatch } from '@lib/batchCancellation'
import { BATCH_PUBLICATION_STATES } from '@lib/batchLifecycle'

interface BatchCancellationControlProps {
  batchId: string
  lifecycleStatus?: string | null
  publicationStatus?: string | null
  onCancelled?: () => void
}

export function BatchCancellationControl({
  batchId,
  lifecycleStatus,
  publicationStatus,
  onCancelled,
}: BatchCancellationControlProps) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canCancel =
    publicationStatus === BATCH_PUBLICATION_STATES.NOT_STARTED &&
    new Set<string>([
      GENERATED_BATCH_LIFECYCLE_STATUSES.QUEUED,
      GENERATED_BATCH_LIFECYCLE_STATUSES.RUNNING,
      GENERATED_BATCH_LIFECYCLE_STATUSES.FAILED,
    ]).has(lifecycleStatus ?? '')

  if (!canCancel) {
    return null
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this batch? Completed work will be kept, and remaining work will stop.')) {
      return
    }

    setPending(true)
    setError(null)
    try {
      await cancelBatch(batchId)
      onCancelled?.()
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Batch cancellation failed.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Stack spacing={1.5}>
      {/* <Typography variant={'subtitle2'}>{'Cancel batch'}</Typography> */}
      <Button variant={'outlined'} color={'warning'} onClick={() => void handleCancel()} disabled={pending}>
        {pending ? 'Cancelling batch…' : 'Cancel batch'}
      </Button>
      {error ? <Alert severity={'error'}>{error}</Alert> : null}
    </Stack>
  )
}
