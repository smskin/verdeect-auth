# Project Rules for /aif-review

> Bundle: aif-prompts 2026-10-13 (portable baseline; /aif-evolve may extend it).
> Last updated: 2026-10-22
> Based on: manual rules

## Rules

### Review Against Specialist Constraints
**Source**: manual, 2026-10-05
**Rule**: In addition to the generic checklist, review each changed file against the MUST DO / MUST NOT DO constraints and dependency rules of the relevant specialist: `/laravel-specialist` (module boundaries — only `I{Service}Service` and Events across modules; invokable single-method HTTP controllers with OpenAPI; Spatie Data requests/responses; `Type|null` instead of `?Type`; `declare(strict_types=1)`; no `$guarded`; no array/json casts), `/laravel-vue-specialist` (no direct API calls from views/components; `storeToRefs`; `shallowRef` for chart instances; no `any`, no TS enums; components ≤300 lines), `/python-specialist` (layer direction CLI → Pipeline → Services → Models/DTO; no sibling feeder imports; services stateless), `/nestjs-specialist` (module boundaries — only `I*Service` contracts and events across modules; one route per HTTP controller with `@Permission()` or justified `@Public()`; transactions, audit and outbox only in use-cases; actions never open transactions; tenant and user only from `RequestContext`; every tenant table with RLS + `FORCE ROW LEVEL SECURITY`; consumers idempotent through the inbox; no publishing to RabbitMQ outside the outbox; zod validation with `.strict()`; no `any`, non-null assertions, CommonJS or `drizzle-kit push`; display text only via i18n keys). Violations of these are at least `major` severity.

### Untracked Files
**Source**: manual, 2026-10-05
**Rule**: When reviewing without arguments and nothing is staged, also list untracked files (`git status --porcelain`) and include new source files in the review — a new feature consists mostly of untracked files that `git diff` does not show.

### Error Reporting
**Source**: manual, 2026-10-12
**Rule**: Flag as `major`: a `catch` that swallows a `Throwable` / `Error` without `report()` / `capture_exception` / `Sentry.captureException`; a DSN or GlitchTip token in code, config, compose defaults or `.env.example`; `send_default_pii` enabled, user context with e-mail/name/IP, or request bodies/tokens reaching events; tracing/replay/profiling turned on; a frontend DSN baked into the bundle (`VITE_*`). Rules: local skill `glitchtip-integration` (GT01–GT16).

### Visual Regression Against Mockups
**Source**: manual, 2026-10-21
**Rule**: Treat as blocking: new or widened entries in `tests/Visual/deviations.ts` without a user approval in the plan; changes to `threshold`, `maxDiffPixels`, baseline generation or the guard tests of the catalog; edits of files under `requirements/**/mockups`; UI changes in screens that have mockups without a passing `make test-visual`.

### Public Package Surface
**Source**: manual, 2026-10-22 (verdeect-auth)
**Rule**: Treat as blocking: a `default` condition added to `exports["./testing"]` or an import of `testing` from the main or `./nest` entry; a public export added, removed or changed without TSDoc, README and `CHANGELOG.md` updates; a breaking change (verification rule, `Principal` field, guard status or error code, export signature, minimum Node/NestJS version) without a major version; `@nestjs/*`, `rxjs` or `reflect-metadata` moved from optional `peerDependencies` to `dependencies`; any secret, environment URL or `.npmrc` with a token committed.
