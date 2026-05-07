import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@root/auth'
import { getIngestBatchStatus } from '@lib/ingestBatches'
import { logEvent } from '@lib/observability'

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const batchId = request.nextUrl.searchParams.get('batchId')?.trim()
  if (!batchId) {
    return NextResponse.json({ error: 'batchId is required.' }, { status: 400 })
  }

  const initialStatus = await getIngestBatchStatus(batchId)
  if (!initialStatus) {
    return NextResponse.json({ error: `Batch ${batchId} was not found.` }, { status: 404 })
  }
  logEvent('info', 'sse_client_connected', {
    batchId,
    requestId: initialStatus.requestId,
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
          requestId: initialStatus.requestId,
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

        const latestStatus = await getIngestBatchStatus(batchId)
        if (!latestStatus) {
          logEvent('warn', 'sse_batch_missing', {
            batchId,
            requestId: initialStatus.requestId,
            userEmail: session.user.email,
          })
          controller.enqueue(encodeSseEvent('batch_missing', { batchId }))
          return
        }

        const nextPayload = JSON.stringify(latestStatus)
        if (nextPayload !== previousPayload) {
          logEvent('info', 'sse_batch_status_emitted', {
            batchId,
            requestId: latestStatus.requestId,
            userEmail: session.user.email,
            status: latestStatus.status,
          })
          controller.enqueue(encodeSseEvent('batch_status', latestStatus))
          previousPayload = nextPayload
        } else {
          controller.enqueue(encodeSseComment('keepalive'))
        }

        if (latestStatus.status === 'completed' || latestStatus.status === 'failed') {
          return
        }

        await emitNextStatus()
      }

      try {
        logEvent('info', 'sse_batch_status_emitted', {
          batchId,
          requestId: initialStatus.requestId,
          userEmail: session.user.email,
          status: initialStatus.status,
        })
        controller.enqueue(encodeSseEvent('batch_status', initialStatus))
        if (initialStatus.status === 'completed' || initialStatus.status === 'failed') {
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
