# Codex Workflow for DRIPLY

This file defines how Codex must work in `misha213123/shmot`.

## Sources of truth

Read in this order:

1. `AGENTS.md`
2. `docs/MASTER_EXECUTION_PLAN.md`
3. `docs/README.md`
4. only the documentation relevant to the current sprint

## Task selection

- Find the first unfinished sprint in `docs/MASTER_EXECUTION_PLAN.md`.
- Complete only that sprint.
- Do not continue automatically to the next sprint.
- Keep the scope narrow enough to review safely.

## Branch and pull request

Use a branch such as:

```text
codex/sprint-1-frontend-stabilization
```

Never push implementation work directly to `main`.

Before opening a pull request:

- run all available checks;
- fix failures caused by the change;
- update completed checkboxes and the sprint log;
- make logical commits;
- report tests that do not exist instead of pretending they passed.

The pull request description must include:

1. sprint and scope;
2. files changed;
3. architecture changes;
4. removed legacy/runtime code;
5. commands executed;
6. build/test results;
7. known risks;
8. manual checks after deployment.

## Architecture rules

- Prefer React components, hooks, props and explicit state.
- Do not introduce new product features through `MutationObserver` or DOM patching.
- Do not add synthetic click forwarding or injected `<style>` blocks when React/CSS can solve the problem.
- Replace legacy runtime code only after the React replacement works.
- Maintain one source of truth for navigation, headers, screens and component styles.
- Keep frontend types and backend API contracts synchronized.
- Do not change unrelated working business logic.

## Required checks

### Frontend

From `frontend/`:

```bash
npm install
npm run build
```

Run lint and tests when scripts exist.

### Backend

Use the documented environment and run:

```bash
python -m pytest
```

When tests are missing, run the strongest available import/startup check and report the limitation.

## Deployment

Vercel and Render are expected to deploy from GitHub after merge to `main`.

After merge verify, when access is available:

- Vercel production build succeeded;
- Render deployed when backend/config changed;
- backend `/health` responds;
- frontend opens and points to the production API;
- no critical runtime errors are visible.

Do not create empty commits to trigger deploys. Do not change or expose production secrets. Do not merge automatically when checks fail, migrations are unverified, deployment is unknown or data loss is possible.

## Final report

Report:

- branch name;
- commit SHA;
- pull request link/status;
- completed plan items;
- changed and deleted files;
- commands and results;
- Vercel status;
- Render status;
- manual checks still needed;
- the next sprint without starting it.
