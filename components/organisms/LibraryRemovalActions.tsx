'use client'

import { useEffect, useState, type ReactElement } from 'react'
import { Alert, Button, CircularProgress, Stack, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'

import { Modal } from '@organisms/Modal'
import {
  getLibraryRemoval,
  requestLibraryRemoval,
  retryLibraryRemovalItem,
  type LibraryRemovalItem,
  type LibraryRemovalRequest,
} from '@lib/libraryRemoval'

interface LibraryRemovalActionsProps {
  documentIds: string[]
  open: boolean
  onClose: () => void
  onSubmitted?: () => void
}

const ACTIVE_STATUSES = new Set(['requested', 'in_progress'])

function itemStatus(item: LibraryRemovalItem): string {
  return `${item.status.replaceAll('_', ' ')} · Fedora ${item.fedora_delete_status.replaceAll('_', ' ')} · Drive ${item.drive_quarantine_status.replaceAll('_', ' ')} · restore ${item.restoration_status.replaceAll('_', ' ')}`
}

export function LibraryRemovalActions({ documentIds, open, onClose, onSubmitted }: LibraryRemovalActionsProps): ReactElement {
  const router = useRouter()
  const [progressOpen, setProgressOpen] = useState(false)
  const [request, setRequest] = useState<LibraryRemovalRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!request || !ACTIVE_STATUSES.has(request.status)) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      void getLibraryRemoval(request.id)
        .then((updated) => {
          if (cancelled) return
          setRequest(updated)
          if (!ACTIVE_STATUSES.has(updated.status)) router.refresh()
        })
        .catch((pollError: unknown) => {
          if (!cancelled) setError(pollError instanceof Error ? pollError.message : 'Unable to refresh removal status.')
        })
    }, 2000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [request, router])

  async function submitRemoval(): Promise<void> {
    setSubmitting(true)
    setError(null)
    try {
      setRequest(await requestLibraryRemoval(documentIds))
      setProgressOpen(true)
      onSubmitted?.()
      router.refresh()
      onClose()
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to request Fedora removal.')
    } finally {
      setSubmitting(false)
    }
  }

  async function retryItem(item: LibraryRemovalItem): Promise<void> {
    if (!request) return
    setError(null)
    try {
      await retryLibraryRemovalItem(request.id, item.id)
      setRequest(await getLibraryRemoval(request.id))
    } catch (retryError: unknown) {
      setError(retryError instanceof Error ? retryError.message : 'Unable to retry Fedora removal.')
    }
  }

  return (
    <>
      {error ? <Alert severity={'error'}>{error}</Alert> : null}
      <Modal
        open={open}
        onClose={onClose}
        title={'Remove selected documents from the Library?'}
        actions={
          <>
            <Button variant={'text'} onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant={'contained'} color={'error'} onClick={() => void submitRemoval()} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Remove from Library'}
            </Button>
          </>
        }
      >
        <Typography>
          This deletes each selected Fedora node and its attached media/files, and moves its generated submission folder
          to the configured delete folder. The source candidate is restored only after both cleanups are confirmed. The
          original batch remains unchanged and cannot be reopened; reprocessing requires a new batch.
        </Typography>
      </Modal>
      <Modal
        open={request !== null && progressOpen}
        onClose={() => setProgressOpen(false)}
        title={'Library removal progress'}
        maxWidth={'md'}
        actions={
          <Button variant={'text'} onClick={() => setProgressOpen(false)}>
            Close
          </Button>
        }
      >
        {request ? (
          <Stack spacing={2}>
            <Typography>{`Request ${request.id}: ${request.status.replaceAll('_', ' ')}`}</Typography>
            {ACTIVE_STATUSES.has(request.status) ? (
              <CircularProgress size={24} aria-label={'Removal in progress'} />
            ) : null}
            {request.items.map((item) => (
              <Stack key={item.id} spacing={0.5}>
                <Typography>
                  {item.document_id}: {itemStatus(item)}
                </Typography>
                {item.error_message ? (
                  <Alert severity={item.status === 'needs_attention' ? 'warning' : 'error'}>{item.error_message}</Alert>
                ) : null}
                {item.status === 'needs_attention' ? (
                  <Alert severity={'warning'}>This outcome needs operator review before it can safely continue.</Alert>
                ) : null}
                {item.retryable ? (
                  <Button variant={'outlined'} onClick={() => void retryItem(item)}>
                    Retry this document
                  </Button>
                ) : null}
              </Stack>
            ))}
          </Stack>
        ) : null}
      </Modal>
    </>
  )
}
