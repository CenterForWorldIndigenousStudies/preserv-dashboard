import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

type DashboardPackageJson = {
  scripts?: Record<string, string>
}

const testFilePath = fileURLToPath(import.meta.url)
const testDir = path.dirname(testFilePath)
const packageJsonPath = path.resolve(testDir, '..', '..', 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as DashboardPackageJson

describe('dashboard package scripts', () => {
  it('runs the Next.js dev server with webpack for local development', () => {
    expect(packageJson.scripts?.['dev:next']).toBe('next dev --webpack')
  })
})
