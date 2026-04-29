import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@root/auth'

const SIGN_IN_CALLBACK = '/component-library'

export const preferredRegion = 'sfo1'

function resolveStorybookPath(pathSegments: string[] | undefined): string {
  if (!pathSegments || pathSegments.length === 0) return 'index.html'

  const normalized = pathSegments.filter(Boolean)
  if (normalized.length === 0) return 'index.html'

  return normalized.join('/')
}

function isHtmlRequest(request: NextRequest, assetPath: string): boolean {
  return assetPath.endsWith('.html') || request.headers.get('accept')?.includes('text/html') === true
}

function unauthorizedResponse(request: NextRequest, assetPath: string): NextResponse {
  if (isHtmlRequest(request, assetPath)) {
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', SIGN_IN_CALLBACK)
    return NextResponse.redirect(signInUrl)
  }

  return new NextResponse('Unauthorized', { status: 401 })
}

function buildRemoteUrl(request: NextRequest, assetPath: string): URL {
  const baseUrl = process.env.STORYBOOK_URL
  if (!baseUrl) {
    throw new Error('STORYBOOK_URL is not configured')
  }

  const remoteUrl = new URL(assetPath, `${baseUrl.replace(/\/+$/, '')}/`)
  remoteUrl.search = request.nextUrl.search
  return remoteUrl
}

function copyRemoteHeaders(source: Headers): Headers {
  const headers = new Headers()
  const allowedHeaders = [
    'cache-control',
    'content-language',
    'content-type',
    'etag',
    'last-modified',
    'vary',
  ]

  for (const header of allowedHeaders) {
    const value = source.get(header)
    if (value) headers.set(header, value)
  }

  return headers
}

async function proxyRemoteStorybook(request: NextRequest, assetPath: string): Promise<NextResponse> {
  const remoteUrl = buildRemoteUrl(request, assetPath)
  const upstream = await fetch(remoteUrl, {
    headers: {
      accept: request.headers.get('accept') ?? '*/*',
      'accept-language': request.headers.get('accept-language') ?? 'en-US,en;q=0.9',
      ...(request.headers.get('if-none-match')
        ? { 'if-none-match': request.headers.get('if-none-match') as string }
        : {}),
      ...(request.headers.get('if-modified-since')
        ? { 'if-modified-since': request.headers.get('if-modified-since') as string }
        : {}),
    },
    redirect: 'follow',
  })

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyRemoteHeaders(upstream.headers),
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  const session = await auth()
  const { path } = await context.params
  const assetPath = resolveStorybookPath(path)

  if (!session) {
    return unauthorizedResponse(request, assetPath)
  }

  return proxyRemoteStorybook(request, assetPath)
}
