import { createSign } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder'
const DRIVE_RO_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'

export interface DriveFolderOption {
  id: string
  name: string
}

interface GoogleServiceAccountCredentials {
  client_email: string
  private_key: string
  project_id?: string
}

interface GoogleTokenResponse {
  access_token?: string
}

interface DriveFileResponse {
  id?: string | null
  name?: string | null
  mimeType?: string | null
}

interface DriveListResponse {
  files?: DriveFileResponse[]
}

function parseServiceAccountJson(raw: string): GoogleServiceAccountCredentials {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid JSON'
    throw new Error(`GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON: ${message}`, {
      cause: error,
    })
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must decode to an object')
  }

  const credentials = parsed as Partial<GoogleServiceAccountCredentials>
  if (
    typeof credentials.client_email !== 'string' ||
    credentials.client_email.trim().length === 0 ||
    typeof credentials.private_key !== 'string' ||
    credentials.private_key.trim().length === 0
  ) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_JSON must include non-empty client_email and private_key fields',
    )
  }

  return {
    client_email: credentials.client_email,
    private_key: credentials.private_key,
    project_id: credentials.project_id,
  }
}

async function loadServiceAccountCredentials(): Promise<GoogleServiceAccountCredentials> {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (rawJson) {
    return parseServiceAccountJson(rawJson)
  }

  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim()
  if (!keyFile) {
    throw new Error('Either GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE is required')
  }

  const fileContents = await readFile(keyFile, 'utf-8')
  return parseServiceAccountJson(fileContents)
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function createJwtAssertion(credentials: GoogleServiceAccountCredentials): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  const expiresAt = issuedAt + 3600

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }
  const payload = {
    iss: credentials.client_email,
    scope: DRIVE_RO_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: expiresAt,
    iat: issuedAt,
  }

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`
  const signer = createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(credentials.private_key)

  return `${unsignedToken}.${base64UrlEncode(signature)}`
}

async function fetchDriveAccessToken(): Promise<string> {
  const credentials = await loadServiceAccountCredentials()
  const assertion = createJwtAssertion(credentials)
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google OAuth token request failed (${response.status}): ${detail}`)
  }

  const payload = (await response.json()) as GoogleTokenResponse
  const accessToken = payload.access_token?.trim()
  if (!accessToken) {
    throw new Error('Google OAuth token response did not include access_token')
  }
  return accessToken
}

function parseConfiguredRootFolderIds(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.map((value) => String(value).trim()).filter(Boolean)
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function toDriveFolderOption(file: DriveFileResponse | undefined): DriveFolderOption | null {
  if (!file?.id || !file.name) {
    return null
  }

  return {
    id: file.id,
    name: file.name,
  }
}

async function fetchDriveJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const accessToken = await fetchDriveAccessToken()
  const url = new URL(`${GOOGLE_DRIVE_API_BASE}${path}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Google Drive request failed (${response.status}): ${detail}`)
  }

  return (await response.json()) as T
}

async function getDriveFile(folderId: string): Promise<DriveFileResponse> {
  return fetchDriveJson<DriveFileResponse>(`/files/${folderId}`, {
    fields: 'id,name,mimeType',
    supportsAllDrives: 'true',
  })
}

async function listDriveFiles(query: string): Promise<DriveFileResponse[]> {
  const payload = await fetchDriveJson<DriveListResponse>('/files', {
    q: query,
    fields: 'files(id,name,mimeType)',
    pageSize: '500',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })
  return payload.files ?? []
}

export async function listRootDriveFolders(): Promise<DriveFolderOption[]> {
  const configuredRootIds = parseConfiguredRootFolderIds(
    process.env.GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS,
  )

  if (configuredRootIds.length > 0) {
    const files = await Promise.all(configuredRootIds.map((folderId) => getDriveFile(folderId)))

    return files
      .filter((file) => file.mimeType === GOOGLE_FOLDER_MIME)
      .map(toDriveFolderOption)
      .filter((file): file is DriveFolderOption => file !== null)
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  const sharedFolders = (await listDriveFiles(
    `mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false and sharedWithMe = true`,
  ))
    .map(toDriveFolderOption)
    .filter((file): file is DriveFolderOption => file !== null)

  if (sharedFolders.length > 0) {
    return sharedFolders.sort((left, right) => left.name.localeCompare(right.name))
  }

  return (await listDriveFiles(`mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false`))
    .map(toDriveFolderOption)
    .filter((file): file is DriveFolderOption => file !== null)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export async function listChildDriveFolders(parentId: string): Promise<DriveFolderOption[]> {
  return (
    await listDriveFiles(
      `'${parentId}' in parents and mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false`,
    )
  )
    .map(toDriveFolderOption)
    .filter((file): file is DriveFolderOption => file !== null)
    .sort((left, right) => left.name.localeCompare(right.name))
}
