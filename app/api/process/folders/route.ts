import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@root/auth'
import { listChildDriveFolders, listRootDriveFolders } from '@lib/googleDrive'
import { logEvent } from '@lib/observability'

export const dynamic = 'force-dynamic'
export const preferredRegion = 'sfo1'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await auth()
  const userEmail = session?.user?.email?.trim()
  if (!userEmail) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  try {
    const parentId = request.nextUrl.searchParams.get('parentId')?.trim()
    if (parentId) {
      logEvent('debug', 'folder_browser_children_requested', {
        parentId,
        userEmail,
      })
      const folders = await listChildDriveFolders(parentId)
      return NextResponse.json({ folders })
    }

    logEvent('debug', 'folder_browser_root_requested', { userEmail })
    const folders = await listRootDriveFolders()
    return NextResponse.json({ folders })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load Google Drive folders.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
