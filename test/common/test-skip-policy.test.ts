import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
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
  assert.throws(() => createSkipPolicy(true)({ name, skip: reason }), /UNEXPECTED_TEST_SKIP/);
  assert.doesNotThrow(() => createSkipPolicy(false)({ name: 'normal test', skip: false }));
  assert.doesNotThrow(() => createSkipPolicy(false)({ name: 'normal test' }));
});

// protects=real CLI execution and failure propagation, including symlink entry aliases;
// fails_when=tests are bypassed or assertion/import/skip failures return zero;
// no_claim=does not verify the CI installer, private knowledge, or GitHub runner.
test('test CLI executes canonical and aliased entrypoints and rejects failed or skipped fixtures', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'rab-runner-contract-')));
  const alias = `${root}-alias`;
  try {
    mkdirSync(join(root, 'scripts/test'), { recursive: true });
    mkdirSync(join(root, 'test'));
    copyFileSync(new URL('../../scripts/test/run.ts', import.meta.url), join(root, 'scripts/test/run.ts'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    symlinkSync(root, alias, 'dir');
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const fixture = join(root, 'test/probe.test.ts');
    const cases = [
      { body: "import {test} from 'node:test'; test('synthetic clean',()=>{});", status: 0, text: 'synthetic clean' },
      { body: "import {test} from 'node:test'; test('synthetic failure',()=>{throw new Error('synthetic assertion failed')});", status: 1, text: 'synthetic assertion failed' },
      { body: "import {test} from 'node:test'; test.skip('synthetic unknown skip',()=>{});", status: 1, text: 'UNEXPECTED_TEST_SKIP' },
      { body: "import './does-not-exist.ts';", status: 1, text: 'does-not-exist' },
    ];
    for (const entry of [root, alias]) for (const scenario of cases) {
      writeFileSync(fixture, scenario.body);
      const result = spawnSync(process.execPath, [join(entry, 'scripts/test/run.ts')], { cwd: root, env, encoding: 'utf8', timeout: 10_000 });
      assert.ifError(result.error);
      assert.equal(result.status, scenario.status, result.stdout + result.stderr);
      assert.ok((result.stdout + result.stderr).includes(scenario.text), result.stdout + result.stderr);
    }
  } finally {
    if (existsSync(alias)) unlinkSync(alias);
    rmSync(root, { recursive: true, force: true });
  }
});
