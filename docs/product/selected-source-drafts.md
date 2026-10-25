# Prepare a selected-source draft locally

`createSelectedSliceDraft` in `src/publish/selected-source.ts` is an operator-side,
in-memory port for Issue #6. It has no native gbrain transport, filesystem output,
network, model, source grants, signer or activation command. The test adapter uses
synthetic content only. This is partial implementation of #6, not a completed real
source export.

Supply one explicit `{ brain, source }` scope and one to ten selected page IDs with
their exact revisions. Assign each selection a fresh random UUID v4 as `publicId`
(for example with `node:crypto`'s `randomUUID`), keeping that private mapping stable
for a repeated candidate comparison. Never derive a public ID from a source slug,
path, revision or hash. The operator supplies the selection; buyer input must not
reach this API.

```ts
import { randomUUID } from 'node:crypto';
import { SystemClock } from '../../src/common/index.ts';
import { createSelectedSliceDraft } from '../../src/publish/index.ts';

const draft = await createSelectedSliceDraft(syntheticReader, {
  scope: { brain: 'synthetic-brain', source: 'selected-source' },
  selected: [{ pageId: 'selected-page', revision: 'r7', publicId: randomUUID() }],
  clock: new SystemClock(),
  maxReadAgeMs: 1000,
});
```

The injected reader implements only `read({ scope, pageId, revision })`. It must
return that exact binding and an `observedAt` timestamp, or report missing, denied
or stale. Do not implement fallback sources, search/listing, recursive graph reads,
refresh, capture or permission grants. Every selected page is read twice; changes
to content, revision, metadata or private lineage reject the entire operation.
Reads must be current under the supplied clock and a positive freshness bound of
at most one minute. Pages reuse the existing 64 KiB bound. The result is a snapshot,
not a transaction or a guarantee against later source changes.

Keep the two returned parts separate:

- `privateCandidate` holds the source binding, selected revision, original text,
  lineage and review metadata. Treat it as private local reviewer material. Do not
  log it, commit it, render its text as instructions, or send it to a hosted model.
- `publicProjection` is an allowlisted **unapproved draft**, containing only opaque
  page IDs, exact text, hashes and byte lengths. Private slugs, paths, edges,
  backlinks, counts, source revisions and rights fields are not copied into it.
  It stays local until the owner reviews exact bytes. It is not a `BundleInput`,
  approved worksheet, signed manifest, release or listing.

For a projection, metadata must explicitly say `origin: personal-public` or
`synthetic`, `visibility: public`, `ownership: seller`, `sensitivity: none`, and
`rights: permitted-for-local-review`. A missing/unknown licence also blocks the
projection. These are adapter claims about eligibility for a local review draft;
they never establish approval, a new content licence or permission to sell. The
licence value and other unreviewed fields remain private for the reviewer. Unknown
or ineligible fields produce `state: blocked`, a null projection and named blockers
beside the original private record. Linked/active text, provenance markers and
known sensitive markers are also blocked. The conservative text guard does not
detect arbitrary personal information or establish rights.

Only `requires-human-review` means the draft passed these local checks. Human
rights review, full exact-byte reading and the protected approval/sealing workflow
remain separate. No output marks human approval. Do not cast the draft into an
existing approved publisher record or use the legacy worksheet's licence as a
default.

Run the synthetic controls with pinned Node 24.13.0:

```sh
node --test test/publish/selected-source.test.ts
```

Native gbrain transport, source-capability/identity checks, source-level revision
semantics and isolation, and one owner-operated selected export with private local
evidence remain pending. Synthetic success does not prove those layers. Roll back
an unapproved candidate by discarding its local data; this API never changes the
source. No real export, payment or public-content release is authorized here.
