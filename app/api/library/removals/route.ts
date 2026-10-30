import { randomUUID } from 'node:crypto'

import { NextRequest, NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestedBy = (await getDashboardSession())?.user?.email?.trim()
  if (!requestedBy) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const pipelineBaseUrl = process.env.PIPELINE_API_BASE_URL?.trim()
  const triggerToken = process.env.PIPELINE_TRIGGER_TOKEN?.trim()
  if (!pipelineBaseUrl || !triggerToken) {
    return NextResponse.json({ error: 'Pipeline API configuration is incomplete.' }, { status: 500 })
  }

  let documentIds: unknown
  try {
    const body = (await request.json()) as { documentIds?: unknown }
    documentIds = body.documentIds
  } catch {
    return NextResponse.json({ error: 'A documentIds array is required.' }, { status: 400 })
  }
  if (!Array.isArray(documentIds) || documentIds.length === 0 || documentIds.some((id) => typeof id !== 'string')) {
    return NextResponse.json({ error: 'A documentIds array is required.' }, { status: 400 })
  }

  const response = await fetch(new URL('/fedora-removals', pipelineBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${triggerToken}` },
    body: JSON.stringify({ document_ids: documentIds, requested_by: requestedBy, idempotency_key: randomUUID() }),
    cache: 'no-store',
  })
  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    responseBody = {}
  }
  return NextResponse.json(responseBody, { status: response.status })
}
