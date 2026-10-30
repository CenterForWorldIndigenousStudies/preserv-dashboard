'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { Alert, Button, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'

import { retryLibraryRemovalItem } from '@lib/libraryRemoval'

interface LibraryRemovalItemStatusProps {
  requestId: string | null
  itemId: string | null
  status: string
  error: string | null
  retryable: boolean
}

export function LibraryRemovalItemStatus({
  requestId,
  itemId,
  status,
  error,
  retryable,
}: LibraryRemovalItemStatusProps): ReactElement {
  const router = useRouter()
  const [currentStatus, setCurrentStatus] = useState(status)
  const [currentError, setCurrentError] = useState(error)
  const [canRetry, setCanRetry] = useState(retryable)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    setCurrentStatus(status)
    setCurrentError(error)
    setCanRetry(retryable)
  }, [error, retryable, status])

  async function retry(): Promise<void> {
    if (!requestId || !itemId || !canRetry) return
    setIsRetrying(true)
    setCurrentError(null)
    try {
      await retryLibraryRemovalItem(requestId, itemId)
      setCurrentStatus('requested')
      setCanRetry(false)
      router.refresh()
    } catch (retryError: unknown) {
      setCurrentError(retryError instanceof Error ? retryError.message : 'Unable to retry this removal.')
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <Stack spacing={0.5}>
      <Typography variant={'body2'}>{currentStatus.replaceAll('_', ' ')}</Typography>
      {currentError ? <Alert severity={'error'}>{currentError}</Alert> : null}
      {canRetry ? (
        <Button variant={'outlined'} size={'small'} onClick={() => void retry()} disabled={isRetrying}>
          {isRetrying ? 'Retrying…' : 'Retry removal'}
        </Button>
      ) : null}
    </Stack>
  )
}
