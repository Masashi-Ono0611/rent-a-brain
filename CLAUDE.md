# Rent a Brain: working notes for AI sessions

Current scope (2026-10-25): renamed copy of the public Ask a Brain repository.
Stop after the name change; further feature work needs the founder's next instruction.
The founder authorized creating this new public repository and its static website.
Historical notes below describe the original project; its remote now exists.
Keep wire signature domains and receipt import paths compatible.

Read first: `docs/handoff/2026-10-10-handoff.md` (state, paths, safety rules, remaining work), then `docs/decisions.md` (founder decisions D0 to D18, binding).

Hard rules (details in the handoff, section 1):
- Per-action founder approval is needed ONLY for the mainnet purchase (D18). Devnet, test keys, scans, tests and docs proceed without asking.
- Ask the founder once before: making the repo public / pushing, submitting to the hackathon, reading `~/.aab-seller/*`, or moving real funds.
- Never print, paste or commit key material or auth files. `.local/` is gitignored and holds private/unapproved material.
- Never claim more than the evidence shows (handoff section 9). A guard is not verified until you have seen it fire.
- Run `npm run check` before reporting code work done. Do not report done with failing tests.
- D7 is historical; the current remote is `Masashi-Ono0611/rent-a-brain`.
