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

interface TableNameRow extends RowDataPacket {
  TABLE_NAME: string
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
    // The schema files are trusted repo inputs; execute sequentially for clearer failures.
    // eslint-disable-next-line no-await-in-loop
    await connection.query(statement)
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

async function clearTestDatabase(connection: mysql.Connection, database: string): Promise<void> {
  const [rows] = await connection.query<TableNameRow[]>(
    `
      SELECT TABLE_NAME
      FROM information_schema.tables
      WHERE table_schema = ?
      ORDER BY TABLE_NAME ASC
    `,
    [database],
  )

  await connection.query('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const row of rows) {
      // eslint-disable-next-line no-await-in-loop
      await connection.query(`DROP TABLE IF EXISTS ${escapeIdentifier(row.TABLE_NAME)}`)
    }
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')
  }
}

export async function resetTestDatabase(): Promise<void> {
  const config = getTestDbConfig()
  await ensureTestDatabaseExists(config)

  const databaseConnection = await mysql.createConnection(config)
  try {
    await clearTestDatabase(databaseConnection, config.database)
    await applySqlFile(databaseConnection, INIT_DB_SQL)
    await applySqlFile(databaseConnection, DASHBOARD_TABLES_SQL)
  } finally {
    await databaseConnection.end()
  }
}
