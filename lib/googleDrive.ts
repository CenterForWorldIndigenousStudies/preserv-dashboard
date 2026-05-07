import { google, type drive_v3 } from 'googleapis'

const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder'
const DRIVE_RO_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

export interface DriveFolderOption {
  id: string
  name: string
}

interface GoogleServiceAccountCredentials {
  client_email: string
  private_key: string
  project_id?: string
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

function createDriveClient(): drive_v3.Drive {
  const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim()

  if (!rawJson && !keyFile) {
    throw new Error(
      'Either GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_FILE is required',
    )
  }

  const auth = rawJson
    ? new google.auth.GoogleAuth({
        credentials: parseServiceAccountJson(rawJson),
        scopes: [DRIVE_RO_SCOPE],
      })
    : new google.auth.GoogleAuth({
        keyFile,
        scopes: [DRIVE_RO_SCOPE],
      })

  return google.drive({
    version: 'v3',
    auth,
  })
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

function toDriveFolderOption(file: drive_v3.Schema$File | undefined): DriveFolderOption | null {
  if (!file?.id || !file.name) {
    return null
  }

  return {
    id: file.id,
    name: file.name,
  }
}

export async function listRootDriveFolders(): Promise<DriveFolderOption[]> {
  const drive = createDriveClient()
  const configuredRootIds = parseConfiguredRootFolderIds(process.env.GOOGLE_INGEST_SOURCE_ROOT_FOLDER_IDS)

  if (configuredRootIds.length > 0) {
    const files = await Promise.all(
      configuredRootIds.map(async (folderId) => {
        const response = await drive.files.get({
          fileId: folderId,
          fields: 'id,name,mimeType',
          supportsAllDrives: true,
        })
        return response.data
      }),
    )

    return files
      .filter((file) => file.mimeType === GOOGLE_FOLDER_MIME)
      .map(toDriveFolderOption)
      .filter((file): file is DriveFolderOption => file !== null)
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  const sharedResponse = await drive.files.list({
    q: `mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false and sharedWithMe = true`,
    fields: 'files(id,name)',
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  const sharedFolders = (sharedResponse.data.files ?? [])
    .map(toDriveFolderOption)
    .filter((file): file is DriveFolderOption => file !== null)

  if (sharedFolders.length > 0) {
    return sharedFolders.sort((left, right) => left.name.localeCompare(right.name))
  }

  const fallbackResponse = await drive.files.list({
    q: `mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 200,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  return (fallbackResponse.data.files ?? [])
    .map(toDriveFolderOption)
    .filter((file): file is DriveFolderOption => file !== null)
    .sort((left, right) => left.name.localeCompare(right.name))
}

export async function listChildDriveFolders(parentId: string): Promise<DriveFolderOption[]> {
  const drive = createDriveClient()
  const response = await drive.files.list({
    q: `'${parentId}' in parents and mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 500,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  return (response.data.files ?? [])
    .map(toDriveFolderOption)
    .filter((file): file is DriveFolderOption => file !== null)
    .sort((left, right) => left.name.localeCompare(right.name))
}
