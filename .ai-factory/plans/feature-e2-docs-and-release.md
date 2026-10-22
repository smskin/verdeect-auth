# План реализации: E2 Документация и выпуск `@verdeect/auth`

Branch: feature/e2-docs-and-release
Created: 2026-10-22

## Original Request
Реализуй этап roadmap «E2 Документация и выпуск» по пакету требований requirements/0000-verdeect-auth/ (ревизия r1).

Скоуп этапа: UC-3; AC-8–AC-11; FR-9–FR-12, BR-1, BR-2; состав документации — prd.md §9 — остальное из пакета вне этого плана (E1 реализован). Источник истины — requirements/0000-verdeect-auth/prd.md. Документацию пиши на основе существующего README.md (перенесён из Identity): сделай его автономным — без ссылок на ../../ и на файлы Identity, пути импорта @verdeect/auth — и дополни по §9. Makefile и .gitlab-ci.yml уже сгенерированы — сверь их с FR-10, FR-11 и AC-8, AC-11 и доработай недостающее. Покрой все требования скоупа; ссылайся на их ID в задачах и в названиях тестов. Открытые вопросы не додумывай — спроси меня.

## Settings
- Testing: yes
- Logging: verbose. Runtime-логи библиотеки не меняются: ядро не логирует, а логи guard'а — часть контракта (FR-5, BR-1). Скрипт публикации печатает каждый шаг с префиксом `[publish]`: тег, `version`, запрос к npm, решение, команду. Ошибки он пишет в stderr с причиной. Помощники тестов печатают команду так же, как `runCommand` (`[package-check]`).
- Docs: yes — обязательный docs checkpoint в /aif-implement (через /aif-docs)

## Roadmap Linkage
Milestone: "E2 Документация и выпуск"
Rationale: план реализует ровно скоуп этапа E2 из `.ai-factory/ROADMAP.md` (UC-3; AC-8–AC-11).

## Requirements Reconciliation
Authority: `requirements/0000-verdeect-auth/prd.md` (r4, 2026-10-22; r2 — D-7: минимальная Node 22.12, матрица CI 22 и 24; r3 — D-8: GitHub `smskin/verdeect-auth`, GitHub Actions, environment `npm`, FR-1 `repository` = `git+https://github.com/smskin/verdeect-auth.git`, FR-11 jobs `lint` → `test` → `build` → `publish`; r4 — D-8: публикация через npm Trusted Publishing (OIDC), `NPM_TOKEN` только для первого выпуска) — высший источник, выше ROADMAP.md, DESCRIPTION.md и `.ai-factory/skill-context/aif-ci` (правило «Library Package Pipeline» — GitHub Actions и Trusted Publishing с r4). Контракт поведения кода (V-1…V-8, `Principal`, guard, векторы) — PRD Identity §7.5. В E2 он не меняется: правки в `src/` — только комментарии TSDoc (BR-1, правило Library Package Scope).

Milestone scope: UC-3; AC-8, AC-9, AC-10, AC-11; FR-9, FR-10, FR-11, FR-12; BR-1, BR-2; состав документации — §9.
Вне скоупа (E1, реализован): UC-1, UC-2, UC-4; AC-1–AC-7; FR-1–FR-8; BR-3, BR-4; EC-1–EC-3. Код E1 — существующий: тесты `tests/package/*` расширяются, а не переписываются.

| Решение / комбинация | Источник | Проверка |
|---|---|---|
| CI — **GitHub Actions** (`.github/workflows/ci.yml`), а не GitLab CI. `.gitlab-ci.yml` в репозитории нет, `origin` — `github.com/smskin/verdeect-auth`. Требования FR-11 переносятся так: стадии → jobs со связями `needs`; «защищённые теги» → ruleset на теги `v*` и environment `npm` с правилом развёртывания только для тегов `v*`; «`NPM_TOKEN` masked + protected» → секрет environment `npm` (GitHub маскирует секреты в логах); «merge request» → `pull_request` | решение пользователя 2026-10-22, закреплено в PRD r3 (D-8, FR-1, FR-11, AC-8) | Задачи 12, 13, 14 |
| r3 после реализации: job `install` убран (FR-11 r3 и правило aif-ci — `lint` → `test` → `build` → `publish`, каждый job ставит зависимости сам); `publish` — `needs: [lint, test, build]`; права workflow `contents: read`, у `publish` — `contents: read` + `id-token: write` (provenance / Trusted Publishing); `repository.url` → `git+https://…` (provenance требует https). `npm publish --provenance` не включается: при Trusted Publishing provenance создаётся автоматически | PRD r3 D-8, FR-1, FR-11; `.ai-factory/skill-context/aif-ci` «Library Package Pipeline» (r3) | `release.spec.ts` (AC-8, FR-11), `tarball.spec.ts` (FR-1) |
| r4 после реализации: `publish` — Trusted Publishing (OIDC): Node 24, шаг `npm install -g npm@^11.15.0` перед публикацией, GitHub-hosted runner (`ubuntu-latest`), `id-token: write` только у `publish`. `NODE_AUTH_TOKEN` из `secrets.NPM_TOKEN` передаётся, но не требуется: npm сначала пробует OIDC, токен — запасной (исходники npm CLI, Context7); скрипт пишет только «задан / не задан». `docs/releasing.md`: первый выпуск с временным granular-токеном (scope `@verdeect`, срок ≤ 1 дня), затем `npm trust github`, «disallow tokens», удаление секрета и отзыв токена. Флаги `npm trust github` сверяются с `--help` (в Context7 их нет) | PRD r4 D-8, §3, FR-11, §9, AC-8; `.ai-factory/skill-context/aif-ci` (r4) | `release.spec.ts` (AC-8 — runner, Node 24, npm ≥ 11.15, сухой прогон без токена; AC-11 — разделы Trusted Publishing в `releasing.md`) |
| Форма конвейера — по правилу aif-ci «Library Package Pipeline», переложенному на GitHub: `test` — матрица Node 22 и 24 (PRD §11 r2, D-7); `build` — `make build pack-check`, `dist/` — артефакт; `publish` — строгий шаблон тега `^v\d+\.\d+\.\d+$`, проверки тега и `npm view` до публикации, `.npmrc` с токеном только внутри job (`actions/setup-node` + `registry-url`, `NODE_AUTH_TOKEN`) | `.ai-factory/skill-context/aif-ci` × FR-11, §11 | Задачи 12, 14 |
| Минимальная Node — 22.12, Node 20 не поддерживается; матрица CI — Node 22 и 24, `make test` на обеих. Конфликт PRD r1 §11 с `vitest` 5.0.4 (`engines.node` `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0`) снят в r2. Из E1 остался `engines.node: ">=20"` в `package.json` и в ожидании теста FR-1 — задачи 1 и 17 меняют их на `">=22.12"`. До выпуска 1.0.0 это не ломающее изменение (BR-1, D-7). Шаблоны проектов-потребителей (`tests/consumer/*`) Node 20 не упоминают, их не трогаем | PRD r2: D-7, FR-1, UC-1, §9, §11; `.ai-factory/skill-context/aif-ci` (обновлён) | Задачи 1, 5, 12, 14, 17, 19 |
| Изменения пользователя в `requirements/0000-verdeect-auth/` (`prd.md`, `README.md`), `requirements/INDEX.md` и `.ai-factory/skill-context/aif-ci/SKILL.md` (r2) коммитятся вместе с этапом — в коммите 1. План эти файлы не правит | указание пользователя 2026-10-22 | Commit Plan |
| Makefile уже соответствует FR-10: есть цели `install`, `lint`, `analyse`, `test`, `build`, `pack-check`, `ci`, `clean`; `ci` = `lint analyse test build pack-check`; Docker-целей нет. Makefile не меняется, соответствие фиксирует тест | FR-10, AC-11; сверка Makefile 2026-10-22 | Задача 14 |
| Новые тесты E2 лежат в `tests/package/` (контур `pnpm test:package`, входит в `make pack-check` → `make ci`). В `src/` их класть нельзя: тест AC-6 (`quality.spec.ts`) требует, чтобы в unit-контуре было ровно 3 перенесённых spec-файла | AC-6 × AC-8–AC-11 | Задачи 14–17 |
| AC-10 «Markdown-файлы репозитория» = документация пакета: `README.md`, `CHANGELOG.md`, `AGENTS.md`, `docs/**/*.md`. Служебные `requirements/`, `.ai-factory/`, `.claude/`, `.serena/` не проверяются: это входные требования и инструменты агентов, они не входят в документацию пакета (§9) | AC-10 × §9 | Задача 16 |
| AC-9 «TSDoc у каждого публичного экспорта»: ESLint (`eslint-plugin-jsdoc`, `jsdoc/require-jsdoc`) требует TSDoc у **каждого** `export` в `src/**/*.ts` кроме `*.spec.ts`, включая поля и методы экспортируемых интерфейсов и классов. Публичность определяется реэкспортом в `index.ts`, а линтер её не видит, поэтому правило строже AC: документируются и внутренние экспорты (`toPrincipal`, `REQUIRE_*`) | AC-9, §9 «TSDoc» | Задачи 1–4, 15 |
| AC-9 «новый экспорт без записи в README и CHANGELOG — падение»: тест получает экспорты трёх подпутей из `dist/**/index.d.ts` через TypeScript Compiler API (`typescript` уже в devDependencies), сверяет их с таблицей §8 и ищет каждое имя в `README.md` и `CHANGELOG.md` | AC-9, §8 | Задачи 5, 10, 15 |
| AC-8 «версия уже в npm» проверяется без сети: тест поднимает локальный HTTP-сервер реестра на `node:http` и передаёт его в скрипт через `npm_config_registry`. 404 означает, что версии нет; packument с версией — что она уже есть | AC-8 | Задачи 11, 14 |
| Скрипт публикации при ошибке `npm view`, отличной от E404 (сеть, 5xx), падает и не публикует: при неопределённости ничего не перезаписывается | UC-3 err-2 | Задачи 11, 14 |
| Дата раздела `## [1.0.0]` в CHANGELOG ставится при выпуске (шаг UC-3 в `docs/releasing.md`). До выпуска — дата завершения E2. Тест проверяет заголовок `## [1.0.0]`, а дату — только по формату | FR-12, AC-11 × UC-3 | Задачи 10, 13, 14 |
| `CHANGELOG.md` становится обязательным в архиве: в E1 он был разрешён, но не требовался | FR-12 × AC-4 (решение E1) | Задача 17 |
| `license: "UNLICENSED"`, файла `LICENSE` нет. README пишет об этом в разделе «Лицензия» | `[ASSUMPTION]` D-4 | Задача 5 |
| `DESCRIPTION.md` и `ARCHITECTURE.md` упоминают GitLab CI — их обновляет задача 19 | решение по CI | Задача 19 |
| Изменения пользователя r3 (`requirements/0000-verdeect-auth/prd.md`, `README.md`, `requirements/INDEX.md`, `.ai-factory/skill-context/aif-ci/SKILL.md`) коммитятся вместе с этапом | указание пользователя 2026-10-22 | Commit Plan |

Комбинации выпуска (UC-3, FR-11, AC-8) — что делает `publish`:

| Событие | `version` | В npm | Job `publish` | Результат | Проверка |
|---|---|---|---|---|---|
| push в ветку / `pull_request` | любая | — | не создаётся (`if` по тегу) | только проверки | разбор `ci.yml` |
| тег `v1.0.0` | `1.0.0` | нет | после зелёных `lint`, `test`, `build` | `npm publish --access public` | сухой прогон: доходит до `npm publish --dry-run`, код 0 |
| тег `v1.0.1` | `1.0.0` | — | старт | падение до `npm publish`: «тег v1.0.1 не совпадает с version 1.0.0» | сухой прогон, код ≠ 0, команды публикации нет |
| тег `v1.0.0` | `1.0.0` | есть | старт | падение до `npm publish`: «версия 1.0.0 уже опубликована» | сухой прогон с локальным реестром |
| тег `v1.0` / `release-1` | — | — | не создаётся (шаблон тега) + скрипт отвергает | — | разбор `ci.yml` + сухой прогон |

## Commit Plan
- **Commit 1** (после задач 1–4): `docs(auth): TSDoc for public API, lint rule and Node 22.12 baseline (AC-9, D-7)`. В коммит также входят: требования r2 (`requirements/0000-verdeect-auth/prd.md`, `requirements/0000-verdeect-auth/README.md`, `requirements/INDEX.md`), `.ai-factory/skill-context/aif-ci/SKILL.md`, этот план и логи `.ai-factory/logs/skills/aif-improve/*`.
- **Commit 2** (после задач 5–10): `docs(auth): standalone README, guides and CHANGELOG (FR-9, FR-12)`
- **Commit 3** (после задач 11–13): `ci(auth): GitHub Actions pipeline, publish script and release guide (FR-11)`
- **Commit 4** (после задач 14–18): `test(auth): release, exports and docs checks for AC-8–AC-11`
- **Commit 5** (после задачи 19): `docs(auth): update AGENTS.md and project context for E2`

## Tasks

### Phase 1: TSDoc публичного API и правило линтера (AC-9, FR-9)

- [x] **Задача 1: правило TSDoc в ESLint, зависимости проверок и минимальная Node 22.12** (AC-9, FR-9, FR-1, D-7)
  **Skill:** none — конфигурация (`package.json`, `pnpm-lock.yaml`, `eslint.config.js`, MODIFY)
  Файлы: `package.json`, `pnpm-lock.yaml`, `eslint.config.js`.
  - `package.json`: `engines.node` `">=20"` → `">=22.12"` (FR-1 r2, D-7). Другие поля не трогать. Ожидание в тесте FR-1 меняет задача 17.
  - Добавить в `devDependencies` точные версии `eslint-plugin-jsdoc` и `yaml`. `yaml` нужен для разбора workflow в задаче 14. Ставить командой `pnpm add -D -E <pkg>@<version>`, версии не моложе `minimumReleaseAge` (pnpm по умолчанию — сутки). Перед правкой сверить API flat config `eslint-plugin-jsdoc` и `yaml.parse` через Context7.
  - В `eslint.config.js` добавить блок только для `src/**/*.ts` с `ignores: ['src/**/*.spec.ts']`. В нём `jsdoc/require-jsdoc`: `publicOnly: true`, `require` для `FunctionDeclaration`, `ClassDeclaration`, `MethodDefinition`, `ArrowFunctionExpression`. В `contexts` — `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`, `TSPropertySignature`, `TSMethodSignature`, `VariableDeclaration` (экспортируемые константы и декораторы-стрелки), `TSParameterProperty` (поля `VerifyError`). Точный набор контекстов подобрать так, чтобы правило ловило каждый экспорт и каждое поле экспортируемого интерфейса (решение в Requirements Reconciliation). `private`- и `#`-члены классов не проверяются: например, `verifier`, `reflector` и `logger` у `VerdeectAuthGuard` (`src/nest/verdeect-auth.guard.ts:39-42`). Для этого — селекторы вида `TSParameterProperty[accessibility!="private"]` и `MethodDefinition[accessibility!="private"]`. Конструкторы без публичных параметров исключаются через `exemptEmptyConstructors`. Через Context7 уточнить, как `publicOnly` работает для `TSPropertySignature` внутри экспортируемого интерфейса. Если поле не ловится, добавить контекст `ExportNamedDeclaration TSPropertySignature`.
  - Блок `{ files: ['*.js', '*.mjs', 'tests/consumer/**/*.mjs'] }` дополнить `scripts/**/*.mjs` (node globals для задачи 11).
  - Первая строка `eslint.config.js` уже ссылается на требования — дописать AC-9.
  Логи: не применимо (конфигурация).
  Готово, когда `pnpm lint` показывает ошибки `jsdoc/require-jsdoc` только в `src/` без TSDoc. Это ожидаемо, исправляют задачи 2–4.

- [x] **Задача 2: TSDoc ядра `@verdeect/auth`** (AC-9, FR-9, BR-1)
  **Skill:** nestjs-code generic src/index.ts (MODIFY) — тип `generic` для компонентов библиотеки; тот же подход для `src/verifier.ts`, `src/principal.ts`, `src/verify-error.ts`
  Файлы: `src/index.ts`, `src/verifier.ts`, `src/principal.ts`, `src/verify-error.ts`.
  - TSDoc у каждого экспорта и каждого поля: `TokenKind`, `TrustedIssuer` (`iss`, `jwksUri`, `kinds`), `VerifierOptions` (`issuers`, `resource`, `clockToleranceSec`), `UserPrincipal`/`ServicePrincipal`/`AgentPrincipal` (все поля, включая `kind`, `sub`, `clientId`, `scopes`, `asid`, `wid`, `prof`), `Principal`, `Verifier.verify`, `createVerifier`, `toPrincipal`, `VerifyRule`, `VerifyReason`, `VerifyError` (`rule`, `reason`).
  - Содержание по §9: назначение, `@param`, `@returns`, `@throws`. Для `createVerifier`: `Error` с префиксом `verdeect-auth:` при пустом `issuers`, пустом `resource` или повторе `iss`. Для `Verifier.verify`: `VerifyError` при отказе; сбой JWKS пробрасывается как есть. `@example` — у `createVerifier` и `Verifier.verify` (как в README).
  - Заголовочные комментарии: `verdeect-auth` → `@verdeect/auth`. Ссылки `prd.md §7.5` → `PRD Identity §7.5`: в этом репозитории `prd.md` — другой документ.
  - **Код не меняется.** Только комментарии: сигнатуры, строки ошибок и порядок проверок те же (BR-1, FR-5).
  Логи: не применимо (ядро не логирует, base.md).
  Зависит от: 1.
  Готово, когда `pnpm lint` чист для этих файлов, а `pnpm test` зелёный (89+ тестов, AC-6 не нарушен).

- [x] **Задача 3: TSDoc адаптера `@verdeect/auth/nest`** (AC-9, FR-9, BR-1)
  **Skill:** nestjs-code generic src/nest/verdeect-auth.module.ts (MODIFY); тот же подход для `src/nest/verdeect-auth.guard.ts`, `src/nest/decorators.ts`, `src/nest/index.ts`
  Файлы: `src/nest/index.ts`, `src/nest/verdeect-auth.module.ts`, `src/nest/verdeect-auth.guard.ts`, `src/nest/decorators.ts`.
  - TSDoc: `VerdeectAuthModule.forRoot`/`forRootAsync` (параметры, `isGlobal` по умолчанию `true`, `@example` с `forRootAsync`), `VerdeectAuthModuleOptions.isGlobal`, `VerdeectAuthAsyncOptions` (`imports`, `inject`, `useFactory`), `VerdeectAuthGuard` и `canActivate` (порядок 401 → 403 → 409 → 403, `@throws` с кодами `UNAUTHENTICATED`, `USER_TOKEN_REQUIRED`, `FORBIDDEN`, `TENANT_REQUIRED`, `SCOPE_REQUIRED`; сбой JWKS → 500), `VERDEECT_VERIFIER`, `RequireTenant`, `RequireScope` (`@throws` без областей), `RequireUser`, `RequireService` (несовместимость с `RequireUser` → 500), `PrincipalCarrier.principal`, `principalOf`, константы `REQUIRE_*`.
  - Заголовки: `verdeect-auth/nest` → `@verdeect/auth/nest`. Ссылки `prd.md §…` → `PRD Identity §…`: например, `verdeect-auth.guard.ts:1`. Строки `verdeect-auth:` в ключах метаданных — контракт, не трогать.
  - Код, тексты логов и ответов не меняются (BR-1).
  Логи: логи guard'а не меняются. TSDoc `VerdeectAuthGuard` описывает их как есть: WARN — отказ (`rule`, `reason`, `iss`, `kid`), DEBUG — истёкший токен и решения декораторов.
  Зависит от: 1.
  Готово, когда `pnpm lint` чист для `src/nest/`, а `pnpm test` зелёный.

- [x] **Задача 4: TSDoc тестовых помощников `@verdeect/auth/testing`** (AC-9, FR-9)
  **Skill:** nestjs-code generic src/testing/test-signer.ts (MODIFY); тот же подход для `src/testing/vectors.ts`, `src/testing/index.ts`
  Файлы: `src/testing/index.ts`, `src/testing/test-signer.ts`, `src/testing/vectors.ts`.
  - TSDoc: `createTestSigner` (`@example` из README), `TestSignerOptions` (`iss`, `kinds`), все методы `TestSigner` (`issuer`, `jwksRequests`, `rotate`, `sign`, `signWithUnpublishedKey`, `signWithForeignKey`, `forge`, `userToken`, `serviceToken`, `agentToken`, `close`), `Claims`, `Header`, `TEST_IDENTITY_ISS`, `TEST_ORCHESTRATOR_ISS`, `TEST_RESOURCE`, `tokenVectors`, `TokenVector` (`id`, `rule`, `title`, `token`, `expect`), `VectorExpectation`, `VectorSigners` (`identity`, `orchestrator`).
  - В TSDoc точки входа — оговорка: модуль грузится только с условием `development` (FR-2, D-6).
  - Заголовки: `verdeect-auth/testing` → `@verdeect/auth/testing`. Ссылки `prd.md §…` → `PRD Identity §…`. Значения констант и векторы не меняются (FR-5).
  Логи: не применимо (`testing` не логирует).
  Зависит от: 1.
  Готово, когда `pnpm lint` полностью чист, а `pnpm test` зелёный.

### Phase 2: Документация пакета (FR-9, FR-12, BR-1, BR-2)

- [x] **Задача 5: автономный `README.md`** (FR-9, BR-2, BR-1, AC-9, AC-10, D-4)
  **Skill:** none — Markdown (`README.md`, MODIFY)
  Основа — текущий `README.md`, перенесённый из Identity. Переписать по §9:
  - Заголовок `# @verdeect/auth`. Назначение — один абзац без отсылок к Identity как к «workspace».
  - Разделы (заголовки `##`, тест AC-10 ищет их по ключевым словам):
    - «Совместимость»: Node ≥ 22.12 (проверяется на 22 и 24, Node 20 не поддерживается — D-7), только ESM, NestJS 12 — необязательная peer-зависимость.
    - «Установка»: `pnpm add @verdeect/auth@1.0.0 --save-exact` и аналог для npm с `--save-exact` (BR-2).
    - «Быстрый старт»: без Nest — `createVerifier`; с Nest — `forRootAsync`, `@UseGuards(VerdeectAuthGuard)`, декораторы, `APP_GUARD`.
    - «Правила V-1…V-8»: таблица с `reason`, взять из текущего README.
    - «`Principal`»: по видам.
    - «NestJS»: порядок проверок guard'а и ответы `{error: {code, message, details}}`.
    - «Логи».
    - «Тесты»: `@verdeect/auth/testing`, условие `development`.
    - «Чего библиотека не делает»: роли и права — Platform `authz/check`, актуальность `pep`.
    - «API»: таблица экспортов трёх подпутей ровно по §8. Тест AC-9 ищет здесь каждое имя.
    - «Документация»: ссылки на `docs/getting-started.md`, `docs/nestjs.md`, `docs/testing.md`, `docs/errors.md`, `docs/releasing.md`, `CHANGELOG.md`.
    - «Версионирование»: semver, BR-1 со списком ломающих изменений, точный пин (BR-2).
    - «Разработка»: `make help`, `make ci`.
    - «Лицензия»: `UNLICENSED`, D-4.
  - Все импорты — `@verdeect/auth`, `@verdeect/auth/nest`, `@verdeect/auth/testing`.
  - Удалить разделы «Сборка» (условия `development → src`, `apps/identity`) и «Разработка» с `corepack pnpm --filter`. Ссылки `(01 §…)`, `prd.md §7.1` и `D9` переписать словами («соглашение об ответах API Вердикта») или публичными адресами. Ссылок `../../` и относительных путей в Identity нет (AC-10, §9).
  - Решение о `APP_GUARD` и маршрутах без токена описано кратко, подробности — в `docs/nestjs.md`.
  Логи: не применимо (документация).
  Зависит от: 2, 3, 4 (формулировки сверяются с TSDoc).

- [x] **Задача 6: `docs/getting-started.md`** (FR-9, UC-1)
  **Skill:** none — Markdown (CREATE)
  Пошаговое подключение к новому сервису NestJS:
  1. Установка с точной версией (BR-2).
  2. `reflect-metadata` и peer-зависимости.
  3. Конфигурация издателей: Identity `{iss, jwksUri}` и Orchestrator с `kinds: ['agent']`.
  4. Переменные окружения сервиса как пример `ConfigService` (имена вида `AUTH_ISSUER_*`, `AUTH_RESOURCE`) — только пример, библиотека переменные не читает. URL конкретных окружений не приводить (BR-3).
  5. `forRootAsync` в корневом модуле.
  6. Guard на контроллере.
  7. Проверка вызовом: `curl -H "Authorization: Bearer <token>"` → 200; без токена → 401 `UNAUTHENTICATED`.
  Наверху — ссылка «назад» на `../README.md` (единственный допустимый вид относительной ссылки вверх). Ссылки только внутри репозитория.
  Логи: не применимо.
  Зависит от: 5.

- [x] **Задача 7: `docs/nestjs.md`** (FR-9, UC-1)
  **Skill:** none — Markdown (CREATE)
  Содержание:
  - `forRoot`/`forRootAsync`, `isGlobal` (по умолчанию `true`; `false` — свой кэш JWKS на каждый импорт).
  - Guard на контроллере и через `APP_GUARD` (`useExisting: VerdeectAuthGuard`).
  - Таблица сочетаний декораторов: метод перекрывает класс; `RequireUser` + `RequireService` → 500 (ошибка конфигурации); `RequireScope()` без областей → исключение при объявлении; `RequireTenant` для service → всегда 409.
  - Порядок проверок и ответы (таблица из README).
  - Чтение `Principal` через `principalOf(request)` и сужение по `kind`.
  - Маршруты без токена: без `@UseGuards` при локальном guard'е. При `APP_GUARD` все маршруты требуют токен, публичные маршруты выносятся в отдельное приложение или guard не ставится глобально — так, как работает текущий код. Новых декораторов не придумывать: поведение не меняется (BR-1).
  Логи: раздел «Логи guard'а» — уровни и поля, как в README.
  Зависит от: 5.

- [x] **Задача 8: `docs/testing.md`** (FR-9, UC-2)
  **Skill:** none — Markdown (CREATE)
  Содержание:
  - `createTestSigner`: все методы `TestSigner` с примерами — `userToken`/`serviceToken`/`agentToken` с переопределением и удалением claim'а через `undefined`, `sign`, `rotate`, `signWithUnpublishedKey`, `signWithForeignKey`, `forge`, `jwksRequests`, `close`, `issuer`.
  - Пример теста Vitest с `Test.createTestingModule` и `VerdeectAuthModule.forRoot({issuers: [signer.issuer], resource: TEST_RESOURCE})`.
  - Векторы `tokenVectors` в цикле `it.each` против маршрута сервиса: поля `id`, `rule`, `expect`.
  - Условие `development`: Vitest ставит его по умолчанию; Node — `node --conditions=development`. Почему `testing` недоступен в production: `exports` без `default`, иначе `ERR_PACKAGE_PATH_NOT_EXPORTED` (FR-2, D-6).
  - Типы `@verdeect/auth/testing` видны всегда, поэтому `tsc --noEmit` тестов проходит.
  Логи: не применимо.
  Зависит от: 5.

- [x] **Задача 9: `docs/errors.md`** (FR-9)
  **Skill:** none — Markdown (CREATE)
  Содержание:
  - `VerifyError`: поля `rule` (`V-1`…`V-8`) и `reason`, полная таблица `reason` → правило (из типа `VerifyReason`).
  - Что видит клиент: 401 `UNAUTHENTICATED` без причины.
  - Что пишется в лог: WARN `rule`, `reason`, `iss`, `kid`; истёкший токен — DEBUG. Токен и `Authorization` в лог не попадают.
  - Сбой JWKS (сеть, таймаут, не-JSON) — не `VerifyError`: исключение пробрасывается, guard отвечает 500, а не 401. Почему так: отказ инфраструктуры не должен выглядеть как «токен неверный».
  - Ошибки конфигурации с префиксом `verdeect-auth:` — при старте.
  - Пример `try/catch` с `instanceof VerifyError` для сервисов без Nest.
  Логи: раздел и есть описание логов.
  Зависит от: 5.

- [x] **Задача 10: `CHANGELOG.md`** (FR-12, AC-9, AC-11, BR-1)
  **Skill:** none — Markdown (CREATE)
  Формат Keep a Changelog 1.1.0 со ссылкой на keepachangelog.com и semver.org. Разделы `## [Unreleased]` (пустой) и `## [1.0.0] - <дата>`. Дата — день завершения E2, при выпуске её уточняют по `docs/releasing.md`.
  В 1.0.0:
  - «Вынос из `verdeect-identity` без изменения поведения, новое имя `@verdeect/auth`, подпуть `testing` закрыт для production» — текст FR-12 дословно.
  - Подраздел `### Added`: перечислить экспорты трёх подпутей по §8 — тест AC-9 ищет каждое имя.
  - Подраздел `### Changed`: пути импорта `verdeect-auth*` → `@verdeect/auth*`.
  - Для мажорных версий — подраздел «Как обновиться» (UC-3 alt-1); для 1.0.0 — «переход с workspace-пакета `verdeect-auth`: заменить пути импорта».
  Логи: не применимо.
  Зависит от: 5.

### Phase 3: Выпуск (FR-11, UC-3, AC-8)

- [x] **Задача 11: скрипт публикации `scripts/publish.mjs`** (FR-11, UC-3 err-1/err-2, AC-8)
  **Skill:** nestjs-code generic scripts/publish.mjs (CREATE)
  Файл: `scripts/publish.mjs`. Node ESM, только stdlib (`node:child_process` `execFileSync`/`spawnSync` без shell, `node:fs`). Первая строка — комментарий с FR-11, UC-3, AC-8.
  Поведение, по порядку:
  1. Тег — из `GITHUB_REF_NAME`. Пусто → exit 1 «GITHUB_REF_NAME не задан».
  2. Тег не соответствует `^v\d+\.\d+\.\d+$` → exit 1.
  3. `version` из `package.json` (корень репозитория — относительно `import.meta.dirname`). `tag !== 'v' + version` → exit 1: `[publish] тег vX не совпадает с version Y` (UC-3 err-1).
  4. `npm view @verdeect/auth@<version> version --json`. Код 0 с непустым выводом → exit 1 «версия Y уже опубликована» (UC-3 err-2). Ошибка с `E404` → версии нет, продолжаем. Любая другая ошибка → exit 1 с stderr npm: при неопределённости не публикуем.
  5. `npm publish --access public` и `--dry-run`, если скрипт запущен с `--dry-run`. Перед запуском строка `[publish] npm publish --access public[ --dry-run]` — тест AC-8 проверяет её наличие или отсутствие. Код npm → код скрипта.
  - Реестр не задаётся в скрипте: npm берёт его из `.npmrc` или `npm_config_registry` (тест подставляет локальный).
  - Перед реализацией сверить через Context7 (npm CLI): поведение `npm view` для несуществующей версии (E404 в stderr, код) и что `npm publish --dry-run` не требует авторизации и не обращается к реестру. Если `--dry-run` всё же ходит в реестр, тестовый сервер должен отвечать и на этот запрос — отметить в задаче 14.
  Логи (verbose, stdout, префикс `[publish]`): тег, `version`, команда `npm view` и её результат (опубликована / E404 / ошибка), решение, команда публикации. Ошибки — stderr с причиной. Токен и содержимое `.npmrc` не печатать.
  Зависит от: 1 (ESLint globals для `scripts/`).

- [x] **Задача 12: GitHub Actions `.github/workflows/ci.yml`** (FR-11, AC-8, §11)
  **Skill:** none — конфигурация CI (CREATE)
  Файл: `.github/workflows/ci.yml`. Заголовочный комментарий: стадии, решение «GitHub вместо GitLab» (ссылка на FR-11 и этот план), environment `npm`, секрет `NPM_TOKEN`, ruleset тегов.
  - `on`: `push` (ветки `**`, теги — только `v[0-9]+.[0-9]+.[0-9]+`), `pull_request`. `permissions: contents: read`. `concurrency` по ref с `cancel-in-progress` только для не-тегов.
  - Общая подготовка в каждом job, кроме `publish`: `actions/checkout`, `corepack enable` (pnpm из `packageManager`), `actions/setup-node` (`node-version`, `cache: pnpm`), `make install`. Версии actions — мажорные теги актуальных релизов, сверить через Context7.
  - Jobs по стадиям FR-11 (`needs` задаёт порядок):
    - `install`: `make install`, прогревает кэш pnpm.
    - `lint`: `needs: install`; `make lint`, `make analyse`.
    - `test`: `needs: lint`; `strategy.matrix.node: [22, 24]`, `fail-fast: false`; `make test` на обеих версиях (§11 r2, D-7).
    - Версия Node: `install`, `lint`, `build` и `publish` — `node-version: 22` (минимальная поддерживаемая, `build` прогоняет `pack-check` на ней); версию меняет только матрица `test`. Так у `cache: pnpm` один ключ, и угадывать версию не нужно.
    - `build`: `needs: test`; Node 22; `make build pack-check` — проверки архива и потребителя (FR-7, FR-8); `actions/upload-artifact` с `dist/`.
    - `publish`: `needs: build`; `if: startsWith(github.ref, 'refs/tags/v')`; `environment: npm`; `actions/checkout`, `actions/setup-node` с `registry-url: https://registry.npmjs.org`, `actions/download-artifact` → `dist/`, без `make install`: `npm publish` зависимости не нужны; `node scripts/publish.mjs` с `env: NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`.
  - Нигде нет `continue-on-error`. Glob тегов GitHub — первый фильтр, строгую проверку `^v\d+\.\d+\.\d+$` делает скрипт.
  Логи: шаги именованы (`name:`) по целям Makefile. Секреты не выводятся: GitHub маскирует, а скрипт токен не печатает.
  Зависит от: 11.

- [x] **Задача 13: `docs/releasing.md`** (FR-12, UC-3, BR-1, AC-11)
  **Skill:** none — Markdown (CREATE)
  Содержание:
  - **UC-3 по шагам:**
    1. `main` зелёный (`make ci`).
    2. Повысить `version` по semver.
    3. Раздел версии в `CHANGELOG.md` с датой выпуска.
    4. Коммит, `git tag vX.Y.Z`, `git push origin vX.Y.Z`.
    5. CI: `lint` → `test` → `build` → `publish`.
    6. Проверить `npm view @verdeect/auth@X.Y.Z`.
  - **Ошибки:** тег не совпадает с `version` — исправить и перетегировать; версия уже в npm — повысить версию, ничего не перезаписывается.
  - **Semver (BR-1):** список ломающих изменений; мажор + раздел «Как обновиться» в CHANGELOG (UC-3 alt-1).
  - **Переменные CI** — разовая настройка репозитория GitHub: environment `npm` с правилом развёртывания «только теги `v*`», секрет `NPM_TOKEN` (automation token npmjs.com, scope `@verdeect`) в этом environment, ruleset на теги `v*`: создание только мейнтейнерами, удаление и перезапись запрещены.
  - Ручная публикация с машины разработчика — не способ выпуска (§3).
  - Ссылки на `../CHANGELOG.md` и `../README.md`.
  Логи: раздел «Где смотреть логи публикации» — шаги job `publish`, строки `[publish]`.
  Зависит от: 10, 11, 12.

### Phase 4: Тесты (AC-8–AC-11)

- [x] **Задача 14: тест выпуска `tests/package/release.spec.ts`** (AC-8, AC-11, FR-10, FR-11, FR-12, BR-1)
  **Skill:** nestjs-code test unit tests/package/release.spec.ts (CREATE)
  Первая строка — комментарий с требованиями. Помощники — `runCommand`, `REPO_ROOT` из `./support/pack.js`. Локальный реестр — `node:http` на `127.0.0.1:0`: режим `missing` → 404 `{"error":"Not found"}`, режим `published` → packument `{name, 'dist-tags': {latest: '1.0.0'}, versions: {'1.0.0': {name, version}}}`. Скрипт запускается `runCommand('node', ['scripts/publish.mjs', '--dry-run'], REPO_ROOT)` с `env`: `GITHUB_REF_NAME`, `npm_config_registry`. `runCommand` сейчас не принимает `env` (`tests/package/support/pack.ts:41-48`). Добавить необязательный параметр `env`, сохранив сигнатуру для старых вызовов. Передаётся `{ ...process.env, ...env }`: `execFile` заменяет окружение целиком, и без слияния пропадёт `PATH`. Тест также задаёт `npm_config_userconfig` — пустой временный файл, удаляется в `afterAll`. Так `@verdeect:registry` и токены из `~/.npmrc` разработчика не перебьют локальный реестр.
  `describe('UC-3: выпуск версии', …)`:
  - `it('AC-8: push в ветку и pull_request — job publish не создаётся (if только для refs/tags/v)')` — разбор `.github/workflows/ci.yml` через `yaml`.
  - `it('AC-8: publish нуждается в build → test → lint → install, без continue-on-error, environment npm, NODE_AUTH_TOKEN из secrets.NPM_TOKEN')`.
  - `it('FR-11: стадии install → lint → test → build → publish; test — матрица Node 22 и 24 (D-7); триггеры push и pull_request')` — `jobs.test.strategy.matrix.node` равен `[22, 24]`, у `install`, `lint`, `build` и `publish` `node-version` равен 22.
  - `it('AC-8: тег v1.0.0 при version 1.0.0 — сухой прогон доходит до npm publish --dry-run, код 0')` — реестр `missing`. Ожидаемая `version` читается из `package.json`, тег строится из неё.
  - `it('AC-8: тег v1.0.1 при version 1.0.0 — падение до npm publish с сообщением о несовпадении')` — код ≠ 0, в выводе «не совпадает», строки `[publish] npm publish` нет.
  - `it('AC-8: версия уже в npm — падение до npm publish')` — реестр `published`.
  - `it('AC-8: тег не по шаблону v<semver> — падение до npm publish')` — `v1.0`.
  - `it('AC-11: Makefile — цели install, lint, analyse, test, build, pack-check, ci, clean; ci = lint analyse test build pack-check; Docker-целей нет (FR-10)')` — разбор текста Makefile.
  - `it('AC-11: CHANGELOG.md — Keep a Changelog, раздел [1.0.0] с текстом FR-12')`.
  - `it('AC-11: docs/releasing.md описывает UC-3 — version, CHANGELOG, тег vX.Y.Z, NPM_TOKEN, мажорная версия при ломающем изменении (BR-1)')`.
  Логи: `runCommand` уже печатает команду (`[package-check]`). Сервер реестра печатает `[package-check] registry <mode> <method> <url>`.
  Зависит от: 10, 11, 12, 13.

- [x] **Задача 15: тест экспортов и TSDoc `tests/package/exports.spec.ts`** (AC-9, §8)
  **Skill:** nestjs-code test unit tests/package/exports.spec.ts (CREATE)
  Требует собранного `dist/` — тот же `beforeAll`, что в `tarball.spec.ts`.
  `describe('UC-3: публичный API @verdeect/auth', …)`:
  - `it('AC-9: экспорты ".", "./nest", "./testing" совпадают с таблицей §8 (значения и типы)')`. TypeScript Compiler API: `ts.createProgram` по `dist/index.d.ts`, `dist/nest/index.d.ts`, `dist/testing/index.d.ts`, затем `checker.getExportsOfModule`. Сравнить отсортированные имена с константой `EXPECTED_EXPORTS`, в которой по подпутям переписана таблица §8.
  - `it('AC-9: каждое имя экспорта есть в README.md и в CHANGELOG.md')` — поиск только в обратных кавычках: `` `Name` ``. Границы слова недостаточно: `Principal`, `Verifier`, `Claims` и `Header` встречаются и в обычном тексте, и пропуск в таблице не был бы замечен. Имена в кавычках лежат в таблице «API» в README (задача 5) и в списке `### Added` в CHANGELOG (задача 10). Падение перечисляет недостающие.
  - `it('AC-9: make lint требует TSDoc — экспорт без комментария в src/ даёт jsdoc/require-jsdoc')`. `new ESLint({ cwd: REPO_ROOT })` и `lintText('export function undocumented(): void {}\n', { filePath: 'src/__tsdoc-probe__.ts' })` — ожидается сообщение `jsdoc/require-jsdoc`. Файл на диск не пишется: правила в `eslint.config.js` не type-aware (нет `parserOptions.project`), поэтому `lintText` работает и с несуществующим путём. Второй случай — тот же код с TSDoc, ошибок `jsdoc/*` нет.
  Логи: при падении — список лишних и недостающих имён по подпутям.
  Зависит от: 1–5, 10.

- [x] **Задача 16: тест документации `tests/package/docs.spec.ts`** (AC-10, FR-9, BR-2)
  **Skill:** nestjs-code test unit tests/package/docs.spec.ts (CREATE)
  Набор файлов (Requirements Reconciliation): `README.md`, `CHANGELOG.md`, `AGENTS.md`, `docs/**/*.md`.
  `describe('FR-9: документация пакета', …)`:
  - `it('FR-9: есть все файлы §9 — README.md, CHANGELOG.md, AGENTS.md, docs/getting-started.md, nestjs.md, testing.md, errors.md, releasing.md')`.
  - `it('AC-10: относительные ссылки в Markdown ведут на существующие файлы')`. Ссылки `[..](path)` и `[..](path#anchor)` без схемы и без `#…` в начале разрешаются от каталога файла. Перед поиском ссылок из текста удаляются fenced-блоки (```…```) и inline-код: иначе `handlers[kind](principal)` в примерах задач 6–9 считался бы ссылкой. Отчёт — `файл → ссылка`.
  - `it('AC-10: в Markdown нет ссылок ../../ и путей verdeect-identity/ как относительных ссылок')`.
  - `it('AC-10: в README есть разделы — установка, быстрый старт, правила V-1…V-8, Principal, NestJS, тесты, версионирование')`. Заголовки `##`, сравнение по ключевому слову без учёта регистра.
  - `it('BR-2: README показывает установку с точной версией — @verdeect/auth@<version> и --save-exact')`. `version` — из `package.json`.
  Логи: при падении — список битых ссылок и недостающих разделов.
  Зависит от: 5–10, 13. `AGENTS.md` уже есть, и тест должен пройти на нём. Задача 19 его обновит, после неё тест прогоняется повторно.

- [x] **Задача 17: `CHANGELOG.md` обязателен в архиве, engines `>=22.12` — `tests/package/tarball.spec.ts`** (FR-12, AC-4, FR-1, D-7)
  **Skill:** nestjs-code test unit tests/package/tarball.spec.ts (MODIFY)
  - В тесте `AC-4: архив содержит только …` добавить `'CHANGELOG.md'` в список `required`.
  - В тесте FR-1 (`tarball.spec.ts:84-89`): в названии `engines >=20` → `engines >=22.12`, ожидание `engines: { node: '>=20' }` → `{ node: '>=22.12' }`.
  Остальное не трогать.
  Логи: не применимо (вывод теста не меняется).
  Зависит от: 1, 10.

- [x] **Задача 18: итоговая проверка `make ci`** (AC-11, AC-8–AC-10)
  **Skill:** none — команды проверки
  Запустить по одной: `make lint`, `make analyse`, `make test`, `make build`, `make pack-check`, затем `make ci` целиком. Все зелёные. Тесты AC-6 (89+ unit) и AC-1–AC-7 не сломаны. Workflow дополнительно проверить локально, если доступен `actionlint` (`pnpm dlx` не использовать — новая зависимость без пина); если нет — достаточно теста задачи 14. При падении исправлять код и документацию, а не ослаблять тесты.
  Логи: сохранить хвост вывода `make ci` в отчёт /aif-implement.
  Зависит от: 1–17.

### Phase 5: Контекст репозитория

- [x] **Задача 19: `AGENTS.md` и контекст AI Factory** (FR-9 §9 «AGENTS.md»)
  **Skill:** none — Markdown (`AGENTS.md`, `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, MODIFY)
  - `AGENTS.md`, структура: `docs/` (5 файлов), `CHANGELOG.md`, `scripts/publish.mjs`, `.github/workflows/ci.yml`, новые spec в `tests/package/` (`release.spec.ts` AC-8/AC-11, `exports.spec.ts` AC-9, `docs.spec.ts` AC-10). Таблица «Документация» — README, `docs/*`, CHANGELOG. Правило: новый экспорт — TSDoc, строка в README «API» и CHANGELOG (AC-9). Правило выпуска — только тег и CI (`docs/releasing.md`).
  - `AGENTS.md`, «Технологический стек»: `Node ≥ 20` → `Node ≥ 22.12` (D-7).
  - `.ai-factory/DESCRIPTION.md`: «CI/выпуск» → GitHub Actions; «Рантайм: Node.js ≥ 20 (CI: 20 и 22)» → «Node.js ≥ 22.12 (CI: 22 и 24)»; «Текущее состояние» → после E2.
  - `.ai-factory/ARCHITECTURE.md`: «Стек» (строка 12) `Node ≥ 20` → `Node ≥ 22.12`; в дереве (строка 48) `.gitlab-ci.yml` → `.github/workflows/ci.yml`, добавить `scripts/publish.mjs` и `docs/`. В абзаце «появляются на этапах E1–E2» (строка 53) — то же.
  Только ссылки внутри репозитория. После правки — `make pack-check`: тест AC-10 проверяет итоговый `AGENTS.md`.
  Логи: не применимо.
  Зависит от: 5–18.

## Traceability

| Требование | Задачи | Тест (файл → название) |
|---|---|---|
| UC-3 main (version → CHANGELOG → тег → CI publish) | 10, 11, 12, 13 | `tests/package/release.spec.ts` → `AC-8: тег v1.0.0 при version 1.0.0 — сухой прогон доходит до npm publish --dry-run, код 0`; `AC-11: docs/releasing.md описывает UC-3 …` |
| UC-3 alt-1 (ломающее изменение → мажор, «Как обновиться») | 10, 13 | `release.spec.ts` → `AC-11: docs/releasing.md описывает UC-3 — … мажорная версия при ломающем изменении (BR-1)` |
| UC-3 err-1 (тег ≠ version) | 11 | `release.spec.ts` → `AC-8: тег v1.0.1 при version 1.0.0 — падение до npm publish с сообщением о несовпадении` |
| UC-3 err-2 (версия уже в npm) | 11 | `release.spec.ts` → `AC-8: версия уже в npm — падение до npm publish` |
| AC-8 | 11, 12 | `release.spec.ts` → `AC-8: push в ветку и pull_request — job publish не создаётся …`, `AC-8: publish нуждается в build → test → lint → install …`, три сухих прогона, `AC-8: тег не по шаблону v<semver> …` |
| AC-9 | 1–5, 10, 15 | `tests/package/exports.spec.ts` → `AC-9: экспорты "." , "./nest", "./testing" совпадают с таблицей §8 …`, `AC-9: каждое имя экспорта есть в README.md и в CHANGELOG.md`, `AC-9: make lint требует TSDoc …` |
| AC-10 | 5–10, 13, 19 | `tests/package/docs.spec.ts` → `AC-10: относительные ссылки …`, `AC-10: в Markdown нет ссылок ../../ …`, `AC-10: в README есть разделы …` |
| AC-11 | 10, 13, 14, 18 | `release.spec.ts` → `AC-11: Makefile — …`, `AC-11: CHANGELOG.md — …`, `AC-11: docs/releasing.md …`; `make ci` зелёный (задача 18) |
| FR-9 | 2–10, 19 | `docs.spec.ts` → `FR-9: есть все файлы §9 …`; `exports.spec.ts` (TSDoc) |
| FR-10 | — (Makefile уже соответствует) | `release.spec.ts` → `AC-11: Makefile — цели … (FR-10)` |
| FR-11 | 11, 12 | `release.spec.ts` → `FR-11: стадии install → lint → test → build → publish …` + тесты AC-8 |
| FR-12 | 10, 13, 17 | `release.spec.ts` → `AC-11: CHANGELOG.md — …`; `tarball.spec.ts` → `AC-4: архив содержит только …` (CHANGELOG обязателен) |
| BR-1 | 2–4 (код не меняется), 5, 10, 13 | `release.spec.ts` → `AC-11: docs/releasing.md … (BR-1)`; AC-6 (`quality.spec.ts`) — поведение и тесты прежние |
| BR-2 | 5, 6 | `docs.spec.ts` → `BR-2: README показывает установку с точной версией …` |
| D-7 / FR-1 r2, §11 r2 (Node ≥ 22.12, CI 22 и 24) | 1, 5, 12, 17, 19 | `tarball.spec.ts` → `FR-1: package.json — … engines >=22.12 …`; `release.spec.ts` → `FR-11: … test — матрица Node 22 и 24 (D-7) …` |
