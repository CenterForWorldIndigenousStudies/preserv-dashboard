'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Button, Stack, Typography } from '@mui/material'

import { retryPublicationDraftAction } from '@actions/ready-for-library'

export function PublicationDraftRetry({ batchId, documentCount }: { batchId: string; documentCount: number }): ReactElement {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function retry(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const result = await retryPublicationDraftAction(batchId)
      if (result.ok) {
        router.refresh()
      } else {
        setError(result.error)
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'The publication batch could not be queued.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Stack spacing={1.5}>
      <Typography>{`${documentCount} selected document${documentCount === 1 ? '' : 's'} are reserved in this publication draft.`}</Typography>
      <Button variant={'contained'} onClick={() => void retry()} disabled={loading} sx={{ alignSelf: 'flex-start' }}>
        {loading ? 'Queueing…' : 'Retry queueing publication'}
      </Button>
      {error ? <Alert severity={'error'}>{error}</Alert> : null}
    </Stack>
  )
}
