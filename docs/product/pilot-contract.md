# Single-seller paid-answer pilot contract

Status: implementation contract, 2026-10-25 JST. Runtime launch is **blocked** until the checklist below has observed evidence and the owner approves the live action. This document does not claim a deployed service or an external sale.

Roadmap: [#1](https://github.com/Masashi-Ono0611/rent-a-brain/issues/1). Contract issue: [#2](https://github.com/Masashi-Ono0611/rent-a-brain/issues/2).

## Confirmed product

The founder is the first seller. A buyer purchases one answer grounded in an explicitly selected, human-reviewed subset of the seller's gbrain knowledge. The first payment rail is Solana USDC through x402. The initial outcome is one externally purchased and accepted answer, with payment, delivery, citation verification and buyer acceptance evidenced separately.

The source brain remains private. Source selection, candidate preparation, approval and signing belong to the seller's local operator workflow. Public service processes receive only the approved release and narrowly scoped runtime ports. A buyer cannot choose a brain source, page path, signer, payout address, tool permission or operator action through their question.

The first answer engine remains extractive and bounded to approved evidence. Free-form, in-scope question handling is the target of [#9](https://github.com/Masashi-Ono0611/rent-a-brain/issues/9); the inherited engine currently supports exact approved questions. No hosted generative model or corresponding spend is authorized by this contract.

## Offer and purchase identity

A versioned offer must identify one seller, one selected slice/release digest, the advertised topic and question limits, answer-engine version, Solana network, USDC asset identifier/decimals, price in atomic units, payout binding, content-terms version, freshness/review date, expiry and support policy. Challenges contain only approved public metadata, never the prepared answer or excluded-source details.

One logical purchase binds the buyer authority, offer version, question digest and payment identifier. The same identifier with different bound fields is a conflict. Delivery and retries stay on that purchase and its exact approved answer/version. Unknown settlement must be reconciled before considering any further settlement attempt.

The implementation schema and exact SDK shapes are owned by [#8](https://github.com/Masashi-Ono0611/rent-a-brain/issues/8) and [#10](https://github.com/Masashi-Ono0611/rent-a-brain/issues/10); this contract does not invent a custom x402 payment envelope.

## Buyer journey

1. Inspect approved seller/offer metadata, price, network, terms and limitations without paying.
2. Submit an in-scope question within the advertised bounds. The service checks eligibility and prepares supported evidence without disclosing the paid answer.
3. Unsupported, stale, contradictory, withdrawn or invalid requests are refused before settlement. A refusal is not a paid answer.
4. Receive a standard x402 challenge. The client presents the exact spend and uses the selected signer/approval policy; knowledge text never authorizes spending.
5. Submit the authorized payment payload. Verification, submission and settlement/finality are separate observed states.
6. Receive the purchased answer with versioned citations and the receipt after the documented settlement condition passes.
7. Retry/status-check the same purchase after interruption. A retry cannot silently become a new purchase or price.
8. Verify provenance and optionally report whether the answer was useful. Missing feedback remains unknown.

## State and charging contract

| State | Answer visible? | Charge/obligation | Allowed next action |
|---|---|---|---|
| Invalid / unsupported / refused | No paid content | No settlement attempt | Correct the request as a new explicitly chosen request, or stop |
| Prepared | No paid content | None | Issue an eligible versioned challenge |
| Payment authorized / verification pending | No | Authorization is not settled revenue | Verify exact purchase binding or refuse |
| Payment submitted / settlement unknown | No | Possible payment; never assume zero charge | Reconcile the existing payment; no replacement charge |
| Settled | Eligible purchased content only | Durable delivery obligation | Deliver pinned answer or recover the obligation |
| Delivered | Purchasing buyer receives permitted answer/evidence | Record delivery separately from acceptance | Same-ID recovery and voluntary feedback |
| Delivery failed / content withheld after settlement | No further release if policy forbids it | Outstanding support/compensation obligation | Recover allowed delivery or enter operator refund review |
| Refund pending | As permitted by content policy | Liability not yet discharged | Operator-controlled execution and reconciliation |
| Refund completed | As permitted by content policy | Only independently evidenced returned amount counts | Retain necessary settlement/refund record |

Only the states supported by the implementation may be reported. A facilitator's successful verification is not proof of onchain settlement. An HTTP 200 is not proof that the buyer accepted or benefited from the answer. The no-charge promise covers refused requests before settlement; it does not erase a payment whose result is unknown or a network fee already incurred.

## Withdrawal, freshness and versions

- **Before settlement:** a withdrawn, revoked, stale or ineligible release cannot create a new payable offer or authorize settlement. Recheck eligibility at the settlement boundary.
- **Payment submitted or unknown:** record the withdrawal and reconcile payment. Do not issue a replacement payment or report a refund without evidence.
- **Settled, not delivered:** if the content can no longer be released under the approved policy, withhold it and retain a visible support/refund obligation. Withdrawal is not an excuse to mark the order complete.
- **Already delivered:** stop future access when required, but do not promise to recall bytes held by the buyer. Preserve only the payment/audit records required by the approved retention policy.
- **Superseded but safe release:** it may fulfill an existing permitted receipt; it is not eligible for a new purchase. Never substitute new knowledge into an old receipt silently.
- **Compromised key or payout change:** suspend affected offers until the operator-approved identity/key/payout binding is re-established. Old caches and restored databases cannot override newer tombstones.

Every offer displays its actual review/freshness timestamp. Changing text, membership, policy, terms or a price/service binding requires the corresponding re-review and versioning workflow. Scan success alone does not establish rights, consent or freshness.

The receipt-access implementation in #5, settlement/delivery recovery in #11 and eligibility/key lifecycle in #14 implement this policy. They must specify and test the race between withdrawal and settlement; this document alone does not enforce it.

## Price, fees, terms and retention decisions

These decisions block launch and must be recorded with owner confirmation; contributors must not turn inherited fixture values into live defaults.

| Decision | Decision owner / evidence | Until resolved |
|---|---|---|
| Per-answer live price, price version, approved spend and recipient | Founder, recorded in the offer and exact live authorization | No live offer/payment |
| Standard-compatible direct payment versus inherited 90/10 atomic split | #8 ADR plus founder confirmation of fee policy | Keep legacy tests intact; no claimed x402 split compatibility |
| Pilot wallet/signing provider and buyer approval model | #8 ADR; owner confirmation for real wallet use | Synthetic signer only |
| Paid response/citation access and new content terms | #5, founder-approved terms | No new paid-content release |
| Receipt, delivered evidence, support and refund retention periods | #5 access policy and #11 durable recovery design, confirmed before pilot | Do not delete unsettled liabilities or newer revocations |
| Supported host, any installation/cloud account or paid plan | #12 operations proposal and founder approval | Local/synthetic verification only |
| First eligible knowledge and exact publication bytes | Seller human review under #6/#7 | Candidates remain local drafts |

## Relationship to inherited decisions

`docs/decisions.md` remains historical evidence. This table describes the new pilot target and does not retrospectively alter old results.

| Inherited assumption | Pilot disposition |
|---|---|
| Ask a Brain name / hackathon deadline | Name replaced by Rent a Brain; the approved roadmap replaces the old deadline-driven scope |
| No remote (D7) / one-time publication at submission | Superseded by the existing public repository and approved OSS implementation; private material remains excluded |
| Fixed five-page slice and exact question templates | Existing runtime limits retained until the corresponding bounded export/answer implementation and tests land; no silent broadening |
| 0.01-unit price / 90:10 split | Retained as legacy implementation evidence; live price and x402 fee mechanism remain explicit decisions |
| No external paid orders in the hackathon | New product outcome targets one external order, but current service admission stays disabled until launch gates and live authorization pass |
| Human signing and dedicated mainnet authorization | Retained for owner-operated real payments; client signing policy must be specified without exposing keys to models |
| One mainnet demonstration / old budget ceiling | Does not grant a new budget or additional transaction; each new live action needs exact authorization |
| MIT code and published CC BY 4.0 content | Existing permissions retained; new paid-content terms require separate approval and cannot revoke previously distributed rights |
| Local isolated seller core / static-only Vercel | Separation retained. Vercel remains paused and disconnected; the public website is not a seller runtime |
| Public snapshot omits private lessons | Retained. Tests and contributors use synthetic fixtures; private fixtures are not a CI prerequisite |

## Launch checklist

For each row, the linked issue's numbered acceptance criteria are mandatory. Attach an observed command/run/report and exact revision, mark each criterion satisfied or pending, and name what it does not prove. Implementation of this document does not satisfy any runtime row. P0 is a launch-blocker classification, not a claim that all P0 work precedes its P1 dependencies.

| Gate / issue acceptance criteria | Required evidence before #16 | Current status |
|---|---|---|
| #2: AC1-4, product contract | Current confirmed scope, inherited restrictions table, state/charging policy and decisions closed for the actual offer | Contract implemented; live decisions pending |
| #3: AC1-6, contribution path | Public-fork setup walkthrough, templates, exact checks and explicit skip documentation | Pending observed walkthrough |
| #4: AC1-5, CI | Push and fork-PR runs, exact tool pins, scanner fail/restore controls, unexpected-skip denial | Pending CI evidence |
| #5: AC1-4, access/terms | Approved access matrix/terms; unauthorized content-fetch and valid receipt checks | Pending |
| #6: AC1-5, export | Scoped adapter/revision tests, canaries and owner-approved selected export | Pending |
| #7: AC1-4, approve/seal | Synthetic workflow and exact-byte owner approval for the real release; active version binding | Pending |
| #8: AC1-4, x402 ADR | Versioned SDK/rail/facilitator/wallet/fee decisions and reference-client testnet evidence | Pending |
| #9: AC1-5, bounded answers | Predetermined supported/unsupported/hostile cases, valid citation spans and refusal before settlement | Pending |
| #10: AC1-5, paid resource | Standard challenge/client exchange; malformed payment/refusal tests and separately observed testnet settlement | Pending |
| #11: AC1-5, recovery | Concurrent same-ID denial/dedup, crash recovery, unknown-settlement reconciliation and support/refund ledger | Pending |
| #12: AC1-5, runtime | Exact runtime revision, denied private canaries/network, resource bounds, restart/restore and newest tombstones | Pending |
| #13: AC1-5, buyer client | Clean installation, actual CLI/MCP exchange, spend approval/limits, ownership and same-ID recovery | Pending |
| #14: AC1-5, withdrawal/keys | API/cache/restart revocation and key/payout binding drills; paid withholding/support path | Pending |
| #15: AC1-5, metrics/evaluation | Reconciled redacted event ledger, declared tasks, no double-counted retries, independent feedback labels | Pending |

An owner may defer non-launch functionality through a recorded issue update explaining why the pilot remains within its approved boundaries. A waiver cannot turn missing payment, ownership, source isolation, rights approval, private-data protection, revocation or real-payment authorization into a pass. Failed or missing critical evidence keeps live purchasing disabled.

## Five review scenarios

| Scenario | Expected contract outcome | Evidence needed from later implementation |
|---|---|---|
| Supported eligible question, approved spend, observed settlement | Deliver one pinned answer and verifiable receipt; acceptance recorded separately | #9-#13 integration plus authorized #16 pilot |
| Unsupported question | Refuse before settlement; no paid answer disclosure | #9/#10 negative and restored supported case |
| Buyer retries after response loss | Reconcile/resume same purchase and answer; no replacement charge | #11 concurrency/crash tests |
| Settlement outcome unknown | Remain pending with status/reconciliation; never claim free or refunded | #10/#11 faulted facilitator/RPC observations |
| Release withdrawn after settlement but before delivery | Withhold prohibited content, retain paid liability, follow support/refund review | #11/#14 race and restart tests |

Reviewing these examples validates the intended contract, not the runtime behavior. A code change, green CI, deployed endpoint, settled transfer, delivered answer and independent accepted purchase are distinct evidence layers.
