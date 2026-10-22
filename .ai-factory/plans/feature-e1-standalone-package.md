# План реализации: E1 Автономный пакет `@verdeect/auth`

Branch: feature/e1-standalone-package
Created: 2026-10-22

## Original Request
Реализуй этап roadmap «E1 Автономный пакет» по пакету требований requirements/0000-verdeect-auth/ (ревизия r1).

Скоуп этапа: UC-1, UC-2, UC-4; AC-1–AC-7; FR-1–FR-8, BR-3, BR-4, EC-1–EC-3 — остальное из пакета вне этого плана (E2). Источник истины — requirements/0000-verdeect-auth/prd.md. Покрой все требования скоупа; ссылайся на их ID в задачах и в названиях тестов. Код src/ и spec-файлы уже перенесены из verdeect-identity с историей — их поведение не меняй, правь только пути импорта и конфигурацию; сейчас tsconfig ссылается на ../../tsconfig.base.json, его нужно сделать автономным. Makefile, CI и документация в этап не входят (Makefile и CI после этапа сгенерируют /aif-build-automation и /aif-ci, документация — E2); проверки запускаются скриптами pnpm. Открытые вопросы не додумывай — спроси меня.

## Settings
- Testing: yes
- Logging: standard — runtime-логи библиотеки не меняются (ядро не логирует, логи guard'а — часть контракта FR-5); новые скрипты проверок и помощники тестов печатают шаг, команду и причину падения
- Docs: yes — обязательный docs checkpoint в /aif-implement (через /aif-docs); полная документация пакета — этап E2

## Roadmap Linkage
Milestone: "E1 Автономный пакет"
Rationale: план реализует ровно скоуп этапа E1 из `.ai-factory/ROADMAP.md` (UC-1, UC-2, UC-4; AC-1–AC-7).

## Requirements Reconciliation
Authority: `requirements/0000-verdeect-auth/prd.md` (r1) — высший источник поведения; выше ROADMAP.md и DESCRIPTION.md. Контракт поведения кода (V-1…V-8, `Principal`, guard, векторы) — PRD Identity §7.5, не меняется (FR-5, правило Library Package Scope).

Milestone scope: UC-1, UC-2, UC-4; AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7; FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8; BR-3, BR-4; EC-1, EC-2, EC-3.
Вне скоупа (E2): UC-3, AC-8–AC-11, FR-9–FR-12, BR-1, BR-2, Makefile, `.gitlab-ci.yml`, README/`docs/*`/TSDoc/CHANGELOG, TSDoc-правило ESLint (AC-9), матрица Node 20/22 в CI.

| Решение / комбинация | Источник | Проверка |
|---|---|---|
| `repository` — `git@github.com:smskin/verdeect-auth.git` (в PRD — «GitLab verdeect2/verdeect-auth») | решение пользователя 2026-10-22, уточняет FR-1 | Задача 22: поле `repository` в упакованном `package.json` |
| `license: "UNLICENSED"`, файла `LICENSE` нет | `[ASSUMPTION]` D-4 | Задача 22 |
| `CHANGELOG.md` в E1 не создаётся: тест состава архива его разрешает, но не требует; обязательным станет в E2 (FR-12) | решение пользователя 2026-10-22, AC-4 × FR-12 | Задача 22 |
| `minimumReleaseAge` — как в Identity: явно не задан (действует значение pnpm по умолчанию), `allowBuilds` явно | FR-6; `verdeect-identity/pnpm-workspace.yaml`, `.ai-factory/rules/base.md` Identity | Задача 7 |
| Опции компилятора — из `verdeect-identity/tsconfig.base.json`, кроме `declaration`/`sourceMap` (их задаёт FR-3) | FR-6, FR-3 | Задачи 1, 2, 10 |
| Пути импорта в `src/` уже относительные (`./x.js`), голых импортов по имени `verdeect-auth` нет. Строки `verdeect-auth:` в ошибках и ключах метаданных и имена файлов `verdeect-auth.*.ts` — часть контракта. FR-5 не требует правок кода | FR-5; разведка кода | Задача 10 |
| Базовый уровень тестов (AC-6): Identity `packages/verdeect-auth` — 3 файла, 89 тестов, все зелёные (прогон 2026-10-22) | AC-6 | Задача 10 |
| Ссылки `../../` в README убираются в E1 (FR-6 «ни в документации»), остальной README — E2 | FR-6 × FR-9 | Задача 9 |
| Константы `TEST_*` в `dist/testing` (`https://id.verdeect.ru` и др.) — часть замороженного контракта тестовых векторов, публичные идентификаторы, не секреты; не меняются. BR-3 проверяется составом архива (нет `.env*`, `.npmrc`, ключей) | FR-5, PRD §2 «Не входит» × BR-3 | Задача 22 |

Комбинации загрузки подпутей (FR-2, AC-1–AC-3, AC-7, EC-1):

| Подпуть | Node без условий | Node `--conditions=development` | Vitest (по умолчанию) | `tsc` NodeNext | `tsc` bundler | Без `@nestjs/*` |
|---|---|---|---|---|---|---|
| `.` | грузится | грузится | грузится | типы есть | типы есть | грузится, `createVerifier` работает (AC-2) |
| `./nest` | грузится | грузится | грузится | типы есть | типы есть | не требуется (peer optional) |
| `./testing` | `ERR_PACKAGE_PATH_NOT_EXPORTED` (AC-1) | грузится (AC-1) | грузится (AC-7) | типы есть (AC-3) | типы есть (EC-1) | — |

## Commit Plan
- **Commit 1** (после задач 1–10): `build(auth): standalone @verdeect/auth package config`
- **Commit 2** (после задач 11–21): `test(auth): consumer project templates and package helpers`
- **Commit 3** (после задач 22–24): `test(auth): tarball and consumer checks for AC-1–AC-7`
- **Commit 4** (после задачи 25): `docs(auth): update AGENTS.md for standalone package`

## Tasks

### Phase 1: Автономная конфигурация (FR-1–FR-6)

- [x] **Задача 1: автономный `tsconfig.json`** (FR-6)
  **Skill:** none — конфигурация (`tsconfig.json`, MODIFY)
  Файл: `tsconfig.json`.
  Убрать наследование от `../../tsconfig.base.json`. Перенести опции из `verdeect-identity/tsconfig.base.json`: target ES2023, module и moduleResolution NodeNext, strict, noUncheckedIndexedAccess, noImplicitOverride, exactOptionalPropertyTypes false, esModuleInterop, skipLibCheck, forceConsistentCasingInFileNames, resolveJsonModule, isolatedModules. Оставить текущие experimentalDecorators, emitDecoratorMetadata, noEmit и types node. В include: `src`, `tests` и оба конфига Vitest (`vitest.config.ts`, `vitest.package.config.ts`). В exclude: `tests/consumer` — у шаблонов свои tsconfig, и проверяются они в установленном проекте.
  Логи: не применимо (конфигурация).
  Готово, когда в файле нет `extends` и путей за пределами репозитория.

- [x] **Задача 2: сборка `.js` + `.d.ts` без карт** (FR-3)
  **Skill:** none — конфигурация (`tsconfig.build.json`, MODIFY)
  Файл: `tsconfig.build.json`.
  Наследует только `./tsconfig.json`. Включить noEmit false, declaration true, declarationMap false и sourceMap false. Оставить rootDir `src`, outDir `dist`, include `src`, exclude `src/**/*.spec.ts`. Результат — ESM `.js` и `.d.ts` для `index`, `nest/index`, `testing/index` и их зависимостей, без spec-файлов и `.map`.
  Логи: не применимо.
  Зависит от: 1.

- [x] **Задача 3: `.prettierrc.json`** (FR-6)
  **Skill:** none — конфигурация (CREATE)
  Файл: `.prettierrc.json`. Копия настроек `verdeect-identity/.prettierrc.json`: tabWidth 4, singleQuote, semi, printWidth 100, trailingComma all, endOfLine lf; для yaml/yml/json/md — tabWidth 2.
  Логи: не применимо.

- [x] **Задача 4: `.prettierignore`** (FR-6)
  **Skill:** none — конфигурация (CREATE)
  Файл: `.prettierignore`. Исключить `node_modules/`, `dist/`, `coverage/`, `pnpm-lock.yaml`, `requirements/`, `.ai-factory/`, `.claude/`, `.serena/`, `*.tgz`, а также `.ai-factory.json` и `.mcp.json` — их генерирует AI Factory, форматировать их нельзя. Ссылок на файлы Identity нет.
  Логи: не применимо.

- [x] **Задача 5: `eslint.config.js`** (FR-6)
  **Skill:** none — конфигурация ESLint flat config (CREATE)
  Файл: `eslint.config.js`. Основа — `verdeect-identity/eslint.config.js`, урезанная до одного пакета:
  - ignores: `node_modules`, `dist`, `coverage`, `requirements`, `.ai-factory`, `.claude`, `.serena`;
  - наборы `@eslint/js` recommended и `typescript-eslint` recommended;
  - для `**/*.ts` правила curly all, no-explicit-any, no-non-null-assertion, consistent-type-imports, no-unused-vars с argsIgnorePattern `^_`;
  - для `src/**/*.ts`, `tests/**/*.ts` и `vitest*.config.ts` — globals node и parserOptions emitDecoratorMetadata и experimentalDecorators (из Identity: без них consistent-type-imports ломает DI-токены Nest);
  - для `*.js`, `*.mjs` и `tests/consumer/**/*.mjs` — globals node;
  - `eslint-config-prettier` последним.
  TSDoc-правило (AC-9) сюда не входит, это этап E2.
  Логи: не применимо.

- [x] **Задача 6: `package.json` как публикуемый `@verdeect/auth` 1.0.0** (FR-1, FR-2, FR-4, FR-6, FR-7, BR-4, EC-2, EC-3, UC-4)
  **Skill:** none — конфигурация (`package.json`, MODIFY)
  Файл: `package.json`. Привести к виду:
  - name `@verdeect/auth`, version `1.0.0`, поле `private` удалить, type module, engines.node `>=20`, packageManager `pnpm@12.11.2`;
  - description на русском («Проверка access-токенов at+jwt для серверов ресурсов Вердикта 2.0: ядро на jose, модуль NestJS, тестовые помощники»), keywords (verdeect, jwt, at+jwt, oauth2, jwks, nestjs, auth);
  - repository: type git, url `git+ssh://git@github.com/smskin/verdeect-auth.git` (решение пользователя);
  - license `UNLICENSED` (D-4), sideEffects false, publishConfig.access public;
  - files: `dist`, `README.md`, `CHANGELOG.md`;
  - exports:
    - `.` → types `./dist/index.d.ts`, default `./dist/index.js`;
    - `./nest` → types `./dist/nest/index.d.ts`, default `./dist/nest/index.js`;
    - `./testing` → types `./dist/testing/index.d.ts`, development `./dist/testing/index.js`, **без default**;
    - `./package.json` → `./package.json`;
    - условия `development → ./src/...` удалить у всех подпутей;
  - dependencies: только `jose` с точной версией `6.2.12`;
  - peerDependencies: `@nestjs/common` и `@nestjs/core` `^12.1.3`, `reflect-metadata` `^0.2.2`, `rxjs` `^7.8.2`;
  - peerDependenciesMeta: все четыре optional true;
  - devDependencies — точные версии. Текущие оставить. Из `verdeect-identity/package.json` добавить: `eslint` 10.12.0, `@eslint/js` 10.0.1, `typescript-eslint` 8.71.2, `eslint-config-prettier` 10.1.8, `globals` 17.13.0, `prettier` 3.9.10. Новые `publint` и `@arethetypeswrong/cli` взять последними версиями старше суток (`pnpm view <pkg> time --json`), без `^`;
  - scripts:
    - `build`: удаляет `dist` (через node fs.rmSync, кроссплатформенно), затем `tsc -p tsconfig.build.json`;
    - `typecheck`: `tsc -p tsconfig.json --noEmit`;
    - `lint`: `eslint .`;
    - `format`: `prettier --write .`;
    - `format:check`: `prettier --check .`;
    - `test`: `vitest run` (unit, AC-6);
    - `test:package`: `vitest run -c vitest.package.config.ts`;
    - `pack:check`: по очереди `pnpm build`, `publint --strict`, `attw --pack . --profile esm-only`, `pnpm test:package` (FR-7, FR-8).
  Логи: не применимо.
  Зависит от: 1, 2, 3, 4, 5.

- [x] **Задача 7: `pnpm-workspace.yaml` с настройками pnpm** (FR-6)
  **Skill:** none — конфигурация (CREATE)
  Файл: `pnpm-workspace.yaml`. Без списка `packages`, репозиторий из одного пакета: в файле только настройки pnpm. Содержимое:
  - `allowBuilds`: `@swc/core` true, `esbuild` true. Остальные build-скрипты по умолчанию запрещены;
  - комментарий: `minimumReleaseAge` как в Identity — действует значение pnpm по умолчанию (сутки); исключения `minimumReleaseAgeExclude` — только с обоснованием и условием снятия.
  Логи: не применимо.

- [x] **Задача 8: установка зависимостей и `pnpm-lock.yaml`** (FR-6)
  **Skill:** none — команды
  Запустить `pnpm install`. Будут созданы `pnpm-lock.yaml` и `node_modules`. Проверить, что lock-файл фиксирует точные версии из задачи 6 и что Nest не попал в `dependencies`.
  Логи: при ошибке установки сохранить вывод pnpm целиком (причину в отчёт задачи).
  Зависит от: 6, 7.

- [x] **Задача 9: убрать ссылки `../../` из README** (FR-6)
  **Skill:** none — Markdown (`README.md`, MODIFY)
  Файл: `README.md`. Три ссылки ведут за пределы репозитория:
  - строка 1 «Back to project README» — удалить;
  - раздел «See Also»: «Разработка» заменить ссылкой на раздел «Разработка» этого README, а «prd.md §7.5» — текстом «PRD Identity §7.5 (репозиторий verdeect-identity)» без относительного пути.
  Остальное содержимое README (имена импортов, разделы) не трогать — это E2.
  Логи: не применимо.

- [x] **Задача 10: проверка неизменности поведения и автономности** (FR-5, FR-6, AC-6)
  **Skill:** none — команды проверки
  1. Поиск по `src/`, конфигам и README только голых спецификаторов импорта со старым именем пакета (`from 'verdeect-auth` и `import('verdeect-auth`) и путей `../../`. Ожидается 0 совпадений. Код `src/` правок не требует, пути уже относительные. Это часть контракта (FR-5), не меняется и совпадением не считается:
     - префикс `verdeect-auth:` в сообщениях ошибок (`src/verifier.ts`, `src/nest/verdeect-auth.guard.ts`);
     - ключи метаданных `verdeect-auth:require-*` в `src/nest/decorators.ts`;
     - имена файлов `verdeect-auth.*.ts` и их относительные импорты;
     - комментарии.
  2. `pnpm typecheck` — зелёный.
  3. `pnpm test` — 3 spec-файла (`src/verifier.spec.ts`, `src/verifier.jwks.spec.ts`, `src/nest/verdeect-auth.guard.spec.ts`), не меньше 89 тестов, все зелёные. В выводе остаются имена с AC-7.1–7.4 (AC-6).
  4. `pnpm lint` и `pnpm format:check` — зелёные. Нарушения в `src/` исправлять только форматированием (`pnpm exec prettier --write <files>`) и правками, не меняющими поведение (например, `import type`). `README.md`, `AGENTS.md` и конфиги репозитория можно переформатировать (`pnpm exec prettier --write <files>`), но только форматирование, без правок текста. Если правило требует изменить логику — остановиться и спросить пользователя, а не менять код.
  Логи: в отчёте задачи — число файлов и тестов из вывода Vitest.
  Зависит от: 1, 2, 3, 4, 5, 8, 9.

<!-- Commit checkpoint: задачи 1–10 -->

### Phase 2: Шаблоны проекта-потребителя и помощники проверок (FR-7, FR-8)

- [x] **Задача 11: `vitest.package.config.ts`** (FR-7, FR-8)
  **Skill:** nestjs-code generic vitest.package.config.ts (CREATE)
  Файл: `vitest.package.config.ts`. Отдельный контур проверок пакета:
  - include `tests/package/**/*.spec.ts`, environment node;
  - fileParallelism false: тесты пакуют архив и ставят зависимости, параллельный запуск конфликтует на диске;
  - testTimeout и hookTimeout 300 000 мс (установка во временный проект);
  - без плагина swc: декораторов в этих тестах нет.
  Первая строка — комментарий о назначении со ссылкой на prd.md FR-7, FR-8.
  Обоснование `generic`: конфиг тестового контура библиотеки, ни один тип компонента сервиса не подходит.
  Логи: не применимо.
  Зависит от: 6.

- [x] **Задача 12: помощник упаковки `tests/package/support/pack.ts`** (FR-7, FR-8, AC-4)
  **Skill:** nestjs-code generic tests/package/support/pack.ts (CREATE)
  Файл: `tests/package/support/pack.ts`. Функции:
  - «состав архива»: запускает `npm pack --dry-run --json` в корне репозитория, разбирает JSON и возвращает список путей файлов архива и имя архива;
  - «упаковать»: запускает `pnpm pack --pack-destination <каталог>` в новый временный каталог из `os.tmpdir()`, возвращает абсолютный путь к `.tgz`;
  - «распаковать package.json»: читает `package.json` из архива — распаковка `tar` во временный каталог (системная утилита `tar`) и чтение `package/package.json`.
  Команды запускаются через `node:child_process` (execFile, без shell) с cwd корня репозитория. При ненулевом коде выбрасывается ошибка с командой, кодом и stderr.
  Логи: перед каждой командой `console.info` с префиксом `[package-check]`, командой и cwd. При ошибке — команда, код и stderr в тексте исключения. Токены и переменные окружения не печатать.
  Зависит от: 6, 11.

- [x] **Задача 13: помощник проекта-потребителя `tests/package/support/consumer-project.ts`** (FR-8, AC-1, AC-2, AC-3, AC-7)
  **Skill:** nestjs-code generic tests/package/support/consumer-project.ts (CREATE)
  Файл: `tests/package/support/consumer-project.ts`. Функции:
  - «создать проект»: принимает имя шаблона (`core` или `full`) и путь к архиву. Копирует `tests/consumer/<шаблон>/` в новый каталог в `os.tmpdir()`, вне репозитория, чтобы не сработал self-reference пакета. Подставляет путь к архиву вместо маркера `__TARBALL__` в `package.json` копии. Запускает `pnpm install --strict-peer-dependencies`: конфликт peer-диапазонов роняет установку (EC-2). Флаг `--ignore-workspace` не используется: временный каталог и так вне рабочего пространства, а `pnpm-workspace.yaml` шаблона (`allowBuilds`) должен читаться. Возвращает путь к проекту;
  - «выполнить»: запускает команду (node, `pnpm exec tsc`, `pnpm exec vitest run`) в каталоге проекта и возвращает код, stdout и stderr без исключения, чтобы тест сам проверял ожидаемый отказ (AC-1);
  - «удалить проект»: рекурсивно удаляет временный каталог, вызывается в afterAll.
  Логи: `console.info` с префиксом `[package-check]` — шаблон, временный каталог, каждая команда. При ошибке установки — stderr pnpm в тексте исключения.
  Зависит от: 12.

- [x] **Задача 14: шаблон `tests/consumer/core/package.json`** (FR-8, AC-2, UC-1 alt-1)
  **Skill:** none — конфигурация (CREATE)
  Файл: `tests/consumer/core/package.json`. Проект без Nest: private, type module, dependencies — только `@verdeect/auth` со значением `file:__TARBALL__`. Ни `@nestjs/*`, ни `rxjs`, ни `reflect-metadata`: pnpm не ставит optional peer-зависимости, установка обязана пройти (AC-2).
  Логи: не применимо.

- [x] **Задача 15: `tests/consumer/core/smoke.mjs`** (AC-2, UC-1 alt-1)
  **Skill:** nestjs-code generic tests/consumer/core/smoke.mjs (CREATE)
  Файл: `tests/consumer/core/smoke.mjs`. Скрипт Node:
  1. Динамически импортирует `@verdeect/auth`.
  2. Создаёт verifier через `createVerifier` с одним издателем (iss `https://id.example.test`, jwksUri `https://id.example.test/jwks`, сеть не нужна — JWKS не запрашивается до проверки токена) и resource `https://api.example.test`. Убеждается, что у результата есть функция verify.
  3. Проверяет, что `VerifyError` — конструктор.
  4. Убеждается, что модуль `@nestjs/common` в проекте не разрешается, то есть ядро работает без Nest.
  5. Печатает маркер `core-ok`. При любом отклонении — сообщение в stderr и код выхода 1.
  Обоснование `generic`: скрипт шаблона потребителя, не компонент сервиса.
  Логи: один итоговый маркер в stdout, причина отказа — в stderr.
  Зависит от: 14.

- [x] **Задача 16: шаблон `tests/consumer/full/package.json`** (FR-8, AC-1, AC-2, AC-3, AC-7, EC-2)
  **Skill:** none — конфигурация (CREATE)
  Файл: `tests/consumer/full/package.json`. Проект сервиса на NestJS: private, type module.
  - dependencies: `@verdeect/auth` (`file:__TARBALL__`), `@nestjs/common` и `@nestjs/core` 12.1.3, `reflect-metadata` 0.2.2, `rxjs` 7.8.2;
  - devDependencies: `vitest` 5.0.4, `typescript` 5.9.3, `@types/node` 22.20.5 — те же точные версии, что в корне репозитория;
  - scripts нет: команды запускает помощник.
  Конфигурации Vitest нет намеренно: AC-7 требует работы без дополнительной настройки условий.
  Логи: не применимо.

- [x] **Задача 16a: `tests/consumer/full/pnpm-workspace.yaml`** (FR-8)
  **Skill:** none — конфигурация (CREATE)
  Файл: `tests/consumer/full/pnpm-workspace.yaml`. Только настройки pnpm, без списка `packages`: `allowBuilds` с `esbuild` true (`vitest` → `vite` → `esbuild`). Без этого pnpm 12 отклоняет build-скрипт, и установка в задаче 13 падает. Шаблону `core` файл не нужен: у `jose` нет build-скриптов.
  Логи: не применимо.
  Зависит от: 16.

- [x] **Задача 17: `tests/consumer/full/tsconfig.json` (NodeNext)** (AC-3)
  **Skill:** none — конфигурация (CREATE)
  Файл: `tests/consumer/full/tsconfig.json`. target ES2023, module и moduleResolution NodeNext, strict, noEmit, skipLibCheck true, types node, include `src`. skipLibCheck true, как в Identity: AC-3 проверяет разрешение экспортов, и ошибка отсутствующего экспорта возникает в файле потребителя; при false tsc проверял бы `.d.ts` сторонних пакетов (`@nestjs/*`, `rxjs`, `@types/node`), и тест падал бы не из-за пакета.
  Логи: не применимо.

- [x] **Задача 18: `tests/consumer/full/tsconfig.bundler.json`** (AC-3, EC-1)
  **Skill:** none — конфигурация (CREATE)
  Файл: `tests/consumer/full/tsconfig.bundler.json`. Наследует `./tsconfig.json`, переопределяет module ESNext и moduleResolution bundler (Vite-приложение потребителя).
  Логи: не применимо.
  Зависит от: 17.

- [x] **Задача 19: `tests/consumer/full/src/all-subpaths.ts`** (AC-3, EC-1, §8 PRD)
  **Skill:** nestjs-code generic tests/consumer/full/src/all-subpaths.ts (CREATE)
  Файл: `tests/consumer/full/src/all-subpaths.ts`. Импортирует из трёх подпутей все экспорты таблицы §8 PRD:
  - из `@verdeect/auth` — значения `createVerifier`, `VerifyError` и типы `TokenKind`, `TrustedIssuer`, `VerifierOptions`, `UserPrincipal`, `ServicePrincipal`, `AgentPrincipal`, `Principal`, `Verifier`, `VerifyReason`, `VerifyRule`;
  - из `@verdeect/auth/nest` — значения `VerdeectAuthModule`, `VerdeectAuthGuard`, `VERDEECT_VERIFIER`, `RequireTenant`, `RequireScope`, `RequireUser`, `RequireService`, `principalOf` и типы `PrincipalCarrier`, `VerdeectAuthModuleOptions`, `VerdeectAuthAsyncOptions`;
  - из `@verdeect/auth/testing` — значения `createTestSigner`, `tokenVectors`, `TEST_IDENTITY_ISS`, `TEST_ORCHESTRATOR_ISS`, `TEST_RESOURCE` и типы `Claims`, `Header`, `TestSigner`, `TestSignerOptions`, `TokenVector`, `VectorExpectation`, `VectorSigners`.
  Каждый импорт используется в типовой позиции (объявления типов и экспортируемая функция, собирающая значения в массив), чтобы tsc проверил наличие экспорта при обоих tsconfig. Файл только компилируется, не исполняется.
  Логи: не применимо.
  Зависит от: 17, 18.

- [x] **Задача 20: `tests/consumer/full/src/testing.spec.ts`** (AC-7, UC-2)
  **Skill:** nestjs-code test unit tests/consumer/full/src/testing.spec.ts (CREATE)
  Файл: `tests/consumer/full/src/testing.spec.ts`. Тест Vitest в проекте-потребителе:
  - `describe('UC-2: тесты сервиса с @verdeect/auth/testing')`;
  - `it('AC-7: createTestSigner из @verdeect/auth/testing подписывает userToken, createVerifier из @verdeect/auth принимает его как kind user')`: поднимает подписчика, создаёт verifier с `signer.issuer` и `TEST_RESOURCE`, проверяет `userToken()`; ожидается Principal вида user с непустыми `sub` и `clientId`; подписчик закрывается в afterAll.
  Импорт только по имени пакета, без относительных путей. Условия разрешения модулей не настраиваются.
  Architectural deviation (слой `unit` у nestjs-code — `*.spec.ts` рядом с кодом):
  - (1) файл принадлежит шаблону потребителя и исполняется только после установки шаблона во временный проект (задача 13), никогда в `pnpm test` репозитория;
  - (2) он импортирует только по имени пакета и работает без конфига Vitest (AC-7), поэтому не может лежать рядом с `src/` или использовать Vitest-настройки репозитория;
  - (3) решение осознанное, по правилу Library Package Scope.
  Логи: не применимо (тест).
  Зависит от: 16.

- [x] **Задача 21: `tests/consumer/full/nest-smoke.mjs`** (AC-2, UC-1)
  **Skill:** nestjs-code generic tests/consumer/full/nest-smoke.mjs (CREATE)
  Файл: `tests/consumer/full/nest-smoke.mjs`. Скрипт Node:
  1. Импортирует `reflect-metadata`.
  2. Динамически импортирует `@verdeect/auth/nest`.
  3. Проверяет, что `VerdeectAuthModule` и `VerdeectAuthGuard` — функции, у `VerdeectAuthModule` есть статические `forRoot` и `forRootAsync`, а `VERDEECT_VERIFIER` — символ.
  4. Печатает маркер `nest-ok`, при отклонении пишет в stderr и завершается с кодом 1.
  Обоснование `generic`: скрипт шаблона потребителя.
  Логи: итоговый маркер в stdout, причина — в stderr.
  Зависит от: 16.

<!-- Commit checkpoint: задачи 11–21 -->

### Phase 3: Тесты пакета (AC-1–AC-5, AC-7) и итоговая проверка

- [x] **Задача 22: `tests/package/tarball.spec.ts`** (AC-4, AC-1, FR-1, FR-2, FR-3, FR-4, BR-3, BR-4, EC-3)
  **Skill:** nestjs-code test unit tests/package/tarball.spec.ts (CREATE)
  Файл: `tests/package/tarball.spec.ts`. Перед тестами (`dist` уже собран скриптом `pack:check`) получает состав архива через помощника из задачи 12 и упакованный `package.json`. Тесты:
  - `describe('UC-4: состав и метаданные пакета @verdeect/auth')`;
  - `it('AC-4: архив содержит только package.json, README.md, CHANGELOG.md и dist/**/*.js, dist/**/*.d.ts')`:
    - каждый путь — либо из этого списка, либо `LICENSE`;
    - обязательны `package.json`, `README.md`, а также `.js` и `.d.ts` для `dist/index`, `dist/nest/index`, `dist/testing/index`;
    - `CHANGELOG.md` разрешён, но не обязателен до E2 (решение пользователя);
  - `it('AC-4: в архиве нет src/, *.spec.*, *.map, tsconfig*, requirements/, .ai-factory/, docs/, node_modules/ (EC-3)')`;
  - `it('AC-1: dist/index.js и dist/nest/**/*.js не импортируют testing (BR-4)')`: читает собранные файлы и ищет спецификаторы импорта, ведущие в `testing`;
  - `it('FR-1: package.json — @verdeect/auth 1.0.0, без private, type module, engines >=20, sideEffects false, publishConfig public, license UNLICENSED, repository github smskin/verdeect-auth, files dist/README.md/CHANGELOG.md')`;
  - `it('FR-2: exports — "." и "./nest" с types и default из dist, "./testing" с types и development без default, "./package.json"; условий на src нет')`;
  - `it('FR-4: в dependencies только jose с точной версией; @nestjs/common, @nestjs/core ^12.1.3, reflect-metadata ^0.2.2, rxjs ^7.8.2 — peer optional (EC-2, EC-3)')`;
  - `it('BR-3: в архиве нет .env*, .npmrc и файлов с ключами (*.pem, *.key)')`.
  В beforeAll сначала проверить, что существует `dist/index.js`. Если нет — упасть с сообщением «run pnpm build (or pnpm pack:check) first»: `test:package` можно запустить и без сборки.
  Architectural deviation (слой `unit` у nestjs-code — `*.spec.ts` рядом с кодом):
  - (1) тест проверяет опубликованный архив, а не модули исходников, поэтому не может лежать рядом с `src/`;
  - (2) ему нужны предварительная сборка и упаковка, поэтому он работает в отдельном контуре `vitest.package.config.ts` / `test:package`, вне `pnpm test`;
  - (3) правило Library Package Scope называет проверки архива обязательными — решение осознанное.
  Логи: помощник печатает команды. Тест — только assert-сообщения с перечнем лишних или недостающих файлов.
  Зависит от: 2, 6, 11, 12.

- [x] **Задача 23: `tests/package/consumer.spec.ts`** (FR-8, AC-1, AC-2, AC-3, AC-7, UC-1, UC-2, UC-4, EC-1, EC-2)
  **Skill:** nestjs-code test unit tests/package/consumer.spec.ts (CREATE)
  Файл: `tests/package/consumer.spec.ts`. В beforeAll упаковывает архив (задача 12) и создаёт два проекта-потребителя (задача 13): `core` и `full`. В afterAll удаляет их. Тесты:
  - `describe('UC-1: подключение @verdeect/auth к сервису')`:
    - `it('AC-2: проект без @nestjs/*, rxjs, reflect-metadata — установка проходит, import("@verdeect/auth") и createVerifier работают')` — smoke.mjs в `core`: код 0 и маркер `core-ok`;
    - `it('AC-2: с NestJS 12.x import("@verdeect/auth/nest") работает; peer-диапазон не конфликтует при --strict-peer-dependencies (EC-2)')` — установка `full` прошла, nest-smoke.mjs: код 0 и `nest-ok`;
    - `it('AC-3: файл со всеми тремя подпутями проходит tsc --noEmit при moduleResolution NodeNext')` — `tsc -p tsconfig.json`, код 0;
    - `it('AC-3: тот же файл проходит tsc --noEmit при moduleResolution bundler (EC-1)')` — `tsc -p tsconfig.bundler.json`, код 0;
  - `describe('UC-4: production-запуск сервиса')`:
    - `it('AC-1: node без условий — import("@verdeect/auth/testing") падает с ERR_PACKAGE_PATH_NOT_EXPORTED')` — `node --input-type=module -e` с динамическим импортом, ненулевой код, stderr содержит `ERR_PACKAGE_PATH_NOT_EXPORTED`;
    - `it('AC-1: node --conditions=development — import("@verdeect/auth/testing") загружается')` — код 0;
  - `describe('UC-2: тесты сервиса с @verdeect/auth/testing')`:
    - `it('AC-7: vitest в проекте-потребителе без настройки условий проходит тест с createTestSigner и createVerifier')` — `vitest run` в `full`, код 0, в выводе `AC-7` и 1 passed.
  В beforeAll сначала проверить, что существует `dist/index.js`. Если нет — упасть с сообщением «run pnpm build (or pnpm pack:check) first».
  Architectural deviation (слой `unit` у nestjs-code — `*.spec.ts` рядом с кодом):
  - (1) тест проверяет установленный проект-потребитель, а не модули исходников, поэтому не может лежать рядом с `src/`;
  - (2) ему нужны сборка, упаковка и сетевая установка, поэтому он работает в отдельном контуре `vitest.package.config.ts` / `test:package`, вне `pnpm test`;
  - (3) правило Library Package Scope называет проверки проекта-потребителя обязательными — решение осознанное.
  Если AC-7 или «AC-1: … --conditions=development» падает из-за того, что Vitest или Node не разрешают `./testing`, — остановиться и спросить пользователя: это противоречие PRD (D-6, FR-2), а не дефект теста. Не добавлять в шаблон конфиг Vitest с условиями и не менять `exports` самостоятельно.
  Логи: помощники печатают шаги. При падении assert-сообщение содержит stdout и stderr команды.
  Зависит от: 6, 11, 12, 13, 14, 15, 16, 16a, 17, 18, 19, 20, 21.

- [x] **Задача 24: итоговый прогон скриптов** (AC-5, AC-6, FR-7, FR-8)
  **Skill:** none — команды проверки
  По отдельности: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm pack:check`. Все зелёные:
  - `publint --strict` — 0 ошибок и предупреждений (AC-5);
  - `attw --pack . --profile esm-only` — 0 проблем (AC-5);
  - `pnpm test:package` — все тесты задач 22–23;
  - `pnpm test` — не меньше 89 тестов (AC-6).
  Проблема publint или attw исправляется конфигурацией (`package.json`, tsconfig), а не кодом `src/`. Если для исправления нужно менять код или поведение — остановиться и спросить пользователя.
  После прогона в `git status` нет `.tgz` и временных каталогов внутри репозитория.
  Логи: в отчёте задачи — итоговые строки каждого инструмента.
  Зависит от: 6, 10, 11, 22, 23.

<!-- Commit checkpoint: задачи 22–24 -->

### Phase 4: Документация

- [x] **Задача 25: обновить `AGENTS.md` под автономный пакет**
  **Skill:** none — Markdown (`AGENTS.md`, MODIFY)
  Файл: `AGENTS.md`.
  - В «Структура проекта» добавить `tests/package/` (проверки архива и потребителя), `tests/consumer/core|full` (шаблоны проекта-потребителя) и корневые файлы `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `vitest.package.config.ts`.
  - В «Ключевые точки входа» — скрипты `pnpm typecheck|lint|format:check|test|pack:check`.
  Имена файлов сверить с задачами 1–23 (не перефразировать). Документация модулей NestJS (`nestjs-generate-documentation`) не применяется: у библиотеки нет модулей сервиса. README и `docs/*` — этап E2.
  Логи: не применимо.
  Зависит от: 24.

<!-- Commit checkpoint: задача 25 -->

## Traceability

| UC / AC / требование | Задачи | Тест / проверка |
|---|---|---|
| UC-1, AC-2 (alt-1, без Nest) | 6, 13, 14, 15, 23 | `tests/package/consumer.spec.ts` — «AC-2: проект без @nestjs/*…» |
| UC-1, AC-2 (с Nest), EC-2 | 6, 13, 16, 16a, 21, 23 | `tests/package/consumer.spec.ts` — «AC-2: с NestJS 12.x…» |
| UC-1, AC-3 (NodeNext) | 2, 6, 17, 19, 23 | `tests/package/consumer.spec.ts` — «AC-3: … NodeNext» |
| AC-3, EC-1 (bundler) | 18, 19, 23 | `tests/package/consumer.spec.ts` — «AC-3: … bundler (EC-1)» |
| UC-4, AC-1 (Node без условий / с development) | 6, 23 | `tests/package/consumer.spec.ts` — «AC-1: node без условий…», «AC-1: node --conditions=development…» |
| AC-1 (нет импорта testing), BR-4 | 22 | `tests/package/tarball.spec.ts` — «AC-1: dist/index.js и dist/nest/**…» |
| AC-4, FR-3, EC-3 | 2, 6, 22 | `tests/package/tarball.spec.ts` — «AC-4: …» (2 теста) |
| AC-5, FR-7 | 6, 24 | `pnpm pack:check` — publint, attw |
| AC-6, FR-5 | 10, 24 | `pnpm test` — `src/verifier.spec.ts`, `src/verifier.jwks.spec.ts`, `src/nest/verdeect-auth.guard.spec.ts` (AC-7.1–7.4, ≥ 89) |
| UC-2, AC-7 | 16, 20, 23 | `tests/consumer/full/src/testing.spec.ts` — «AC-7: …»; `tests/package/consumer.spec.ts` — «AC-7: vitest в проекте-потребителе…» |
| FR-1 | 6, 22 | `tests/package/tarball.spec.ts` — «FR-1: …» |
| FR-2 | 6, 22, 23 | `tests/package/tarball.spec.ts` — «FR-2: …»; AC-1 в consumer.spec |
| FR-4 | 6, 22 | `tests/package/tarball.spec.ts` — «FR-4: …» |
| FR-6 | 1, 3, 4, 5, 7, 8, 9, 10 | задача 10: поиск `../../`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check` |
| FR-8 | 11–21 (включая 16a), 23 | `pnpm test:package` |
| BR-3 | 22 | `tests/package/tarball.spec.ts` — «BR-3: …» |
| BR-4 | 22 | «AC-1: dist/index.js и dist/nest/**…» |
