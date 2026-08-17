import { describe, expect, it, vi } from 'vitest'

vi.mock('@root/auth', () => ({
  auth: vi.fn(),
}))

import { config } from '@root/proxy'

describe('dashboard proxy matcher', () => {
  it('leaves every pipeline callback route outside the authentication proxy', () => {
    const callbackPaths = [
      '/api/pipeline/ingester/callback',
      '/api/pipeline/document-splitter/callback',
      '/api/pipeline/page-rotator/callback',
      '/api/pipeline/ocr-processor/callback',
      '/api/pipeline/content-dedup/callback',
      '/api/pipeline/metadata-extractor/callback',
      '/api/pipeline/metadata-validator/callback',
      '/api/pipeline/rights-determinator/callback',
      '/api/pipeline/fedora-ingester/callback',
    ]

    for (const callbackPath of callbackPaths) {
      expect(config.matcher[0], callbackPath).toContain(callbackPath.slice(1))
    }
  })
})
