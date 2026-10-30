import { NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'

interface RouteContext {
  params: Promise<{ requestId: string; itemId: string }>
}

export async function POST(_request: Request, context: RouteContext): Promise<NextResponse> {
  const requestedBy = (await getDashboardSession())?.user?.email?.trim()
  if (!requestedBy) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  const pipelineBaseUrl = process.env.PIPELINE_API_BASE_URL?.trim()
  const triggerToken = process.env.PIPELINE_TRIGGER_TOKEN?.trim()
  if (!pipelineBaseUrl || !triggerToken) {
    return NextResponse.json({ error: 'Pipeline API configuration is incomplete.' }, { status: 500 })
  }
  const { requestId, itemId } = await context.params
  const response = await fetch(
    new URL(
      `/fedora-removals/${encodeURIComponent(requestId)}/items/${encodeURIComponent(itemId)}/retry`,
      pipelineBaseUrl,
    ),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${triggerToken}` },
      body: JSON.stringify({ requested_by: requestedBy }),
      cache: 'no-store',
    },
  )
  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    responseBody = {}
  }
  return NextResponse.json(responseBody, { status: response.status })
}
