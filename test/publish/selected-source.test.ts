import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectedSliceDraft } from '../../src/publish/index.ts';
import type { SelectedPage, SelectedSourcePage, SelectedSourceRead, SelectedSourceReader, SelectedSourceRequest } from '../../src/publish/index.ts';
import { bytesHash, canonicalBytes } from '../../src/wire/index.ts';
import type { IsoTime } from '../../src/wire/contracts.ts';

const at = '2026-10-26T00:00:00.000Z' as IsoTime;
const scope = { brain: 'synthetic-operator-brain', source: 'chosen-source' };
const selection: SelectedPage = { pageId: 'private-page-one', revision: 'selected-r7', publicId: '519de3c0-e490-4b85-a8b1-8699fb1e0884' };
const second: SelectedPage = { pageId: 'private-page-two', revision: 'selected-r2', publicId: 'c70c6a7f-24ee-49f3-9ab3-b4ee52b06cf2' };
const request = (selected: readonly SelectedPage[] = [selection]): SelectedSourceRequest => ({ scope, selected, clock: { now: () => at }, maxReadAgeMs: 1000 });
function page(selected = selection): SelectedSourcePage {
  return { status: 'ok', scope: { ...scope }, pageId: selected.pageId, revision: selected.revision, observedAt: at,
    text: '# Synthetic local example\n\nObserve the exact result. 日本語 🧠\n',
    metadata: { origin: 'synthetic', visibility: 'public', ownership: 'seller', sensitivity: 'none', rights: 'permitted-for-local-review', license: 'synthetic-unreviewed-terms' },
    lineage: { slug: 'private-lineage-canary', path: 'local-only-canary', edges: ['excluded-page-canary'], backlinks: ['excluded-backlink-canary'], excludedPageCount: 99 } };
}
function reader(transform: (value: SelectedSourcePage, call: number) => SelectedSourceRead = value => value): SelectedSourceReader & { calls: unknown[] } {
  const calls: unknown[] = [];
  return { calls, async read(input) { calls.push(structuredClone(input)); return transform(page(input.pageId === second.pageId ? second : selection), calls.length); } };
}

// Value: protects=exact bounded selection and a separate inert allowlisted draft;
// fails_when=scope expands or private metadata becomes public or draft resembles an approved bundle;
// why_new=existing publisher starts from an already prepared projection; seam=none;
// no_claim=synthetic adapter does not prove native isolation, rights or owner approval.
test('selected local source produces only opaque exact-byte draft pages and private reviewer evidence', async () => {
  const adapter = reader(); const result = await createSelectedSliceDraft(adapter, request([second, selection]));
  assert.equal(result.kind, 'local-selected-source-draft'); assert.equal(result.state, 'requires-human-review');
  assert.equal(result.publicProjection?.kind, 'unapproved-selected-slice-draft');
  assert.deepEqual(adapter.calls, [selection, second, selection, second].map(value => ({ scope, pageId: value.pageId, revision: value.revision })));
  assert.deepEqual(Object.keys(result.publicProjection!).sort(), ['kind', 'pages', 'v']);
  assert.equal(result.publicProjection!.pages.length, 2);
  for (const publicPage of result.publicProjection!.pages) {
    assert.deepEqual(Object.keys(publicPage).sort(), ['page_id', 'sha256', 'size_bytes', 'text']);
    assert.equal(publicPage.text, page().text); assert.equal(publicPage.sha256, bytesHash(Buffer.from(page().text)));
    assert.equal(publicPage.size_bytes, Buffer.byteLength(page().text));
  }
  const encoded = Buffer.from(canonicalBytes(result.publicProjection)).toString();
  for (const canary of [scope.brain, scope.source, selection.pageId, selection.revision, 'private-lineage-canary', 'local-only-canary', 'excluded-page-canary', 'excluded-backlink-canary', 'excludedPageCount', 'synthetic-unreviewed-terms']) assert.ok(!encoded.includes(canary), canary);
  assert.equal(result.privateCandidate.pages[0]!.source.lineage.slug, 'private-lineage-canary');
  assert.equal(result.privateCandidate.pages[0]!.source.metadata.license, 'synthetic-unreviewed-terms');
  assert.equal('manifest' in result, false); assert.equal('approval' in result, false); assert.equal('worksheet' in result, false);
});

// Value: protects=missing denied stale and mismatched exact source reads stop without fallback;
// fails_when=read failure widens source or leaks an adapter error; why_new=no selected-source boundary existed;
// seam=none; no_claim=source denial is synthetic, not a native gbrain permission proof.
test('unavailable or mismatched reads fail closed without retries or widening, and restored reads pass', async () => {
  const mutations: readonly ((value: SelectedSourcePage) => SelectedSourceRead)[] = [
    () => ({ status: 'missing' }), () => ({ status: 'denied' }), () => ({ status: 'stale' }),
    value => ({ ...value, scope: { ...scope, source: 'other-source' } }),
    value => ({ ...value, scope: { ...scope, brain: 'other-brain' } }),
    value => ({ ...value, pageId: 'other-page' }), value => ({ ...value, revision: 'new-r8' }),
    value => ({ ...value, observedAt: '2026-10-25T23:59:58.999Z' }),
    value => ({ ...value, observedAt: '2026-10-26T00:00:00.001Z' }),
  ];
  for (const mutate of mutations) {
    const adapter = reader(mutate);
    await assert.rejects(createSelectedSliceDraft(adapter, request()), /SELECTED_SOURCE_(UNAVAILABLE|BINDING_CHANGED|STALE)/);
    assert.equal(adapter.calls.length, 1);
    assert.equal((await createSelectedSliceDraft(reader(), request())).state, 'requires-human-review');
  }
  await assert.rejects(createSelectedSliceDraft({ async read() { throw new Error('private adapter error canary'); } }, request()), error => error instanceof Error && error.message === 'SELECTED_SOURCE_READ_FAILED');
});

// Value: protects=selected revision and bytes remain stable throughout collection;
// fails_when=a revision race or same-revision content/rights/lineage mutation is accepted;
// why_new=single prepared-file admission does not exercise a changing source; seam=none;
// no_claim=two reads are not a source transaction or a guarantee against later changes.
test('second exact pass rejects revision, content and metadata races; caller mutation cannot widen selection', async () => {
  const mutations = [
    (value: SelectedSourcePage) => ({ ...value, revision: 'changed-r8' }),
    (value: SelectedSourcePage) => ({ ...value, text: 'Substituted content.' }),
    (value: SelectedSourcePage) => ({ ...value, metadata: { ...value.metadata, rights: 'unknown' } }),
    (value: SelectedSourcePage) => ({ ...value, lineage: { slug: 'changed-lineage' } }),
  ];
  for (const mutate of mutations) {
    const adapter = reader((value, call) => call === 2 ? mutate(value) : value);
    await assert.rejects(createSelectedSliceDraft(adapter, request()), /SELECTED_SOURCE_(BINDING_CHANGED|CHANGED_DURING_READ)/);
    assert.equal(adapter.calls.length, 2);
    assert.equal((await createSelectedSliceDraft(reader(), request())).state, 'requires-human-review');
  }
  const config = { ...request(), scope: { ...scope }, selected: [{ ...selection }] };
  const adapter = reader(value => { config.scope.source = 'other-source'; config.selected.push({ ...second }); return value; });
  const result = await createSelectedSliceDraft(adapter, config);
  assert.equal(result.privateCandidate.pages.length, 1);
  assert.deepEqual(adapter.calls, Array.from({ length: 2 }, () => ({ scope, pageId: selection.pageId, revision: selection.revision })));
});

// Value: protects=unknown review fields and known private references cannot produce a projection;
// fails_when=rights aliases or private scope and nested lineage references bypass draft review;
// why_new=source records can be unreviewed unlike legacy approved worksheets; seam=none;
// no_claim=markers are incomplete and a clean synthetic draft is not consent or a licence grant.
test('unreviewed metadata and unsafe text remain private, blocked and visible for remediation', async () => {
  const cases: readonly (readonly [string, (value: SelectedSourcePage) => SelectedSourcePage])[] = [
    ...(['origin', 'visibility', 'ownership', 'sensitivity', 'rights', 'license'] as const).map(field => [field, (value: SelectedSourcePage) => ({ ...value, metadata: { ...value.metadata, [field]: 'unknown' } })] as const),
    ['origin', value => ({ ...value, metadata: { ...value.metadata, origin: 'business' } })],
    ['license', value => ({ ...value, metadata: { ...value.metadata, license: null } })],
    ...['[[excluded-page-canary]]', 'https://example.invalid/private-canary', 'AAB_PRIVATE_CANARY', 'derived_from hidden-page'].map(text => ['text-requires-review', (value: SelectedSourcePage) => ({ ...value, text })] as const),
    ...[scope.brain, scope.source, selection.pageId, selection.revision, 'private-lineage-canary', 'local-only-canary', 'excluded-page-canary', 'excluded-backlink-canary'].map(reference => ['private-reference', (value: SelectedSourcePage) => ({ ...value, text: `A plain reference to ${reference}.` })] as const),
    ['private-reference', value => ({ ...value, text: 'A plain reference to deeply-nested-canary.', lineage: { nested: [{ deeper: ['deeply-nested-canary'] }] } })],
    ...[' Unknown ', ' N/A ', ' NoAssertion '].map(license => ['license', (value: SelectedSourcePage) => ({ ...value, metadata: { ...value.metadata, license } })] as const),
  ];
  for (const [blocker, mutate] of cases) {
    const source = mutate(page()); const result = await createSelectedSliceDraft(reader(mutate), request());
    assert.equal(result.state, 'blocked', blocker); assert.equal(result.publicProjection, null);
    assert.ok(result.privateCandidate.pages[0]!.blockers.includes(blocker));
    assert.deepEqual(result.privateCandidate.pages[0]!.source, source);
    assert.equal((await createSelectedSliceDraft(reader(), request())).state, 'requires-human-review');
  }
  const crossPage = await createSelectedSliceDraft(reader(value => ({ ...value, text: value.pageId === selection.pageId ? `A reference to ${second.pageId}.` : value.text })), request([selection, second]));
  assert.equal(crossPage.publicProjection, null);
  assert.ok(crossPage.privateCandidate.pages[0]!.blockers.includes('private-reference'));
  const nonReferences = await createSelectedSliceDraft(reader(value => ({ ...value, text: 'There are 99 synthetic observations.', lineage: { empty: '', excludedPageCount: 99 } })), request());
  assert.equal(nonReferences.state, 'requires-human-review');
  assert.equal(nonReferences.publicProjection!.pages[0]!.text, 'There are 99 synthetic observations.');
});

// Value: protects=excluded corpus replacement has no effect on selected public output;
// fails_when=excluded records graph topology or counts flow into projection; why_new=no source-selection noninterference test existed;
// seam=none; no_claim=the injected adapter cannot prove a native transport avoids corpus reads.
test('replacing excluded synthetic corpus and private graph evidence leaves public projection identical', async () => {
  const build = async (excluded: Record<string, string>, count: number) => {
    const reads: string[] = [];
    const adapter: SelectedSourceReader = { async read(input) {
      reads.push(input.pageId); assert.equal(input.pageId, selection.pageId);
      return { ...page(), lineage: { slug: 'private-lineage-canary', edges: Object.keys(excluded), excludedPageCount: count } };
    } };
    const draft = await createSelectedSliceDraft(adapter, request());
    assert.deepEqual(reads, [selection.pageId, selection.pageId]); return draft;
  };
  const first = await build({ 'excluded-canary-a': 'Do not export.' }, 1);
  const secondDraft = await build({ 'excluded-canary-b': 'Replacement.' }, 100000);
  assert.deepEqual(first.publicProjection, secondDraft.publicProjection);
  assert.notDeepEqual(first.privateCandidate, secondDraft.privateCandidate);
});

// Value: protects=bounded explicit operator selection rejects malformed or oversized input before disclosure;
// fails_when=selection limits duplicate bindings or response bounds disappear; why_new=legacy admission has no selected-source request;
// seam=none; no_claim=size and syntax guards do not classify arbitrary personal information.
test('invalid selection is rejected before reads; oversized or malformed source responses never become a draft', async () => {
  const invalid = [
    { ...request(), selected: [] }, { ...request(), scope: { ...scope, source: '' } },
    { ...request(), selected: [selection, selection] },
    { ...request(), selected: [selection, { ...second, publicId: selection.publicId }] },
    { ...request(), selected: [{ ...selection, publicId: selection.pageId }] },
    { ...request(), selected: [{ ...selection, revision: '' }] },
    { ...request(), maxReadAgeMs: 0 }, { ...request(), maxReadAgeMs: 60001 },
    { ...request(), selected: Array.from({ length: 11 }, () => selection) },
  ];
  for (const config of invalid) { const adapter = reader(); await assert.rejects(createSelectedSliceDraft(adapter, config)); assert.equal(adapter.calls.length, 0); }
  for (const mutate of [
    (value: SelectedSourcePage) => ({ ...value, text: 'x'.repeat(65537) }),
    (value: SelectedSourcePage) => ({ ...value, text: '\ud800' }),
    (value: SelectedSourcePage) => ({ ...value, lineage: { canary: 'x'.repeat(1048577) } }),
    (value: SelectedSourcePage) => ({ ...value, metadata: { ...value.metadata, unexpected: 'private-extra' } }),
    (value: SelectedSourcePage) => { const metadata: Record<string, unknown> = { ...value.metadata }; delete metadata.rights; return { ...value, metadata } as unknown as SelectedSourcePage; },
  ]) await assert.rejects(createSelectedSliceDraft(reader(mutate), request()));
  assert.equal((await createSelectedSliceDraft(reader(), request())).state, 'requires-human-review');
});
