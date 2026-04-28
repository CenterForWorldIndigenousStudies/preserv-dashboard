import { db } from '@lib/db'
import type { Prisma } from '@lib/prisma/generated/client'

const ROLLBACK_SENTINEL = '__TEST_TRANSACTION_ROLLBACK__'

export async function withRollbackTransaction<T>(
  run: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let result: T | undefined

  try {
    await db.$transaction(async (tx) => {
      result = await run(tx)
      throw new Error(ROLLBACK_SENTINEL)
    })
  } catch (error) {
    if (error instanceof Error && error.message === ROLLBACK_SENTINEL) {
      return result as T
    }
    throw error
  }

  throw new Error('Rollback transaction completed without returning a result.')
}
