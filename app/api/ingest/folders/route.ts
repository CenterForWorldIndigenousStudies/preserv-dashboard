import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@root/auth'
import { listChildDriveFolders, listRootDriveFolders } from '@lib/googleDrive'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  try {
    const parentId = request.nextUrl.searchParams.get('parentId')?.trim()
    const folders = parentId ? await listChildDriveFolders(parentId) : await listRootDriveFolders()
    return NextResponse.json({ folders })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load Google Drive folders.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
