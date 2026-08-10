'use client'

import { useState, useTransition, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Stack, Typography } from '@mui/material'

import { Button } from '@atoms/Button'
import { METADATA_EXTRACTOR_OPENAI_BATCH_STATUS_PATH, METADATA_EXTRACTOR_RUN_WAVE_TWO_PATH } from '@constants/paths'

interface MetadataExtractorOpenAIBatchActionsProps {
  batchId: string
  canCheckStatus: boolean
  waveOneStatus: string | null
}

export function MetadataExtractorOpenAIBatchActions({
  batchId,
  canCheckStatus,
  waveOneStatus,
}: MetadataExtractorOpenAIBatchActionsProps): ReactElement {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<'status' | 'wave-two' | null>(null)
  const [isPending, startTransition] = useTransition()

  function queueAction(path: string, action: 'status' | 'wave-two'): void {
    startTransition(() => {
      setError(null)
      setActiveAction(action)

      void (async () => {
        const response = await fetch(path, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batchId }),
        })
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? 'Request failed.')
        }
        router.refresh()
      })()
        .catch((caughtError: unknown) => {
          setError(caughtError instanceof Error ? caughtError.message : 'Request failed.')
        })
        .finally(() => {
          setActiveAction(null)
        })
    })
  }

  const canRunWaveTwo = ['completed', 'completed_with_failures'].includes(waveOneStatus ?? '')

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button
          variant={'secondary'}
          size={'sm'}
          loading={isPending && activeAction === 'status'}
          disabled={!canCheckStatus}
          onClick={() => queueAction(METADATA_EXTRACTOR_OPENAI_BATCH_STATUS_PATH, 'status')}
        >
          {'Check OpenAI batch status'}
        </Button>
        <Button
          variant={'secondary'}
          size={'sm'}
          loading={isPending && activeAction === 'wave-two'}
          disabled={!canRunWaveTwo}
          onClick={() => queueAction(METADATA_EXTRACTOR_RUN_WAVE_TWO_PATH, 'wave-two')}
        >
          {'Run wave 2'}
        </Button>
      </Stack>

      {!canCheckStatus ? (
        <Typography variant={'caption'} sx={{ color: 'text.secondary' }}>
          {'Check OpenAI batch status becomes available after wave 1 has been submitted.'}
        </Typography>
      ) : null}

      {!canRunWaveTwo ? (
        <Typography variant={'caption'} sx={{ color: 'text.secondary' }}>
          {'Run wave 2 becomes available after wave 1 has been imported.'}
        </Typography>
      ) : null}

      {error ? (
        <Box sx={{ borderRadius: 2, px: 1.5, py: 1, bgcolor: 'error.light' }}>
          <Typography variant={'body2'} sx={{ color: 'error.main' }}>
            {error}
          </Typography>
        </Box>
      ) : null}
    </Stack>
  )
}
