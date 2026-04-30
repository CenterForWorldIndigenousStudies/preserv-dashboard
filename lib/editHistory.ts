import { auth } from '../auth'
import { db } from '@lib/db'
import type { Prisma, PrismaClient } from '@lib/prisma/generated/client'

export interface CreateEditHistoryEntryParams {
  entityTable: string
  entityId: string
  previousValue: object | null
  newValue: object | null
  editSummary: string
}

export type EditHistoryClient = PrismaClient | Prisma.TransactionClient

export async function createEditHistoryEntry(
  params: CreateEditHistoryEntryParams,
  client: EditHistoryClient = db,
): Promise<void> {
  const session = await auth()
  const editorEmail = session?.user?.email ?? 'unknown@system.local'

  await client.edit_history.create({
    data: {
      id: crypto.randomUUID(),
      entity_id: params.entityId,
      entity_table: params.entityTable,
      previous_value: params.previousValue ? JSON.stringify(params.previousValue) : null,
      new_value: params.newValue ? JSON.stringify(params.newValue) : null,
      editor_email: editorEmail,
      edit_summary: params.editSummary,
    },
  })
}
