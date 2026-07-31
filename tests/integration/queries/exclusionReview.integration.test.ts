import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { applyExclusionReviewDecision } from '@lib/exclusionReviewQueries'
import { db } from '@lib/db'
import type { Prisma } from '@lib/prisma/generated/client'
import { resetTestDatabase, shouldSkipDashboardIntegrationSuite } from '../support/test-db'
import { withRollbackTransaction } from '../support/transaction'

const describeDbIntegration = shouldSkipDashboardIntegrationSuite() ? describe.skip : describe

describeDbIntegration('exclusion review queries (integration)', () => {
  beforeAll(async () => {
    process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID = 'root-folder'
    await resetTestDatabase()
    await db.$connect()
  })

  afterAll(async () => {
    delete process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID
    await db.$disconnect()
  })

  const seedBranch = async (tx: Prisma.TransactionClient): Promise<void> => {
    const now = new Date('2026-07-17T12:00:00.000Z')

    await tx.drive_exclusion_review_items.createMany({
      data: [
        {
          id: 'root-folder-row',
          root_drive_id: 'root-folder',
          drive_id: 'root-folder',
          parent_drive_id: null,
          item_type: 'folder',
          name: 'Root Folder',
          mime_type: 'application/vnd.google-apps.folder',
          drive_url: 'https://drive.google.com/drive/folders/root-folder',
          path: '[]',
          depth: 0,
          subtree_index_status: 'pending',
          discovered_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'parent-folder-row',
          root_drive_id: 'root-folder',
          drive_id: 'folder-parent',
          parent_drive_id: 'root-folder',
          item_type: 'folder',
          name: 'Folder Parent',
          mime_type: 'application/vnd.google-apps.folder',
          drive_url: 'https://drive.google.com/drive/folders/folder-parent',
          path: '["root-folder"]',
          depth: 1,
          subtree_index_status: 'pending',
          discovered_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          id: 'child-file-row',
          root_drive_id: 'root-folder',
          drive_id: 'child-file',
          parent_drive_id: 'folder-parent',
          item_type: 'file',
          name: 'Child File.pdf',
          mime_type: 'application/pdf',
          drive_url: 'https://drive.google.com/file/d/child-file/view',
          path: '["root-folder","folder-parent"]',
          depth: 2,
          explicit_review_decision: 'include',
          explicit_reviewed_by_email: 'editor@example.org',
          explicit_reviewed_at: now,
          subtree_index_status: 'complete',
          discovered_at: now,
          created_at: now,
          updated_at: now,
        },
      ],
    })
  }

  it('restores a child explicit decision after a parent override is cleared', async () => {
    await withRollbackTransaction(async (tx) => {
      await seedBranch(tx)

      const parentMarked = await applyExclusionReviewDecision(
        {
          driveId: 'folder-parent',
          decision: 'exclude',
          reviewerEmail: 'editor@example.org',
        },
        tx,
      )

      expect(
        parentMarked.updatedNodes.find((node) => node.driveId === 'child-file')
          ?.effectiveDecision,
      ).toBe('exclude')

      const result = await applyExclusionReviewDecision(
        {
          driveId: 'folder-parent',
          decision: null,
          reviewerEmail: 'editor@example.org',
        },
        tx,
      )

      expect(
        result.updatedNodes.find((node) => node.driveId === 'child-file')
          ?.effectiveDecision,
      ).toBe('include')
      expect(
        result.updatedNodes.find((node) => node.driveId === 'child-file')
          ?.isInheritedLocked,
      ).toBe(false)
    })
  })
})
