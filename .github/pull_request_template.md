## Problem and resulting behavior

Describe the user-visible trigger and what changes. Link the issue and unmet dependencies. Use `Closes #N` only for full delivery.

## Observed verification

- Command, observed result, and relevant counts:
- Synthetic, local, CI, testnet, or live evidence:
- What was reused and what could not be checked:

Green tests do not establish deployment, actual settlement, delivery, or buyer acceptance.

## Gate changes

List each changed test, validator, CI step, timeout, threshold, snapshot, or suppression and its justification. Write "None" if unchanged. New tests state `protects`, `fails_when`, and `no_claim`.

## Boundaries and rollback

- Payment, provenance/citations, source access/permissions, content terms, and runtime effects:
- Data or infrastructure rollback, preserving settlement liabilities and revocations:
- No credentials, wallet material, private knowledge, or unapproved source export in this PR:

## Completion

- [ ] Required checks pass; intentional public-export skips are explicit.
- [ ] Dependencies and incomplete acceptance criteria are stated.
- [ ] Documentation reflects the final behavior.
- [ ] No real payment, paid infrastructure, deployment, or source grant was assumed from implementation approval.
