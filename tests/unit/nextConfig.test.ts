import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import nextConfig from '../../next.config'

const testFilePath = fileURLToPath(import.meta.url)
const testDir = path.dirname(testFilePath)
const dashboardRoot = path.resolve(testDir, '..', '..')

describe('dashboard Next config', () => {
  it('sets turbopack.root to the dashboard root so Next does not infer the monorepo root', () => {
    expect(nextConfig.turbopack?.root).toBe(dashboardRoot)
  })
})
