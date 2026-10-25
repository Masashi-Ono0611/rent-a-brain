import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createSkipPolicy, privateFixtureSkips } from '../../scripts/test/run.ts';

const file = fileURLToPath(new URL('../replay/host-knowledge.test.ts', import.meta.url));
const reason = 'needs the private approved lesson fixtures (not in the public export)';

// protects=reviewed public omissions remain explicit; fails_when=unknown skips pass;
// no_claim=does not prove the private fixtures or GitHub Actions execution.
test('public export permits only the two exact private-fixture omissions', () => {
  const policy = createSkipPolicy(true);
  for (const name of privateFixtureSkips) assert.doesNotThrow(() => policy({ name, file, skip: reason }));
  assert.throws(() => policy({ name: 'new silently skipped test', file, skip: reason }), /UNEXPECTED_TEST_SKIP/);
  assert.throws(() => policy({ name: privateFixtureSkips[0]!, file, skip: reason }), /UNEXPECTED_TEST_SKIP/);
});

// protects=file/reason/export binding; fails_when=an unrelated skip impersonates an omission;
// no_claim=does not prove suite coverage or service behavior.
test('full trees, forged paths and changed skip reasons fail closed; unskipped tests pass', () => {
  const name = privateFixtureSkips[0]!;
  assert.throws(() => createSkipPolicy(false)({ name, file, skip: reason }), /UNEXPECTED_TEST_SKIP/);
  assert.throws(() => createSkipPolicy(true)({ name, file: file.replace('host-knowledge', 'unrelated'), skip: reason }), /UNEXPECTED_TEST_SKIP/);
  assert.throws(() => createSkipPolicy(true)({ name, file, skip: 'temporary' }), /UNEXPECTED_TEST_SKIP/);
  assert.throws(() => createSkipPolicy(true)({ name, file, skip: true }), /UNEXPECTED_TEST_SKIP/);
  assert.doesNotThrow(() => createSkipPolicy(false)({ name: 'normal test' }));
});
