import { NextResponse } from 'next/server'

import { getPipelineSummary } from '@lib/queries'

export async function GET(): Promise<NextResponse> {
  try {
    const summary = await getPipelineSummary()
    return NextResponse.json(summary)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load pipeline summary.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
