import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'
import { BATCH_ROLLBACK_CALLBACK_PATH } from '@constants/paths'
import { DASHBOARD_BASE_URL } from '@constants/server'

interface RouteContext {
  params: Promise<{ batchId: string }>
}

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const session = await getDashboardSession()
  const requestedBy = session?.user?.email?.trim()
  if (!requestedBy) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const pipelineBaseUrl = process.env.PIPELINE_API_BASE_URL?.trim()
  const triggerToken = process.env.PIPELINE_TRIGGER_TOKEN?.trim()
  const callbackToken = process.env.PIPELINE_CALLBACK_TOKEN?.trim()
  if (!pipelineBaseUrl || !triggerToken || !callbackToken) {
    return NextResponse.json({ error: 'Pipeline API configuration is incomplete.' }, { status: 500 })
  }

  const { batchId } = await context.params
  let body: { reason?: unknown } = {}
  try {
    body = (await request.json()) as { reason?: unknown }
  } catch {
    // An empty request body is valid; the reason is optional.
  }

  const reason = typeof body.reason === 'string' ? body.reason.trim() : undefined
  const response = await fetch(new URL(`/batches/${encodeURIComponent(batchId)}/rollback`, pipelineBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${triggerToken}`,
    },
    body: JSON.stringify({
      requested_by: requestedBy,
      reason,
      idempotency_key: randomUUID(),
      callback: {
        url: new URL(BATCH_ROLLBACK_CALLBACK_PATH, DASHBOARD_BASE_URL).toString(),
        token: callbackToken,
      },
    }),
    cache: 'no-store',
  })

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    // The upstream may return an empty body for an error.
  }
  return NextResponse.json(responseBody ?? {}, { status: response.status })
}
