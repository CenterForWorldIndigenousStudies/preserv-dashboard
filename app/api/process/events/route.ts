import { NextRequest, NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'
import { logEvent } from '@lib/observability'
import { getProcessBatchStatus, type ProcessBatchStatus } from '@lib/processBatches'
import { shouldCloseProcessStream } from '@lib/pipelineTriggers'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'
export const runtime = 'nodejs'

const STREAM_INTERVAL_MS = 1500

function encodeSseEvent(event: string, payload: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`)
}

function encodeSseComment(comment: string): Uint8Array {
  return new TextEncoder().encode(`: ${comment}\n\n`)
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

function currentRequestId(batch: ProcessBatchStatus): string | null {
  return (
    batch.rightsDeterminator?.requestId ??
    batch.metadataValidator?.requestId ??
    batch.metadataExtractor?.requestId ??
    batch.contentDedup?.requestId ??
    batch.ocrProcessor?.requestId ??
    batch.pageRotator?.requestId ??
    batch.documentSplitter?.requestId ??
    batch.ingester?.requestId ??
    null
  )
}

function buildBatchStatusLogFields(batch: ProcessBatchStatus): Record<string, string | null> {
  return {
    ingesterStatus: batch.ingester?.status ?? null,
    documentSplitterStatus: batch.documentSplitter?.status ?? null,
    pageRotatorStatus: batch.pageRotator?.status ?? null,
    ocrProcessorStatus: batch.ocrProcessor?.status ?? null,
    contentDedupStatus: batch.contentDedup?.status ?? null,
    metadataExtractorStatus: batch.metadataExtractor?.status ?? null,
    metadataValidatorStatus: batch.metadataValidator?.status ?? null,
    rightsDeterminatorStatus: batch.rightsDeterminator?.status ?? null,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getDashboardSession()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const batchId = request.nextUrl.searchParams.get('batchId')?.trim()
  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required.' }, { status: 400 })
  }

  const initialStatus = await getProcessBatchStatus(batchId)
  if (!initialStatus) {
    return NextResponse.json({ error: `Batch ${batchId} was not found.` }, { status: 404 })
  }

  logEvent('info', 'sse_client_connected', {
    batchId,
    requestId: currentRequestId(initialStatus),
    userEmail: session.user.email,
  })

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      let previousPayload = JSON.stringify(initialStatus)

      const closeStream = () => {
        if (closed) {
          return
        }
        closed = true
        controller.close()
      }

      const abortHandler = () => {
        logEvent('info', 'sse_client_disconnected', {
          batchId,
          requestId: currentRequestId(initialStatus),
          userEmail: session.user.email,
        })
        closeStream()
      }

      request.signal.addEventListener('abort', abortHandler)

      const emitNextStatus = async (): Promise<void> => {
        if (request.signal.aborted || closed) {
          return
        }

        await sleep(STREAM_INTERVAL_MS)
        if (request.signal.aborted || closed) {
          return
        }

        const latestStatus = await getProcessBatchStatus(batchId)
        if (!latestStatus) {
          logEvent('warn', 'sse_batch_missing', {
            batchId,
            requestId: currentRequestId(initialStatus),
            userEmail: session.user.email,
          })
          controller.enqueue(encodeSseEvent('batch_missing', { batchId }))
          return
        }

        const nextPayload = JSON.stringify(latestStatus)
        if (nextPayload !== previousPayload) {
          logEvent('info', 'sse_batch_status_emitted', {
            batchId,
            requestId: currentRequestId(latestStatus),
            userEmail: session.user.email,
            ...buildBatchStatusLogFields(latestStatus),
          })
          controller.enqueue(encodeSseEvent('batch_status', latestStatus))
          previousPayload = nextPayload
        } else {
          controller.enqueue(encodeSseComment('keepalive'))
        }

        if (shouldCloseProcessStream(latestStatus)) {
          return
        }

        await emitNextStatus()
      }

      try {
        logEvent('info', 'sse_batch_status_emitted', {
          batchId,
          requestId: currentRequestId(initialStatus),
          userEmail: session.user.email,
          ...buildBatchStatusLogFields(initialStatus),
        })
        controller.enqueue(encodeSseEvent('batch_status', initialStatus))
        if (shouldCloseProcessStream(initialStatus)) {
          closeStream()
          return
        }

        await emitNextStatus()
      } finally {
        request.signal.removeEventListener('abort', abortHandler)
        closeStream()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
  })
}
