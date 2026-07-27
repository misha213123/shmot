# DRIPLY Repository Instructions

Codex discovers this file from the repository root. Detailed documentation lives in `docs/`.

Before changing code, read:

1. `docs/MASTER_EXECUTION_PLAN.md`
2. `docs/CODEX_WORKFLOW.md`
3. `docs/README.md`
4. documents relevant to the selected sprint

Mandatory rules:

- Work only on the first unfinished sprint.
- Use a dedicated branch and pull request; do not push implementation work directly to `main`.
- Prefer React components and explicit state over `MutationObserver`, `querySelector` DOM patching, synthetic clicks and injected style tags.
- Keep one source of truth for navigation, screens, API contracts and component styles.
- Preserve working behavior outside the sprint scope.
- Run available frontend/backend checks, update the execution plan and report risks.
- Stop after the current sprint; do not begin the next one automatically.
