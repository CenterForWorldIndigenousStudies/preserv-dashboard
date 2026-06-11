import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import mysql, { type RowDataPacket } from 'mysql2/promise'

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(dirname, '../../..')
const TEST_ENV_FILE = path.join(PROJECT_ROOT, '.env.test')

const DEFAULT_TEST_DB_ENV = {
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_USER: 'mariadb',
  DB_PASS: 'docker',
  DB_NAME: 'preservationtest',
} as const

type TestDbConfig = {
  host: string
  port: number
  user: string
  password: string
  database: string
}

interface SchemaObjectRow extends RowDataPacket {
  TABLE_NAME: string
  TABLE_TYPE: string
}

function escapeIdentifier(value: string): string {
  return `\`${value.replaceAll('`', '``')}\``
}

function assertSafeTestDatabase(database: string): void {
  if (!/test/i.test(database)) {
    throw new Error(`Refusing to manage non-test database "${database}". Use a dedicated test schema.`)
  }
}

function loadTestEnv(): void {
  if (fs.existsSync(TEST_ENV_FILE)) {
    process.loadEnvFile(TEST_ENV_FILE)
  }
}

export function getTestDbConfig(): TestDbConfig {
  loadTestEnv()

  const database = process.env.DB_NAME ?? DEFAULT_TEST_DB_ENV.DB_NAME
  assertSafeTestDatabase(database)

  return {
    host: process.env.DB_HOST ?? DEFAULT_TEST_DB_ENV.DB_HOST,
    port: Number(process.env.DB_PORT ?? DEFAULT_TEST_DB_ENV.DB_PORT),
    user: process.env.DB_USER ?? DEFAULT_TEST_DB_ENV.DB_USER,
    password: process.env.DB_PASS ?? DEFAULT_TEST_DB_ENV.DB_PASS,
    database,
  }
}

async function ensureTestDatabaseExists(config: TestDbConfig): Promise<void> {
  try {
    const probeConnection = await mysql.createConnection(config)
    await probeConnection.end()
    return
  } catch (error) {
    const mysqlError = error as { code?: string } | undefined
    if (mysqlError?.code === 'ER_DBACCESS_DENIED_ERROR' || mysqlError?.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error(
        `Unable to access test database "${config.database}" with the configured MariaDB user. Create the schema and grant that user privileges on it, then rerun the tests.`,
        { cause: error },
      )
    }
    if (mysqlError?.code !== 'ER_BAD_DB_ERROR') {
      throw error
    }
  }

  const { database, ...serverConfig } = config
  const serverConnection = await mysql.createConnection(serverConfig)
  try {
    await serverConnection.query(`CREATE DATABASE ${escapeIdentifier(database)}`)
  } catch (error) {
    const mysqlError = error as { code?: string } | undefined
    if (mysqlError?.code === 'ER_DBACCESS_DENIED_ERROR' || mysqlError?.code === 'ER_ACCESS_DENIED_ERROR') {
      throw new Error(
        `Unable to create test database "${database}" with the configured MariaDB user. Create it once with an admin account, then rerun the tests.`,
        { cause: error },
      )
    }
    throw error
  } finally {
    await serverConnection.end()
  }
}

async function getSchemaObjects(connection: mysql.Connection, database: string): Promise<SchemaObjectRow[]> {
  const [rows] = await connection.query<SchemaObjectRow[]>(
    `
      SELECT TABLE_NAME, TABLE_TYPE
      FROM information_schema.tables
      WHERE table_schema = ?
      ORDER BY TABLE_NAME ASC
    `,
    [database],
  )

  return rows
}

export async function resetTestDatabase(): Promise<void> {
  const config = getTestDbConfig()
  await ensureTestDatabaseExists(config)

  const databaseConnection = await mysql.createConnection(config)
  try {
    // Verify required schema objects exist — do NOT drop/recreate.
    // The test DB schema is maintained independently of the test runner.
    const required = ['documents', 'tags', 'edit_history']
    const rows = await getSchemaObjects(databaseConnection, config.database)
    const existing = new Set(rows.map((r) => r.TABLE_NAME))
    const missing = required.filter((t) => !existing.has(t))
    if (missing.length > 0) {
      throw new Error(
        `Test DB schema is not ready. Missing tables: ${missing.join(', ')}. ` +
          `Run the SQL setup scripts to initialize the test DB first.`,
      )
    }
  } finally {
    await databaseConnection.end()
  }
}
