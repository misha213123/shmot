# Codex Workflow for DRIPLY

## Source of truth

Before changing code, read:

- `AGENTS.md`
- `docs/MASTER_EXECUTION_PLAN.md`
- relevant documents in `docs/`

## Task selection

Work on only the first unfinished sprint in `docs/MASTER_EXECUTION_PLAN.md`.

Do not start the next sprint in the same task.

## Branching

Create a branch named:

```text
codex/sprint-N-short-name
```

Never push implementation changes directly to `main`.

## Implementation rules

- Preserve working business logic outside the sprint scope.
- Prefer React components over runtime DOM manipulation.
- Do not add new `MutationObserver`, synthetic click forwarding or dynamically injected style tags when React can solve the task.
- Replace an old runtime implementation only after its React replacement works.
- Keep frontend types and backend API contracts synchronized.
- Update documentation whenever architecture or behavior changes.

## Required checks

### Frontend

From `frontend/` run:

```bash
npm install
npm run build
```

Run lint and tests too when scripts exist.

### Backend

From `backend/`, install dependencies using the repository's documented method and run:

```bash
python -m pytest
```

When tests do not exist, report that clearly and run the strongest available import/startup checks.

## Before opening a pull request

- Fix build and test failures caused by the changes.
- Update completed checkboxes in `docs/MASTER_EXECUTION_PLAN.md`.
- Update the sprint execution log.
- Commit logical changes with clear messages.
- Do not create empty deploy commits.

## Pull request description

Include:

1. sprint completed;
2. files changed;
3. architecture changes;
4. removed runtime patches;
5. commands executed;
6. build/test results;
7. known risks;
8. manual post-deploy checklist.

## Deployment

Vercel and Render are expected to deploy from GitHub after merge to `main`.

After merge, verify:

- Vercel production build succeeded;
- Render deployed when backend or Render configuration changed;
- backend `/health` responds;
- frontend opens and uses the production API;
- no critical production errors are visible.

Do not automatically merge when checks fail, migrations are unverified, deployment status is unknown, or data loss is possible.

## Final report

Report:

- branch name;
- commit SHA;
- pull request status/link;
- completed plan items;
- changed files;
- checks and results;
- Vercel status;
- Render status;
- manual checks still required;
- next sprint, without starting it.
