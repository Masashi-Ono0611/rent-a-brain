import type { Clock } from '../wire/contracts.ts';
import { M03, bytesHash, canonicalBytes } from '../wire/index.ts';
import { encodeUtf8 } from '../common/index.ts';
import { guardText, record, requirePublish, time } from './validation.ts';

/** Operator configuration only. This port deliberately has no search/list/write operation. */
export interface SelectedSourceScope { readonly brain: string; readonly source: string }
export interface SelectedPage {
  readonly pageId: string; readonly revision: string;
  /** Fresh random UUID assigned by the operator, never a slug or a source-derived hash. */
  readonly publicId: string;
}
export interface SourceReviewMetadata {
  readonly origin: string; readonly visibility: string; readonly ownership: string;
  readonly sensitivity: string; readonly rights: string; readonly license: string | null;
}
export interface SelectedSourcePage {
  readonly status: 'ok'; readonly scope: SelectedSourceScope;
  readonly pageId: string; readonly revision: string; readonly observedAt: string;
  readonly text: string; readonly metadata: SourceReviewMetadata;
  /** Private reviewer evidence, including any slug/path/edges. Never copied into the projection. */
  readonly lineage: Readonly<Record<string, unknown>>;
}
export type SelectedSourceRead = SelectedSourcePage | { readonly status: 'missing' | 'denied' | 'stale' };
export interface SelectedSourceReader {
  /** Must read the exact source/page/revision without fallback, expansion, refresh or grants. */
  read(request: Readonly<{ scope: SelectedSourceScope; pageId: string; revision: string }>): Promise<SelectedSourceRead>;
}
export interface SelectedSourceRequest {
  readonly scope: SelectedSourceScope; readonly selected: readonly SelectedPage[];
  readonly clock: Pick<Clock, 'now'>;
  /** Local read freshness bound, chosen by the operator; at most one minute. */
  readonly maxReadAgeMs: number;
}
export interface SelectedPublicDraft {
  readonly v: 1; readonly kind: 'unapproved-selected-slice-draft';
  readonly pages: readonly { readonly page_id: string; readonly text: string; readonly sha256: string; readonly size_bytes: number }[];
}
export interface SelectedSliceDraft {
  readonly v: 1; readonly kind: 'local-selected-source-draft';
  readonly state: 'blocked' | 'requires-human-review';
  /** Null if any selected page needs metadata/text remediation. Never a publishable bundle. */
  readonly publicProjection: SelectedPublicDraft | null;
  readonly privateCandidate: {
    readonly scope: SelectedSourceScope;
    readonly pages: readonly { readonly selection: SelectedPage; readonly source: SelectedSourcePage; readonly blockers: readonly string[] }[];
  };
}

function boundedLabel(value: unknown): asserts value is string {
  requirePublish(typeof value === 'string' && value.trim().length > 0 && encodeUtf8(value).length <= 1024 && !/[\u0000-\u001f\u007f]/u.test(value), 'INVALID_SOURCE_SELECTION');
}
function scope(value: unknown): asserts value is SelectedSourceScope {
  const row = record(value, ['brain', 'source']); boundedLabel(row.brain); boundedLabel(row.source);
}
function sameScope(left: SelectedSourceScope, right: SelectedSourceScope): boolean { return left.brain === right.brain && left.source === right.source; }

/** In-memory operator core. No IO, model call, approval, signing, activation or listing. */
export async function createSelectedSliceDraft(reader: SelectedSourceReader, request: SelectedSourceRequest): Promise<SelectedSliceDraft> {
  scope(request.scope);
  requirePublish(Number.isSafeInteger(request.maxReadAgeMs) && request.maxReadAgeMs > 0 && request.maxReadAgeMs <= 60_000, 'INVALID_READ_FRESHNESS');
  requirePublish(Array.isArray(request.selected) && request.selected.length > 0 && request.selected.length <= M03.slicePagesMax.value, 'INVALID_SELECTED_PAGE_COUNT');
  const sourceScope = structuredClone(request.scope);
  const selected = structuredClone(request.selected);
  const pageIds = new Set<string>(); const publicIds = new Set<string>();
  for (const page of selected) {
    record(page, ['pageId', 'revision', 'publicId']); boundedLabel(page.pageId); boundedLabel(page.revision);
    requirePublish(typeof page.publicId === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(page.publicId) && page.publicId !== page.pageId && page.publicId !== page.revision, 'INVALID_OPAQUE_PUBLIC_ID');
    requirePublish(!pageIds.has(page.pageId) && !publicIds.has(page.publicId), 'DUPLICATE_SOURCE_SELECTION');
    pageIds.add(page.pageId); publicIds.add(page.publicId);
  }
  selected.sort((a, b) => a.publicId.localeCompare(b.publicId));
  const maxReadAgeMs = request.maxReadAgeMs;
  const read = async (selection: SelectedPage): Promise<SelectedSourcePage> => {
    let raw: SelectedSourceRead;
    try { raw = await reader.read(Object.freeze({ scope: Object.freeze({ ...sourceScope }), pageId: selection.pageId, revision: selection.revision })); }
    catch { throw new Error('SELECTED_SOURCE_READ_FAILED'); } // Never echo adapter/private content.
    requirePublish(raw !== null && typeof raw === 'object', 'INVALID_SOURCE_RESPONSE');
    requirePublish(raw.status === 'ok', 'SELECTED_SOURCE_UNAVAILABLE');
    const row = record(raw, ['status', 'scope', 'pageId', 'revision', 'observedAt', 'text', 'metadata', 'lineage']);
    scope(row.scope);
    requirePublish(sameScope(row.scope, sourceScope) && row.pageId === selection.pageId && row.revision === selection.revision, 'SELECTED_SOURCE_BINDING_CHANGED');
    time(row.observedAt); const now = request.clock.now(); time(now);
    const age = Date.parse(now) - Date.parse(String(row.observedAt));
    requirePublish(age >= 0 && age <= maxReadAgeMs, 'SELECTED_SOURCE_STALE');
    requirePublish(typeof row.text === 'string', 'INVALID_SOURCE_TEXT');
    const bytes = encodeUtf8(row.text);
    requirePublish(bytes.length > 0 && bytes.length <= M03.pageMax.value * 1024, 'SELECTED_SOURCE_PAGE_LIMIT');
    const metadata = record(row.metadata, ['origin', 'visibility', 'ownership', 'sensitivity', 'rights', 'license']);
    for (const field of ['origin', 'visibility', 'ownership', 'sensitivity', 'rights']) boundedLabel(metadata[field]);
    if (metadata.license !== null) boundedLabel(metadata.license);
    requirePublish(row.lineage !== null && typeof row.lineage === 'object' && !Array.isArray(row.lineage), 'INVALID_PRIVATE_LINEAGE');
    requirePublish(canonicalBytes(row).length <= M03.sealedPayloadMax.value * 1024 * 1024, 'SELECTED_SOURCE_RESPONSE_LIMIT');
    return structuredClone(raw);
  };
  const snapshots: SelectedSourcePage[] = [];
  for (const selection of selected) snapshots.push(await read(selection));
  requirePublish(snapshots.reduce((total, page) => total + encodeUtf8(page.text).length, 0) <= M03.sealedPayloadMax.value * 1024 * 1024, 'SELECTED_SOURCE_TOTAL_LIMIT');
  // A second exact read detects changes during collection, even under a reused revision.
  // This is not a source transaction; a native adapter still needs revision/isolation evidence.
  for (let index = 0; index < selected.length; index++) {
    const first = snapshots[index]!; const second = await read(selected[index]!);
    const stable = (page: SelectedSourcePage) => canonicalBytes({ scope: page.scope, pageId: page.pageId, revision: page.revision, text: page.text, metadata: page.metadata, lineage: page.lineage });
    requirePublish(bytesHash(stable(first)) === bytesHash(stable(second)), 'SELECTED_SOURCE_CHANGED_DURING_READ');
  }
  const privateReferences = new Set([sourceScope.brain, sourceScope.source, ...selected.flatMap(page => [page.pageId, page.revision])]);
  // Inspect only JSON already returned for selected pages, never follow source/graph references.
  const lineageValues: unknown[] = snapshots.map(page => page.lineage);
  while (lineageValues.length > 0) {
    const value = lineageValues.pop();
    if (typeof value === 'string') { if (value.length > 0) privateReferences.add(value); }
    else if (value !== null && typeof value === 'object') for (const child of Object.values(value)) lineageValues.push(child);
  }
  const pages = snapshots.map((page, index) => {
    const blockers: string[] = [];
    if (!['personal-public', 'synthetic'].includes(page.metadata.origin)) blockers.push('origin');
    if (page.metadata.visibility !== 'public') blockers.push('visibility');
    if (page.metadata.ownership !== 'seller') blockers.push('ownership');
    if (page.metadata.sensitivity !== 'none') blockers.push('sensitivity');
    // Eligibility to prepare a local review draft is NOT publication or sale permission.
    if (page.metadata.rights !== 'permitted-for-local-review') blockers.push('rights');
    const license = page.metadata.license?.trim().toLowerCase();
    if (license === undefined || ['unknown', 'n/a', 'noassertion'].includes(license)) blockers.push('license');
    try { guardText(encodeUtf8(page.text), true); } catch { blockers.push('text-requires-review'); }
    if ([...privateReferences].some(reference => page.text.includes(reference))) blockers.push('private-reference');
    return { selection: selected[index]!, source: page, blockers };
  });
  const blocked = pages.some(page => page.blockers.length > 0);
  return {
    v: 1, kind: 'local-selected-source-draft', state: blocked ? 'blocked' : 'requires-human-review',
    publicProjection: blocked ? null : { v: 1, kind: 'unapproved-selected-slice-draft', pages: pages.map(({ selection, source }) => {
      const bytes = encodeUtf8(source.text);
      return { page_id: selection.publicId, text: source.text, sha256: bytesHash(bytes), size_bytes: bytes.length };
    }) },
    privateCandidate: { scope: sourceScope, pages },
  };
}
