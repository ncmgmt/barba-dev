# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Runner:**
- Node.js native test runner (`node:test`)
- Version: Uses `require('node:test')`
- Config: `.planning/test/gsd-tools.test.js` (found in `.claude/get-shit-done/bin/gsd-tools.test.js`)

**Assertion Library:**
- Node.js native `require('node:assert')`
- Uses `assert.ok()`, `assert.strictEqual()`, `assert.deepStrictEqual()`, `assert.deepEqual()`

**Run Commands:**
```bash
node .claude/get-shit-done/bin/gsd-tools.test.js  # Run all tests
```

## Test File Organization

**Location:**
- Co-located in same directory as source: `.claude/get-shit-done/bin/gsd-tools.test.js`
- Test file mirrors module name + `.test.js` suffix

**Naming:**
- Test file: `{module}.test.js`
- Suite names: descriptive strings in `describe()`
- Test cases: `test('descriptive name', () => { ... })`

**Structure:**
```
.claude/get-shit-done/bin/
├── gsd-tools.js          # Source module
└── gsd-tools.test.js     # Test suite
```

## Test Structure

**Suite Organization:**
All tests use describe blocks organized by feature area:

```javascript
const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');

describe('feature-name command', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('does specific thing', () => {
    // Test code
  });
});
```

**Patterns:**
- Setup (beforeEach): Create temporary filesystem structures
- Teardown (afterEach): Clean up temporary directories with `fs.rmSync()`
- Isolation: Each test runs in own temporary directory
- Sequential execution: Tests run serially within suite

## Test Structure Examples

**Basic Test Pattern:**
```javascript
test('empty phases directory returns empty array', () => {
  const result = runGsdTools('phases list', tmpDir);
  assert.ok(result.success, `Command failed: ${result.error}`);

  const output = JSON.parse(result.output);
  assert.deepStrictEqual(output.directories, [], 'directories should be empty');
  assert.strictEqual(output.count, 0, 'count should be 0');
});
```

**File I/O Test Pattern:**
```javascript
test('extracts all fields from SUMMARY.md', () => {
  const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
  fs.mkdirSync(phaseDir, { recursive: true });

  fs.writeFileSync(
    path.join(phaseDir, '01-01-SUMMARY.md'),
    `---\none-liner: Set up database\n---\n# Summary`
  );

  const result = runGsdTools('summary-extract .planning/phases/01-foundation/01-01-SUMMARY.md', tmpDir);
  assert.ok(result.success, `Command failed: ${result.error}`);

  const output = JSON.parse(result.output);
  assert.strictEqual(output.one_liner, 'Set up database', 'one-liner extracted');
});
```

**Error Handling Test Pattern:**
```javascript
test('fails for nonexistent todo', () => {
  const result = runGsdTools('todo complete nonexistent.md', tmpDir);
  assert.ok(!result.success, 'should fail');
  assert.ok(result.error.includes('not found'), 'error mentions not found');
});
```

## Test Utilities

**Helper Functions:**
```javascript
// Run command via child process
function runGsdTools(args, cwd = process.cwd()) {
  try {
    const result = execSync(`node "${TOOLS_PATH}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return {
      success: false,
      output: err.stdout?.toString().trim() || '',
      error: err.stderr?.toString().trim() || err.message,
    };
  }
}

// Create temporary test project structure
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gsd-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}

// Cleanup after test
function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
```

## Mocking

**Approach:**
- No external mocking library (no Jest, Sinon)
- Real filesystem operations for integration testing
- Temporary directories (`fs.mkdtempSync()`) isolate tests
- Command invocation via `execSync()` tests entire module

**Mocking Pattern:**
Real file I/O is preferred for CLI/tool testing:
```javascript
// Create test data on disk
const phaseDir = path.join(tmpDir, '.planning', 'phases', '01-foundation');
fs.mkdirSync(phaseDir, { recursive: true });
fs.writeFileSync(path.join(phaseDir, '01-01-PLAN.md'), '# Plan');

// Run command
const result = runGsdTools('phase-plan-index 01', tmpDir);

// Verify via filesystem
assert.ok(fs.existsSync(path.join(tmpDir, '.planning', 'phases', '01-foundation')));
```

**What NOT to Mock:**
- Filesystem operations (test against real files)
- Child process execution (test actual command behavior)
- JSON parsing (verify actual output format)

## Fixtures and Factories

**Test Data:**
Inline fixture creation in tests, no separate fixture files:
```javascript
fs.writeFileSync(
  path.join(phaseDir, '01-01-SUMMARY.md'),
  `---
phase: "01"
provides:
  - "Database"
patterns-established:
  - "Pattern A"
---
# Summary content
`
);
```

**Factory Functions:**
```javascript
function createTempProject() {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'gsd-test-'));
  fs.mkdirSync(path.join(tmpDir, '.planning', 'phases'), { recursive: true });
  return tmpDir;
}
```

**Location:**
- Helpers in test file itself (top-level functions)
- No separate fixtures directory
- Test data embedded in test blocks for clarity

## Coverage

**Requirements:** None enforced

**View Coverage:**
- No coverage tool configured
- Tests are integration-focused (CLI commands)
- Success determined by return value + filesystem state verification

## Test Types

**Unit Tests:**
- Not typical for this codebase
- CLI tool testing is integration-focused
- Individual functions tested via command output

**Integration Tests:**
- Dominant test type: `describe('history-digest command', ()` tests end-to-end CLI invocations
- Real filesystem, temporary directories, subprocess execution
- Verify: command success, output format, file creation, state transitions

**E2E Tests:**
- Not used
- Integration tests with temporary filesystem serve this purpose

## Common Patterns

**Success Assertion:**
```javascript
test('command succeeds', () => {
  const result = runGsdTools('some-command', tmpDir);
  assert.ok(result.success, `Command failed: ${result.error}`);

  const output = JSON.parse(result.output);
  assert.strictEqual(output.expected_field, expected_value);
});
```

**Error Testing:**
```javascript
test('handles missing file gracefully', () => {
  const result = runGsdTools('some-command', tmpDir);
  assert.ok(result.success, `Command should succeed: ${result.error}`);

  const output = JSON.parse(result.output);
  assert.strictEqual(output.error, 'File not found', 'error reported');
});
```

**Filesystem State Verification:**
```javascript
test('creates directory', () => {
  const result = runGsdTools('scaffold phase-dir --phase 5 --name Test', tmpDir);
  assert.ok(result.success);

  assert.ok(
    fs.existsSync(path.join(tmpDir, '.planning', 'phases', '05-test')),
    'directory should be created'
  );
});
```

**YAML/Markdown Parsing:**
```javascript
test('extracts frontmatter fields', () => {
  fs.writeFileSync(
    path.join(tmpDir, '01-01-SUMMARY.md'),
    `---
one-liner: Description
key-files:
  - file1.ts
  - file2.ts
---
# Content
`
  );

  const result = runGsdTools('summary-extract 01-01-SUMMARY.md', tmpDir);
  const output = JSON.parse(result.output);

  assert.strictEqual(output.one_liner, 'Description');
  assert.deepStrictEqual(output.key_files, ['file1.ts', 'file2.ts']);
});
```

**Multiple Test Suites in One File:**
The test file contains 20+ describe blocks, each testing a different CLI command:
- `history-digest command`
- `phases list command`
- `roadmap get-phase command`
- `phase next-decimal command`
- `phase-plan-index command`
- `state-snapshot command`
- `summary-extract command`
- `init commands with --include flag`
- `roadmap analyze command`
- `phase add command`
- `phase insert command`
- `phase remove command`
- `phase complete command`
- `milestone complete command`
- `validate consistency command`
- `progress command`
- `todo complete command`
- `scaffold command`

---

*Testing analysis: 2026-02-08*
