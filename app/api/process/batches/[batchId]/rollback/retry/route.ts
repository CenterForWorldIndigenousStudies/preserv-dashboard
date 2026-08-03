import { NextRequest, NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'

interface RouteContext {
  params: Promise<{ batchId: string }>
}

export async function POST(_request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const session = await getDashboardSession()
  if (!session?.user?.email?.trim()) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  const pipelineBaseUrl = process.env.PIPELINE_API_BASE_URL?.trim()
  const triggerToken = process.env.PIPELINE_TRIGGER_TOKEN?.trim()
  if (!pipelineBaseUrl || !triggerToken) {
    return NextResponse.json({ error: 'Pipeline API configuration is incomplete.' }, { status: 500 })
  }

  const { batchId } = await context.params
  const response = await fetch(
    new URL(`/batches/${encodeURIComponent(batchId)}/rollback/retry`, pipelineBaseUrl),
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${triggerToken}` },
      cache: 'no-store',
    },
  )

  let responseBody: unknown
  try {
    responseBody = await response.json()
  } catch {
    // The upstream may return an empty body for an error.
  }
  return NextResponse.json(responseBody ?? {}, { status: response.status })
}
