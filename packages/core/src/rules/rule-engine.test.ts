import { describe, it, expect } from 'vitest'
import { runRules } from './rule-engine.js'
import type { Rule } from './define-rule.js'
import type { DiffFile } from '../diff/hunk-model.js'
import type { Finding } from '../findings/finding.js'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'TEST-001',
    severity: 'high',
    file: 'test.ts',
    title: 'Test finding',
    evidence: ['test evidence'],
    why: 'test reason',
    review: ['review step'],
    test: ['test step'],
    ...overrides,
  }
}

function makeFile(path: string, overrides: Partial<DiffFile> = {}): DiffFile {
  return {
    path,
    hunks: [],
    ...overrides,
  }
}

describe('runRules', () => {
  it('returns empty array when no files or rules', () => {
    expect(runRules([], [])).toEqual([])
  })

  it('returns empty array when no rules match', () => {
    const files: DiffFile[] = [makeFile('src/index.ts')]
    const rules: Rule[] = [{
      id: 'TEST-001',
      severity: 'high',
      preset: 'test',
      match: ['**/middleware.ts'],
      analyze: () => [makeFinding()],
    }]

    expect(runRules(files, rules)).toEqual([])
  })

  it('runs matching rule against a file', () => {
    const files: DiffFile[] = [makeFile('middleware.ts')]
    const finding = makeFinding({ file: 'middleware.ts' })
    const rules: Rule[] = [{
      id: 'TEST-001',
      severity: 'high',
      preset: 'test',
      match: ['**/middleware.ts'],
      analyze: () => [finding],
    }]

    const result = runRules(files, rules)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(finding)
  })

  it('matches glob patterns correctly', () => {
    const files: DiffFile[] = [
      makeFile('middleware.ts'),
      makeFile('src/middleware.ts'),
      makeFile('src/app/middleware.ts'),
      makeFile('src/auth.ts'),
    ]
    const rules: Rule[] = [{
      id: 'TEST-001',
      severity: 'medium',
      preset: 'test',
      match: ['**/middleware.ts'],
      analyze: (file) => [makeFinding({ file: file.path })],
    }]

    const result = runRules(files, rules)
    expect(result).toHaveLength(3)
    expect(result.map(f => f.file)).toEqual([
      'middleware.ts',
      'src/middleware.ts',
      'src/app/middleware.ts',
    ])
  })

  it('runs multiple rules against the same file', () => {
    const files: DiffFile[] = [makeFile('middleware.ts')]
    const rules: Rule[] = [
      {
        id: 'RULE-1',
        severity: 'high',
        preset: 'test',
        match: ['**/middleware.ts'],
        analyze: (file) => [makeFinding({ id: 'RULE-1', file: file.path })],
      },
      {
        id: 'RULE-2',
        severity: 'critical',
        preset: 'test',
        match: ['**/middleware.ts'],
        analyze: (file) => [makeFinding({ id: 'RULE-2', severity: 'critical', file: file.path })],
      },
    ]

    const result = runRules(files, rules)
    expect(result).toHaveLength(2)
    // Sorted by severity: critical first
    expect(result[0].id).toBe('RULE-2')
    expect(result[1].id).toBe('RULE-1')
  })

  it('sorts findings by severity (critical > high > medium > low)', () => {
    const files: DiffFile[] = [makeFile('file.ts')]
    const rules: Rule[] = [
      {
        id: 'LOW',
        severity: 'low',
        preset: 'test',
        match: ['**/file.ts'],
        analyze: (file) => [makeFinding({ id: 'LOW', severity: 'low', file: file.path })],
      },
      {
        id: 'CRITICAL',
        severity: 'critical',
        preset: 'test',
        match: ['**/file.ts'],
        analyze: (file) => [makeFinding({ id: 'CRITICAL', severity: 'critical', file: file.path })],
      },
      {
        id: 'MEDIUM',
        severity: 'medium',
        preset: 'test',
        match: ['**/file.ts'],
        analyze: (file) => [makeFinding({ id: 'MEDIUM', severity: 'medium', file: file.path })],
      },
      {
        id: 'HIGH',
        severity: 'high',
        preset: 'test',
        match: ['**/file.ts'],
        analyze: (file) => [makeFinding({ id: 'HIGH', severity: 'high', file: file.path })],
      },
    ]

    const result = runRules(files, rules)
    expect(result.map(f => f.id)).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
  })

  it('preserves file order within the same severity', () => {
    const files: DiffFile[] = [
      makeFile('a.ts'),
      makeFile('b.ts'),
      makeFile('c.ts'),
    ]
    const rules: Rule[] = [{
      id: 'TEST',
      severity: 'medium',
      preset: 'test',
      match: ['**/*.ts'],
      analyze: (file) => [makeFinding({ file: file.path, severity: 'medium' })],
    }]

    const result = runRules(files, rules)
    expect(result.map(f => f.file)).toEqual(['a.ts', 'b.ts', 'c.ts'])
  })

  it('allows zero findings from a rule', () => {
    const files: DiffFile[] = [makeFile('middleware.ts')]
    const rules: Rule[] = [{
      id: 'TEST',
      severity: 'high',
      preset: 'test',
      match: ['**/middleware.ts'],
      analyze: () => [],
    }]

    expect(runRules(files, rules)).toEqual([])
  })

  it('allows multiple findings from a single rule on one file', () => {
    const files: DiffFile[] = [makeFile('middleware.ts')]
    const rules: Rule[] = [{
      id: 'TEST',
      severity: 'high',
      preset: 'test',
      match: ['**/middleware.ts'],
      analyze: (file) => [
        makeFinding({ id: 'TEST-1', file: file.path }),
        makeFinding({ id: 'TEST-2', file: file.path }),
      ],
    }]

    const result = runRules(files, rules)
    expect(result).toHaveLength(2)
    expect(result.map(f => f.id)).toEqual(['TEST-1', 'TEST-2'])
  })

  it('does not mutate DiffFile input', () => {
    const file: DiffFile = {
      path: 'middleware.ts',
      hunks: [{
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 3,
        lines: [
          { type: 'context', content: 'line1', oldLine: 1, newLine: 1 },
          { type: 'removed', content: 'line2', oldLine: 2 },
          { type: 'added', content: 'line3', newLine: 2 },
        ],
      }],
    }

    const fileCopy = JSON.parse(JSON.stringify(file))
    const rules: Rule[] = [{
      id: 'TEST',
      severity: 'high',
      preset: 'test',
      match: ['**/middleware.ts'],
      analyze: () => [makeFinding()],
    }]

    runRules([file], rules)

    expect(file).toEqual(fileCopy)
  })

  it('matches exact filename pattern', () => {
    const files: DiffFile[] = [
      makeFile('middleware.ts'),
      makeFile('src/middleware.ts'),
    ]
    const rules: Rule[] = [{
      id: 'TEST',
      severity: 'low',
      preset: 'test',
      match: ['middleware.ts'],
      analyze: (file) => [makeFinding({ file: file.path })],
    }]

    const result = runRules(files, rules)
    // Only exact match (no path prefix)
    expect(result).toHaveLength(1)
    expect(result[0].file).toBe('middleware.ts')
  })

  it('returns flat Finding array from multiple files and rules', () => {
    const files: DiffFile[] = [
      makeFile('a.ts'),
      makeFile('b.ts'),
    ]
    const rules: Rule[] = [{
      id: 'TEST',
      severity: 'medium',
      preset: 'test',
      match: ['**/*.ts'],
      analyze: (file) => [
        makeFinding({ file: file.path, title: `Finding in ${file.path}` }),
      ],
    }]

    const result = runRules(files, rules)
    expect(result).toHaveLength(2)
    expect(Array.isArray(result)).toBe(true)
  })
})
