import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@root/auth'

const LOCAL_STORYBOOK_ROOT = resolve(process.cwd(), 'public/developers/storybook')
const SIGN_IN_CALLBACK = '/component-library'

export const preferredRegion = 'sfo1'

const CONTENT_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

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
    'content-encoding',
    'content-language',
    'content-length',
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

async function serveLocalStorybook(assetPath: string): Promise<NextResponse> {
  const absolutePath = resolve(LOCAL_STORYBOOK_ROOT, assetPath)
  if (!absolutePath.startsWith(LOCAL_STORYBOOK_ROOT)) {
    return new NextResponse('Not found', { status: 404 })
  }

  try {
    const file = await readFile(absolutePath)
    const extension = extname(absolutePath).toLowerCase()
    const headers = new Headers({
      'content-type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
    })

    if (extension === '.html') {
      headers.set('cache-control', 'no-cache')
    } else {
      headers.set('cache-control', 'public, max-age=31536000, immutable')
    }

    return new NextResponse(file, { headers })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
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

  if (process.env.STORYBOOK_URL) {
    return proxyRemoteStorybook(request, assetPath)
  }

  return serveLocalStorybook(assetPath)
}
