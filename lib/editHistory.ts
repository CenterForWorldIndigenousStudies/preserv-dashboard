import { getDashboardSession } from '@root/auth'
import { db } from '@lib/db'
import type { Prisma, PrismaClient } from '@lib/prisma/generated/client'
import { BATCH_LIFECYCLE_STATUSES } from '@constants/batchLifecycleStatuses'

export interface CreateEditHistoryEntryParams {
  entityTable: string
  entityId: string
  previousValue: object | null
  newValue: object | null
  editSummary: string
}

export type EditHistoryClient = PrismaClient | Prisma.TransactionClient

/** Mark submitted batches containing a changed document as non-rerunnable. */
export async function markDocumentBatchesPublicationLocked(
  client: EditHistoryClient,
  documentId: string,
): Promise<void> {
  const memberships = await client.document_to_batches.findMany({
    where: {
      document_id: documentId,
      batches: { lifecycle_status: { notIn: [BATCH_LIFECYCLE_STATUSES.DRAFT, BATCH_LIFECYCLE_STATUSES.ARCHIVE] } },
    },
    select: { batch_id: true, batches: { select: { lifecycle_status: true, publication_status: true } } },
  })

  if (memberships.length === 0) return

  await client.batches.updateMany({
    where: { id: { in: memberships.map((membership) => membership.batch_id) } },
    data: {
      lifecycle_status: BATCH_LIFECYCLE_STATUSES.PUBLICATION_LOCKED,
      updated_at: new Date(),
    },
  })

  await Promise.all(
    memberships.map((membership) =>
      createEditHistoryEntry(client, {
        entityTable: 'batches',
        entityId: membership.batch_id,
        previousValue: {
          lifecycle_status: membership.batches.lifecycle_status,
          publication_status: membership.batches.publication_status,
        },
        newValue: {
          lifecycle_status: BATCH_LIFECYCLE_STATUSES.PUBLICATION_LOCKED,
          publication_status: membership.batches.publication_status,
        },
        editSummary: `Locked batch after an associated document edit (${documentId}).`,
      }),
    ),
  )
}

export async function createEditHistoryEntry(params: CreateEditHistoryEntryParams): Promise<void>
export async function createEditHistoryEntry(
  client: EditHistoryClient,
  params: CreateEditHistoryEntryParams,
): Promise<void>
export async function createEditHistoryEntry(
  clientOrParams: EditHistoryClient | CreateEditHistoryEntryParams,
  maybeParams?: CreateEditHistoryEntryParams,
): Promise<void> {
  const client = maybeParams ? (clientOrParams as EditHistoryClient) : db
  const params = maybeParams ?? (clientOrParams as CreateEditHistoryEntryParams)
  const session = await getDashboardSession()
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
