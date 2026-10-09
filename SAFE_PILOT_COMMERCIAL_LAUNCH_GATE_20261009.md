# Veyline customer-owned Safe — commercial launch gate
Date: 2026-10-09
Scope: invitation-only Base USDC Safe pilot, reusing the existing Veyline production service, current Fly machine/volume, Stripe plans, and separate x402/MCP products.

## What the reported $0.01 pilot proves — and does not prove
- Operator-reported transaction: `0x44d73d4bcf8541c7d9c9587a73e070dbe8d6f842ae9178e24897cd770cbde615` on Base.
- Pilot Safe: `0x101C129249Bb15D150E8Ef7d848E879E62e9efbe`.
- Owner/payee: `0x699c7549c4deb0bd52ebd384cb13d04110ba2b7d`.
- Pilot org: `org_ZS1v94EvpN6N`, executor `safe-executor-pilot-001`.
- **Important audit finding**: prior public `safe-transfer.html` called `Safe.execTransaction` directly; it did not validate or consume a Veyline authorization. Its green `Veyline Auth` label was hardcoded. Therefore this particular webpage cannot serve as evidence of pre-payment Veyline policy enforcement. Do not represent a subsequent settlement DB entry as proof that authorization preceded wallet signing.
- No extra transfer is necessary to discover this gap; source inspection already established it. External transaction explorer did not independently resolve in the reviewing environment; request receipt evidence from the operator.

## Reuse already-built Veyline infrastructure
- `Payloadhq/payload-rail/rail/src/noncustodial-authorize.ts`: issue authorizations under tenant policy and daily/per-transaction caps.
- `Payloadhq/payload-rail/rail/src/noncustodial-executor-sdk.ts`: verify pinned token signature, verify exact payment details, atomically consume before signing, report settlement.
- `Payloadhq/payload-rail/rail/src/safe-executor.ts`: real owner-supplied Safe Protocol Kit adapter, threshold 1, exact Base USDC transfer.
- `Payloadhq/payload-rail/rail/src/operator-customer-safe.ts`: owner-signed audit enrollment with Base onchain owner/threshold verification.
- `Payloadhq/payload-rail/rail/SAFE_CUSTOMER_LIVE_ROLLOUT_20261009.md`: original operator playbook.
- **Do not create a second organization, Safe, signer, Stripe subscription, database, deployment, wallet or redundant endpoint.**

## Ship gate: owner-reviewed evidence, not a rewrite
1. **Receipt**: produce the Base transaction receipt and exact USDC Transfer log for the *existing* hash. Confirm Base chain 8453, receipt success, payer Safe, recipient, amount, and >=3 blocks. If missing or not retrievable, report verification pending.
2. **Audit linkage**: show sanitized production records (auth_id / issued_at / consumed_at / settled_at / tx hash and exact amount/recipient) and actual executor logs. If the transfer came from the direct `safe-transfer.html` client, mark as direct Safe pilot, even if a payment record exists.
3. **Control-path integration**: connect the owner-controlled *existing* customer executor to `VeylineExecutorValidator` plus `VeylineSafeExecutor`. No customer wallet secrets hosted on Payload/Fly/static GitHub Pages; no untrusted SDK from a public signing page.
4. **Zero-spend fail-closed proof**: without any broadcast or owner signature, verify missing/invalid token, expired token, wrong org/executor, payee substitution, amount above $0.01, daily limit overflow, duplicate consumed token and unavailable authorizer all stop before `Safe.signTransaction`. Capture tests and sanitized evidence.
5. **Official Safe SDK**: verify adapter compatibility against official installed `@safe-global/protocol-kit`; explicitly test threshold=1 and reject threshold>1; don't silently fall back to owner-direct contract calls.
6. **One owner-approved end-to-end policy-bound transfer**, *only if needed to establish actual pre-sign enforcement after step 4*: request owner's explicit approval separately for exact $0.01 amount, approved recipient and estimated fee. Prove signed intent issued, token verified, token consumed **before signing**, onchain receipt reconciled to same auth_id. No automatic reruns on ambiguity.
7. **Runtime safety**: inspect `VEYLINE_NONCUSTODIAL_ENABLED` and attestation/pinning setup without logging secrets. Preserve original Fly machine and SQLite volume, Stripe, company KMS managed-signer paths and callx402.
8. **Truthful offer**: sell the current x402/MCP and Veyline API plans as already offered, but keep Safe execution **invite-only** until gated evidence exists. Explain this is a customer-owned, owner-mediated Safe path, not universal Safe-wide spending prevention.
9. **Close gate**: publish redacted acceptance proof with a GO / NO-GO for customer pilot, exact remaining blockers and accountable operator; have owner approve broader onboarding, no silent financial execution.

## Pilot customer playbook once gate passes
- Target 3-5 technical early adopters who already use Base USDC, Safe, and agent/automated payments. Do not mass-enroll unverified wallets or promise unsupported chains and multisig support.
- Confirm a customer's use case, API integration owner, wallet ownership, payer/recipient policy, initial limits and signed consent. Keep wallet keys with customer.
- Let customer choose current published Veyline Stripe plan separately from invite-only Safe enablement. Do not promise Safe pilot features in all subscription tiers by default.
- Give customer a concise onboarding checklist, SDK call path, a hosted demo that shows no keys or long-lived bearer tokens, and a read-only receipt/reconciliation view.
- Run spending-denied/invalid tests first. Then do small explicitly approved production payments. Collect reliability and onboarding friction feedback.
- Measure qualified pilot inquiries, activated paid customers, no-transfer policy denials, exact settlement reconciliation success, support turnaround, and churn.
- Seek review of relevant legal/compliance and custody claims before expanding geography, transaction sizes, or automated unattended payments.

## Website changes in this proposed PR
- `safe-transfer.html`: direct-send button archived; read-only historical transaction reference.
- `safe-sign.html`: hardcoded expired one-off consent removed.
- `veyline.html`: existing subscription checkout intact; authorization claims scoped; invite-only Base Safe pilot section added.

**Production remains unchanged until the operator carries out acceptance and the PR is reviewed and merged.**
