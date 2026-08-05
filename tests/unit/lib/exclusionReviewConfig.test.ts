import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('getExclusionReviewConfig', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID
    delete process.env.EXCLUSION_REVIEW_ALLOWED_EMAILS
    delete process.env.EXCLUSION_REVIEW_CHILDREN_PAGE_SIZE
  })

  afterEach(() => {
    delete process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID
    delete process.env.EXCLUSION_REVIEW_ALLOWED_EMAILS
    delete process.env.EXCLUSION_REVIEW_CHILDREN_PAGE_SIZE
  })

  it('parses the configured root, allowlist, and child page size', async () => {
    process.env.EXCLUSION_REVIEW_ROOT_FOLDER_ID = 'root-folder-1'
    process.env.EXCLUSION_REVIEW_ALLOWED_EMAILS = 'Editor1@example.org, editor2@example.org'
    process.env.EXCLUSION_REVIEW_CHILDREN_PAGE_SIZE = '350'

    const { getExclusionReviewConfig } = await import('@lib/exclusionReviewConfig')

    expect(getExclusionReviewConfig()).toEqual({
      rootFolderId: 'root-folder-1',
      allowedEditorEmails: ['editor1@example.org', 'editor2@example.org'],
      childPageSize: 350,
    })
  })

  it('requires a configured root folder while defaulting optional settings', async () => {
    process.env.EXCLUSION_REVIEW_ALLOWED_EMAILS = '["Reviewer@example.org", " reviewer2@example.org "]'
    process.env.EXCLUSION_REVIEW_CHILDREN_PAGE_SIZE = 'invalid'

    const { getExclusionReviewConfig } = await import('@lib/exclusionReviewConfig')

    expect(() => getExclusionReviewConfig()).toThrow(
      'EXCLUSION_REVIEW_ROOT_FOLDER_ID is required for the Exclusion Review workspace.',
    )
  })
})
