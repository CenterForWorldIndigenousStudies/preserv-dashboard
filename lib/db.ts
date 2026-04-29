import { PrismaClient } from './prisma/generated/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function assertSafeTestDatabase(database: string): void {
  if (!isTestRuntime()) {
    return
  }

  if (!/test/i.test(database)) {
    throw new Error(
      `Refusing to run tests against non-test database "${database}". Set DB_NAME in .env.test to a dedicated test schema.`,
    )
  }
}

function createClient(): PrismaClient {
  const database = process.env.DB_NAME ?? 'cwis_preservation'
  assertSafeTestDatabase(database)
  const isProductionRuntime = process.env.NODE_ENV === 'production'
  const connectionLimit = parsePositiveInt(
    process.env.DB_CONNECTION_LIMIT,
    isProductionRuntime ? 10 : 2,
  )
  const acquireTimeout = parsePositiveInt(
    process.env.DB_ACQUIRE_TIMEOUT_MS,
    30_000,
  )
  const idleTimeout = parsePositiveInt(
    process.env.DB_IDLE_TIMEOUT_MS,
    60_000,
  )

  const adapter = new PrismaMariaDb({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'mariadb',
    password: process.env.DB_PASS ?? 'docker',
    database,
    connectionLimit,
    acquireTimeout,
    idleTimeout,
  })
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
