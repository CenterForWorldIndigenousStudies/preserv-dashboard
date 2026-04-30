import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import mysql, { type RowDataPacket } from 'mysql2/promise'

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(dirname, '../../..')
const DATA_COMBINER_ROOT = path.resolve(PROJECT_ROOT, '../preserv-data-combiner')
const INIT_DB_SQL = path.join(DATA_COMBINER_ROOT, 'scripts', 'init_db.sql')
const DASHBOARD_TABLES_SQL = path.join(PROJECT_ROOT, 'scripts', 'dashboard_tables.sql')
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

function iterSqlStatements(script: string): string[] {
  const statements: string[] = []
  let statementLines: string[] = []

  for (const rawLine of script.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('--')) {
      continue
    }

    statementLines.push(rawLine)
    if (line.endsWith(';')) {
      let statement = statementLines.join('\n').trim()
      if (statement.endsWith(';')) {
        statement = statement.slice(0, -1)
      }
      if (statement) {
        statements.push(statement)
      }
      statementLines = []
    }
  }

  const trailing = statementLines.join('\n').trim()
  if (trailing) {
    statements.push(trailing)
  }

  return statements
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

async function applySqlFile(connection: mysql.Connection, filename: string): Promise<void> {
  const script = fs.readFileSync(filename, 'utf8')
  for (const statement of iterSqlStatements(script)) {
    try {
      // The schema files are trusted repo inputs; execute sequentially for clearer failures.
      // eslint-disable-next-line no-await-in-loop
      await connection.query(statement)
    } catch (error) {
      throw new Error(`Failed to apply SQL from ${path.basename(filename)}: ${statement}`, { cause: error })
    }
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

async function clearTestDatabase(connection: mysql.Connection, database: string): Promise<void> {
  const rows = await getSchemaObjects(connection, database)

  await connection.query('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const row of rows) {
      const dropStatement = row.TABLE_TYPE === 'VIEW'
        ? `DROP VIEW IF EXISTS ${escapeIdentifier(row.TABLE_NAME)}`
        : `DROP TABLE IF EXISTS ${escapeIdentifier(row.TABLE_NAME)}`
      // eslint-disable-next-line no-await-in-loop
      await connection.query(dropStatement)
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  }

  const remainingObjects = await getSchemaObjects(connection, database)
  if (remainingObjects.length > 0) {
    const details = remainingObjects
      .map((row) => `${row.TABLE_NAME} (${row.TABLE_TYPE})`)
      .join(', ')
    throw new Error(`Failed to clear test database "${database}". Remaining schema objects: ${details}`)
  }
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
