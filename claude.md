# Claude Code – Project Instructions (barba-dev)

This repo is actively used with **Claude Code CLI** (`claude`).

## Goal / guardrails

- **Primary goal:** migrate bw24 code into barba-dev while keeping **homepage behavior perfect**.
- **Only intentional behavioral change:** **page transitions** (Barba).
- Prefer small, reviewable diffs; avoid drive-by refactors.

## Golden rules

1. Always run Claude from the repo root:
   ```bash
   cd /root/.openclaw/workspace/barba-dev
   claude
   ```
2. Don’t touch secrets:
   - never commit `.env*` (except `.env.example`)
   - don’t paste keys into issues/PRs/logs
3. When changing transitions:
   - keep hooks idempotent (no duplicate listeners)
   - re-init Webflow interactions after Barba swaps (if applicable)
   - avoid global side effects (e.g. killing all ScrollTriggers) unless scoped

## Workflow for changes

1. Inspect current behavior and structure.
2. Propose a plan (files + risk).
3. Implement minimal diff.
4. Run checks (as applicable):
   - `npm test` / `npm run lint` / `npm run build` (if present)
5. Summarize what changed + what to test manually.

## Notes

- Repo path: `/root/.openclaw/workspace/barba-dev`
- bw24 reference repo: `/root/.openclaw/workspace/bw24`
