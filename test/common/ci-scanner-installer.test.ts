import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

// Value: protects=only a downloaded, checksum-matching, version-matching scanner reaches GITHUB_PATH;
// fails_when=bad pins/download/digest/version are accepted or valid installation cannot finish;
// why_new=no existing test exercises scanner installation failure paths; seam=none;
// no_claim=synthetic local archive and mocked download/platform do not prove the official Linux artifact or GitHub execution.
test('CI scanner installer fails closed at real shell boundaries and publishes only a verified version', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'rab-scanner-installer-')));
  const pins = JSON.parse(readFileSync(new URL('../../config/tooling-pins.json', import.meta.url), 'utf8')) as { gitleaks: string };
  const command = (path: string, body: string) => { writeFileSync(path, `#!/bin/sh\nset -eu\n${body}\n`); chmodSync(path, 0o755); };
  const invoke = (cmd: string, args: string[], cwd: string) => {
    const result = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 10_000 });
    assert.ifError(result.error); assert.equal(result.status, 0, result.stderr); return result;
  };
  try {
    const tools = join(root, 'tools'); mkdirSync(tools);
    command(join(tools, 'uname'), 'case "${1:-}" in -s) printf "%s\\n" "$TEST_OS";; -m) printf "%s\\n" x86_64;; *) exit 1;; esac');
    command(join(tools, 'curl'), 'printf "download\\n" >> "$TEST_DOWNLOAD_LOG"\n[ "$TEST_DOWNLOAD_FAIL" = 0 ] || exit 22\nwhile [ "$#" -gt 0 ]; do if [ "$1" = --output ]; then cp "$TEST_ARCHIVE" "$2"; exit 0; fi; shift; done\nexit 1');
    // Coreutils is present on the CI host; this portability stand-in uses an independent SHA-256 calculation locally.
    command(join(tools, 'sha256sum'), 'while read -r expected file; do actual=$(shasum -a 256 "$file"); actual=${actual%% *}; [ "$actual" = "$expected" ] || exit 1; done');
    const scenarios = ['valid', 'bad-pin', 'bad-digest', 'download-failure', 'wrong-version', 'wrong-platform', 'missing-runner-temp', 'missing-github-path'] as const;
    for (const scenario of scenarios) {
      const cwd = join(root, scenario); mkdirSync(join(cwd, 'config'), { recursive: true });
      const payload = join(cwd, 'payload'); mkdirSync(payload);
      command(join(payload, 'gitleaks'), `printf '%s\\n' '${scenario === 'wrong-version' ? '0.0.0' : pins.gitleaks}'`);
      const archive = join(cwd, 'fixture.tar.gz'); invoke('tar', ['-czf', archive, 'gitleaks'], payload);
      const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
      writeFileSync(join(cwd, 'config/tooling-pins.json'), JSON.stringify({ gitleaks: scenario === 'bad-pin' ? 'invalid' : pins.gitleaks,
        gitleaksLinuxX64Sha256: scenario === 'bad-digest' ? '0'.repeat(64) : digest }));
      const script = join(cwd, 'install.sh'); copyFileSync(new URL('../../.github/scripts/install-gitleaks.sh', import.meta.url), script);
      const githubPath = join(cwd, 'github-path'); const runnerTemp = join(cwd, 'runner'); mkdirSync(runnerTemp);
      const env = { ...process.env, PATH: `${tools}:${dirname(process.execPath)}:${process.env.PATH ?? ''}`, RUNNER_TEMP: runnerTemp,
        GITHUB_PATH: githubPath, TEST_OS: scenario === 'wrong-platform' ? 'Darwin' : 'Linux', TEST_ARCHIVE: archive,
        TEST_DOWNLOAD_LOG: join(cwd, 'download.log'), TEST_DOWNLOAD_FAIL: scenario === 'download-failure' ? '1' : '0' };
      if (scenario === 'missing-runner-temp') delete (env as Partial<typeof env>).RUNNER_TEMP;
      if (scenario === 'missing-github-path') delete (env as Partial<typeof env>).GITHUB_PATH;
      const result = spawnSync('bash', [script], { cwd, env, encoding: 'utf8', timeout: 10_000 });
      assert.ifError(result.error);
      if (scenario === 'valid') {
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.equal(readFileSync(githubPath, 'utf8'), `${join(runnerTemp, 'rent-a-brain-bin')}\n`);
        assert.equal(invoke(join(runnerTemp, 'rent-a-brain-bin/gitleaks'), ['version'], cwd).stdout.trim(), pins.gitleaks);
      } else {
        assert.notEqual(result.status, 0, scenario);
        assert.equal(existsSync(githubPath), false, scenario);
        if (['bad-pin', 'bad-digest', 'download-failure', 'wrong-platform'].includes(scenario)) {
          assert.equal(existsSync(join(runnerTemp, 'rent-a-brain-bin/gitleaks')), false, scenario);
        }
      }
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
