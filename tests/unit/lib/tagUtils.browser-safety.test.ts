import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const testFilePath = fileURLToPath(import.meta.url)
const testDir = path.dirname(testFilePath)
const dashboardRoot = path.resolve(testDir, '..', '..', '..')

const aliasRoots: Record<string, string> = {
  '@actions/': path.join(dashboardRoot, 'app/actions/'),
  '@api/': path.join(dashboardRoot, 'app/api/'),
  '@atoms/': path.join(dashboardRoot, 'components/atoms/'),
  '@components/': path.join(dashboardRoot, 'components/'),
  '@constants/': path.join(dashboardRoot, 'constants/'),
  '@contracts/': path.join(dashboardRoot, 'contracts/'),
  '@hooks/': path.join(dashboardRoot, 'hooks/'),
  '@lib/': path.join(dashboardRoot, 'lib/'),
  '@molecules/': path.join(dashboardRoot, 'components/molecules/'),
  '@organisms/': path.join(dashboardRoot, 'components/organisms/'),
  '@root/': `${dashboardRoot}/`,
  'types/': path.join(dashboardRoot, 'types/'),
}

const fileExtensions = ['.ts', '.tsx', '.js', '.jsx']

describe('tagUtils browser safety', () => {
  it('keeps the shared tag helpers free of node builtins for client imports', () => {
    const nodeBuiltins = collectNodeBuiltinImports(path.join(dashboardRoot, 'lib/tagUtils.ts'))

    expect(nodeBuiltins).toEqual([])
  })
})

function collectNodeBuiltinImports(entryFile: string): string[] {
  const queue = [entryFile]
  const visited = new Set<string>()
  const nodeBuiltins = new Set<string>()

  while (queue.length > 0) {
    const currentFile = queue.shift()
    if (!currentFile || visited.has(currentFile)) {
      continue
    }

    visited.add(currentFile)

    for (const importPath of getRuntimeImportSpecifiers(currentFile)) {
      if (importPath.startsWith('node:')) {
        nodeBuiltins.add(importPath)
        continue
      }

      const resolved = resolveLocalImport(currentFile, importPath)
      if (resolved) {
        queue.push(resolved)
      }
    }
  }

  return Array.from(nodeBuiltins).sort()
}

function getRuntimeImportSpecifiers(filePath: string): string[] {
  const source = readFileSync(filePath, 'utf8')
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const specifiers: string[] = []

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (statement.importClause?.isTypeOnly) {
        continue
      }

      const text = getStringLiteralText(statement.moduleSpecifier)
      if (text) {
        specifiers.push(text)
      }

      continue
    }

    if (ts.isExportDeclaration(statement) && !statement.isTypeOnly) {
      const text = statement.moduleSpecifier ? getStringLiteralText(statement.moduleSpecifier) : null
      if (text) {
        specifiers.push(text)
      }
    }
  }

  return specifiers
}

function getStringLiteralText(node: ts.Expression): string | null {
  return ts.isStringLiteral(node) ? node.text : null
}

function resolveLocalImport(fromFile: string, importPath: string): string | null {
  if (importPath.startsWith('.')) {
    return resolveWithExtensions(path.resolve(path.dirname(fromFile), importPath))
  }

  for (const [aliasPrefix, aliasRoot] of Object.entries(aliasRoots)) {
    if (importPath.startsWith(aliasPrefix)) {
      const relativePath = importPath.slice(aliasPrefix.length)
      return resolveWithExtensions(path.join(aliasRoot, relativePath))
    }
  }

  return null
}

function resolveWithExtensions(basePath: string): string | null {
  for (const extension of fileExtensions) {
    const candidate = `${basePath}${extension}`
    if (ts.sys.fileExists(candidate)) {
      return candidate
    }
  }

  for (const extension of fileExtensions) {
    const indexCandidate = path.join(basePath, `index${extension}`)
    if (ts.sys.fileExists(indexCandidate)) {
      return indexCandidate
    }
  }

  return null
}
