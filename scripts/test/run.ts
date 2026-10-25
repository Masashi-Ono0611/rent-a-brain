import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from 'node:test';
import { spec } from 'node:test/reporters';
const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
export const privateFixtureSkips = Object.freeze([
  'real seller extraction: approved B/C spans identical; hidden resolution never enters either knowledge return',
  'sealed and source mutations fail closed; exact approved source and signature restored pass',
]);
interface SkipEvent { readonly name: string; readonly file?: string; readonly skip?: string | boolean; readonly todo?: string | boolean }
/** A skipped test is not a pass. Only the reviewed public-export omissions qualify. */
export function createSkipPolicy(publicExport: boolean): (event: SkipEvent) => void {
  const seen = new Set<string>();
  return event => {
    if (event.todo) throw new Error(`UNEXPECTED_TEST_TODO: ${event.name}`);
    if (event.skip === undefined || event.skip === false) return;
    if (!publicExport || event.file === undefined || resolve(event.file) !== resolve(root, 'test/replay/host-knowledge.test.ts') ||
        !privateFixtureSkips.includes(event.name) || event.skip !== 'needs the private approved lesson fixtures (not in the public export)' || seen.has(event.name)) {
      throw new Error(`UNEXPECTED_TEST_SKIP: ${event.name}`);
    }
    seen.add(event.name);
  };
}
function discover(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? discover(join(path, entry.name)) : entry.isFile() && entry.name.endsWith('.test.ts') ? [join(path, entry.name)] : []);
}
// Bare `node --test` discovers this directory too. Never recursively launch
// from a test child; npm test is the authoritative explicit-file invocation.
// Node 24.13 supplies native entry identity, including --preserve-symlinks-main.
if (process.env.NODE_TEST_CONTEXT === undefined && (import.meta as ImportMeta & { readonly main: boolean }).main) {
  const files = discover(join(root, 'test')).sort();
  if (files.length === 0) throw new Error('NO_TESTS_FOUND');
  const checkSkip = createSkipPolicy(existsSync(join(root, 'PUBLIC_EXPORT')));
  const stream = run({ files, cwd: root });
  let failed = false;
  stream.on('test:fail', () => { failed = true; });
  stream.on('test:pass', event => {
    try { checkSkip(event); }
    catch (error) { failed = true; console.error((error as Error).message); }
  });
  stream.on('error', error => { failed = true; console.error(error.message); process.exitCode = 1; });
  stream.on('end', () => { if (failed) process.exitCode = 1; });
  stream.compose(new spec()).pipe(process.stdout);
}
