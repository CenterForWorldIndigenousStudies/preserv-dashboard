'use client'

import { useEffect, useState, type ReactElement } from 'react'
import Link from 'next/link'
import { Alert, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material'

import { getReadyForLibrarySelectionAction, publishReadyForLibraryAction } from '@actions/ready-for-library'
import { getBatchDetailPath } from '@constants/paths'
import { Modal } from '@organisms/Modal'

interface ReadyForLibraryPublishDialogProps {
  documentIds: readonly string[]
  operationId: string
  onClose: () => void
  onPublished: () => void
}

export function ReadyForLibraryPublishDialog({
  documentIds,
  operationId,
  onClose,
  onPublished,
}: ReadyForLibraryPublishDialogProps): ReactElement {
  const selectedIds = [...documentIds]
  const [names, setNames] = useState<Array<{ id: string; name: string }>>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [batchId, setBatchId] = useState<string | null>(null)
  const [queued, setQueued] = useState(false)

  useEffect(() => {
    let active = true
    void getReadyForLibrarySelectionAction(documentIds).then((selectedNames) => {
      if (!active) return
      if (selectedNames.length !== documentIds.length) {
        setError('One or more selected documents could not be found. Refresh the table and select them again.')
      } else {
        setNames(selectedNames)
      }
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'The selected documents could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [documentIds])

  async function submit(): Promise<void> {
    if (!name.trim() || names.length !== selectedIds.length || loading) return
    setLoading(true)
    setError(null)
    try {
      const result = await publishReadyForLibraryAction({ documentIds: selectedIds, name, operationId })
      if (!result.ok) {
        setError(result.error)
        if (result.batchId) setBatchId(result.batchId)
        return
      }
      setBatchId(result.batchId)
      setQueued(true)
      onPublished()
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'The publication request could not be submitted.')
    } finally {
      setLoading(false)
    }
  }

  return (
      <Modal
        open
        onClose={onClose}
        title={'Publish selected documents'}
        disableClose={loading}
        actions={
          <>
            <Button onClick={onClose} disabled={loading}>Close</Button>
            {!queued ? <Button variant={'contained'} onClick={() => void submit()} disabled={loading || !name.trim() || names.length !== selectedIds.length}>{batchId ? 'Retry queueing' : 'Publish'}</Button> : null}
          </>
        }
      >
        <Stack spacing={2}>
          <Typography variant={'body2'}>
            A new batch will run Data Ingester, then Fedora Ingester, for these selected documents only.
          </Typography>
          {loading && names.length === 0 ? <CircularProgress size={24} aria-label={'Loading selected documents'} /> : null}
          {names.length > 0 ? (
            <Stack component={'ul'} spacing={0.5} sx={{ pl: 2 }}>
              {names.map((document) => <Typography component={'li'} key={document.id}>{document.name}</Typography>)}
            </Stack>
          ) : null}
          <TextField
            label={'New publication batch name'}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={loading || Boolean(batchId)}
            fullWidth
          />
          {error ? <Alert severity={'error'}>{error}</Alert> : null}
          {batchId ? (
            <Alert severity={error ? 'warning' : 'success'}>
              {error ? 'The batch was created but could not be queued. Retry this submission or inspect the batch.' : 'Publication batch queued.'}{' '}
              <Link href={getBatchDetailPath(batchId)}>View batch</Link>
            </Alert>
          ) : null}
        </Stack>
      </Modal>
  )
}
