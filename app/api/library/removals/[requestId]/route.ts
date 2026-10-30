import { NextResponse } from 'next/server'

import { getDashboardSession } from '@root/auth'

interface RouteContext {
  params: Promise<{ requestId: string }>
}

export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  if (!(await getDashboardSession())?.user?.email?.trim()) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }
  const pipelineBaseUrl = process.env.PIPELINE_API_BASE_URL?.trim()
  const triggerToken = process.env.PIPELINE_TRIGGER_TOKEN?.trim()
  if (!pipelineBaseUrl || !triggerToken) {
    return NextResponse.json({ error: 'Pipeline API configuration is incomplete.' }, { status: 500 })
  }
  const { requestId } = await context.params
  const response = await fetch(new URL(`/fedora-removals/${encodeURIComponent(requestId)}`, pipelineBaseUrl), {
    headers: { Authorization: `Bearer ${triggerToken}` },
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
