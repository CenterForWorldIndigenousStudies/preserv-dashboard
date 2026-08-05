'use client'

import { useState, useTransition, type ReactElement } from 'react'
import { Alert, Button, Card, CardContent, Stack, Typography } from '@mui/material'

import { triggerReadyForLibraryAction } from '@actions/ready-for-library'

export function ReadyForLibraryHandoff(): ReactElement {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  function queueHandoff(): void {
    setError(null)
    setMessage(null)
    startTransition(() => {
      void triggerReadyForLibraryAction().then((result) => {
        if (!result.ok) {
          setError(result.error)
          return
        }

        setMessage(result.message)
      })
    })
  }

  return (
    <Card component="section" sx={{ border: '1px solid', borderColor: 'rgba(53, 88, 52, 0.15)' }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack spacing={1.5}>
          <Typography variant="h6" sx={{ color: 'text.primary' }}>
            Queue the library handoff
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This queues the downstream translation step for completed batches containing the documents currently
            eligible in this workspace. Runtime collection, duplicate, Drive, and Workbench checks still run during
            handoff.
          </Typography>
          <Button
            variant="contained"
            onClick={queueHandoff}
            disabled={isPending}
            sx={{ alignSelf: 'flex-start', borderRadius: 999, textTransform: 'none' }}
          >
            {isPending ? 'Queueing handoff…' : 'Queue ready documents for library'}
          </Button>
          {error ? <Alert severity="error">{error}</Alert> : null}
          {message ? <Alert severity="success">{message}</Alert> : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
