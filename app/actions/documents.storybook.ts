import type { DocumentsPageResult } from '@lib/types'
import type { DocumentsQueryParams } from '@lib/queries'

const EMPTY_RESULT: DocumentsPageResult = {
  data: [],
  pageInfo: {
    page: 1,
    pageSize: 25,
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: null,
    endCursor: null,
  },
}

/**
 * Storybook stub for the overview server action.
 *
 * Stories provide `initialData` directly, so the real server action should not
 * run in the browser bundle. If a story does call it, return a stable empty
 * page instead of crossing into the Prisma-backed query layer.
 */
export function getDocumentsAction(params: DocumentsQueryParams = {}): Promise<DocumentsPageResult> {
  return Promise.resolve({
    ...EMPTY_RESULT,
    pageInfo: {
      ...EMPTY_RESULT.pageInfo,
      page: params.page && params.page > 0 ? Math.floor(params.page) : 1,
      pageSize: params.pageSize && params.pageSize > 0 ? params.pageSize : 25,
    },
  })
}
