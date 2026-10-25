# Contributing to Rent a Brain

Contributions are welcome. Start with the [pilot roadmap](https://github.com/Masashi-Ono0611/rent-a-brain/issues/1) and an issue whose dependencies are ready. The first milestone is one paid answer from one seller's explicitly selected knowledge, using Solana USDC through x402.

## Fork, commit, and open a pull request

1. Fork this public repository on GitHub and clone your fork.
2. Create a focused branch, for example `git switch -c docs/contribution-example`.
3. Read the issue's current-state evidence, acceptance criteria, dependencies, and execution boundaries. Comment before starting overlapping work.
4. Make the smallest useful change and include meaningful verification.
5. Commit to your fork, push your branch, and open a PR against `main` here. Reference the issue; use `Closes #N` only when the entire issue is delivered.

You do not need collaborator access, private lesson files, a personal gbrain, a seller key, or funded wallets to contribute. Maintainers review PRs before merging. `good first issue` marks a maintainer-selected entry task; `help wanted` can include work with unfinished prerequisites.

## Local setup

The exact versions in `config/tooling-pins.json` are authoritative: Node 24.13.0, npm 11.6.2, TypeScript 5.9.3, and Gitleaks 8.30.1 at this revision. `.node-version` selects Node. Install the matching Gitleaks binary from the [official releases](https://github.com/gitleaks/gitleaks/releases), verify its release checksum, and put it on your PATH. Do not silently update pins to match your machine.

```sh
node --version
npm --version
gitleaks version
npm ci --ignore-scripts
npm run check
git diff --check
```

`npm run check` verifies toolchain pins, TypeScript, import/runtime boundaries, the test suite, and secret-scanner bad/clean controls plus repository scanning. Dependency lifecycle scripts stay disabled. The Linux x86_64 CI installer verifies the artifact digest pinned in `config/tooling-pins.json`; it is not a macOS installer.

To run a focused test while iterating:

```sh
node --test test/common/test-skip-policy.test.ts
```

Run the full checks before reporting a code change complete. A green local run does not prove fork CI, deployed isolation, facilitator compatibility, a mainnet payment, delivery, or buyer acceptance. State each observed layer separately.

### Two intentional public-export omissions

This repository contains `PUBLIC_EXPORT` and excludes private approved lesson text. These two tests in `test/replay/host-knowledge.test.ts` explicitly skip when those fixtures are absent:

- `real seller extraction: approved B/C spans identical; hidden resolution never enters either knowledge return`
- `sealed and source mutations fail closed; exact approved source and signature restored pass`

`test/replay/private-fixtures.ts` controls the omission. The test runner accepts only these exact names, file, and reason in a public export; an additional skip fails the run. Full trees without `PUBLIC_EXPORT` must not hide missing private fixtures. Never obtain or commit the private lesson text to make a public PR green.

## Safe fixtures and useful tests

Use synthetic knowledge and in-memory ephemeral test keys. Do not connect tests or CI to a personal brain, publish source candidates, fund a wallet, or execute a real payment. Adding a feature does not authorize deploying it or enabling it on mainnet.

New tests describe `protects` (the observable contract), `fails_when` (the wrong result rejected), and `no_claim` (what green does not establish). A negative control should fail for the intended reason, and its restored clean counterpart should pass. Report changes to tests, validation, CI, timeouts, thresholds, or suppressions explicitly, with a reason. Do not weaken a gate to make a PR green.

Never include credentials, environment-file contents, wallet material, private source pages, private review records, or raw personal queries in commits, issues, PRs, screenshots, or CI logs. Redact evidence before posting. Avoid public reproduction data for a suspected active credential exposure; report the non-sensitive issue to a maintainer first.

## Boundaries to preserve

- Buyers and seller workers receive narrow ports, not operator, signer, or private-brain access.
- Selected source material is a draft until exact bytes receive human approval; a scanner pass is not consent.
- Bind payment, answer, citations, release version, and receipt ownership. Retries must not become a second charge.
- Withdrawal cannot erase copies already delivered; retain necessary paid-but-undelivered liability records.
- Keep historical evidence and signature domains intact unless an explicitly versioned migration is part of the issue.

The code is MIT licensed under `LICENSE`. Content has separate stated terms; existing published CC BY 4.0 permissions are not changed by a code PR. Do not invent or relicense paid-content terms without the owner's decision.

## PR review

Write issues, PR titles, and descriptions in English. Explain the user-visible problem, final behavior, files affected, observed checks, and any remaining evidence gaps. Keep commits small and resumable. Describe rollback for data, payment, or infrastructure changes. Mocked or testnet results must stay labelled.
