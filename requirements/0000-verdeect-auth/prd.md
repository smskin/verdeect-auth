# PRD: `@verdeect-v3/auth` — библиотека проверки токенов Вердикта 2.0

> Пакет: requirements/0000-verdeect-auth/ · Ревизия: r6 · Дата: 2026-11-17 · Источник: обсуждение в Claude (чат Identity; с r6 — чат `@verdeect/auth`)
> Версия 1.1 от 17.11.2026 — переезд в GitLab (`01` решение 21 в редакции 17.11.2026, CO-53): имя `@verdeect-v3/auth`, проект `verdeect-v3/verdeect-v3-auth` на `gitlab.mkomov.com`, реестр npm GitLab, GitLab CI, выпуск 2.0.0. Изменены: вводный абзац, §1a (новый), §2, §3, UC-1, UC-3, UC-5 (новый), FR-1, FR-11, FR-12, FR-13–FR-15 (новые), BR-3, BR-5 (новое), §8, §9, §11, D-1 и D-8 (заменены), D-9–D-14 (новые), §13, AC-8, AC-10, AC-11, AC-12–AC-17 (новые), §16; имя пакета `@verdeect/auth` → `@verdeect-v3/auth` по всему тексту, кроме исторических мест.
> Версия 1.0 от 22.10.2026 — ревизии r1–r5: вынос из `verdeect-identity`, npmjs.com, GitHub (история ревизий — README пакета).
> Тип: новая библиотека (вынос существующего кода) · Изменяет: — · UI: нет

Контракт проверки токена (правила V-1…V-8, `Principal`, guard'ы, ответы) уже определён и реализован в Identity: `verdeect-identity/requirements/0000-identity-server/prd.md` §7.5, AC-7.1–7.4. Этот PRD **не меняет поведение** библиотеки. Он описывает, как она становится отдельным npm-пакетом: упаковка, документация, выпуск. Основание — решение 21 `01-architecture-and-contracts.md` (редакция 17.11.2026): общие пакеты публикуются в реестр npm GitLab (`gitlab.mkomov.com`, группа `verdeect-v3`), scope `@verdeect-v3`, проект на пакет `verdeect-v3/verdeect-v3-<пакет>`, semver, публикация только из CI по тегу `v*` токеном задания, потребители пинят версию точно. До 17.11.2026 пакет выходил как `@verdeect/auth` на npmjs.com из GitHub (версии 1.0.0 и 1.0.1) — см. §1a.

## 1. Цель и контекст

Каждый сервис Вердикта — сервер ресурсов `https://api.verdeect.ru` и проверяет `at+jwt` **только** этой библиотекой (`01` §5.3). Сейчас она лежит в `verdeect-identity/packages/verdeect-auth` как workspace-пакет (`private`, `0.0.0`). Подключить её в Platform, BFF, Orchestrator и другие сервисы нельзя. Цель — опубликовать `@verdeect/auth` 1.0.0 с документацией, по которой разработчик сервиса подключает проверку без чтения исходников и PRD Identity.

## 1a. Было → станет (версия 1.1)

| Что | Было (`@verdeect/auth` 1.0.1) | Станет (`@verdeect-v3/auth` 2.0.0) |
|---|---|---|
| Имя пакета | `@verdeect/auth` | `@verdeect-v3/auth` (FR-1, FR-15) |
| Реестр | npmjs.com, пакет публичный | реестр npm GitLab: публикация — в проект `verdeect-v3/verdeect-v3-auth`, установка — через адрес инстанса `https://gitlab.mkomov.com/api/v4/packages/npm/` с токеном (FR-14, D-13) |
| Репозиторий | GitHub `smskin/verdeect-auth` | GitLab `gitlab.mkomov.com/verdeect-v3/verdeect-v3-auth`, все коммиты и теги перенесены (FR-13); GitHub — архив только для чтения до удаления |
| CI | GitHub Actions, `.github/workflows/ci.yml` | GitLab CI, `.gitlab-ci.yml` (FR-11) |
| Публикация | npm Trusted Publishing (OIDC), provenance | токен задания `CI_JOB_TOKEN`, только pipeline тега `v*`; provenance нет (D-10) |
| Защита тега | ruleset GitHub | защищённые теги GitLab `v*` |
| Публичный API, `exports`, подпуть `/testing` и условие `development`, поведение | — | без изменений (FR-5, AC-17) |

Старые версии `@verdeect/auth@1.0.0` и `1.0.1` на npmjs.com и репозиторий GitHub этим пакетом требований не удаляются и не помечаются устаревшими: ими до своего перехода пользуются сервисы и закреплённые коммиты соседей в контурах e2e. Удаление — отдельной командой координатора после перехода всех сервисов (`01` решение 21).

## 2. Скоуп

**Входит:**
- перенос кода и тестов в репозиторий `verdeect2/verdeect-auth` с историей коммитов;
- автономные настройки (TypeScript, ESLint, Prettier, Vitest, pnpm) без ссылок на файлы Identity;
- упаковка: имя, `exports`, типы `.d.ts`, состав архива, зависимости;
- закрытие подпути `testing` для production;
- проверки пакета (содержимое архива, `exports`, типы, установка в чистый проект);
- документация: README, руководства, TSDoc публичного API, CHANGELOG, порядок выпуска;
- Makefile и GitHub Actions с публикацией по тегу.

**Входит (версия 1.1):**
- перенос репозитория в GitLab с полной историей коммитов и тегами (UC-5);
- новое имя `@verdeect-v3/auth` в `package.json`, документации, тестах и комментариях (FR-15);
- GitLab CI с публикацией по тегу токеном задания вместо GitHub Actions (FR-11);
- README и `docs/` — установка из реестра GitLab (FR-14), выпуск через GitLab (`docs/releasing.md`);
- выпуск 2.0.0 (D-11).

**Не входит:**
- (версия 1.1) `npm unpublish` и `npm deprecate` пакета `@verdeect/auth`, удаление репозитория GitHub, отключение Trusted Publisher на npmjs.com — по отдельной команде координатора;
- (версия 1.1) перевод потребителей (Identity, BFF, Platform, Orchestrator, `platform-client`, `kit`) на новое имя — их чаты;
- (версия 1.1) правила установки пакета в Docker-сборках потребителей (секрет сборки, тома `node_modules`) — у пакета Docker нет;
- изменение правил V-1…V-8, `Principal`, guard'ов, декораторов, кодов ошибок, тестовых векторов;
- новые функции, например обмен RFC 8693 (`01` §13.1) или проверка `pep`;
- перевод Identity на опубликованный пакет — пакет `verdeect-identity/requirements/0001-auth-from-npm`;
- CommonJS-сборка (только ESM, как во всём проекте);
- Docker: библиотеке не нужны образ и compose.

## 3. Роли и права

| Действие / UC | Разработчик сервиса | Мейнтейнер | CI |
|---|---|---|---|
| UC-1 подключить библиотеку | ✅ | ✅ | — |
| UC-2 писать тесты с `testing` | ✅ | ✅ | — |
| UC-3 выпустить версию | ❌ | ✅ (тег) | ✅ публикует |
| UC-4 запуск сервиса в production | — | — | — (Node без условия `development`) |

Публиковать может только задание `publish` GitLab CI в pipeline тега `v<major>.<minor>.<patch>` токеном задания `CI_JOB_TOKEN` (D-10). Теги `v*` в проекте GitLab защищены: создавать их может роль Maintainer. Своих токенов публикации нет ни в переменных GitLab, ни в репозитории (BR-5). Ручная публикация с машины разработчика — не способ выпуска: локальный токен `read_api` публиковать не может. Исключений нет: первый выпуск под новым именем (2.0.0) тоже делает CI.

## 4. Use cases

### UC-1. Подключение библиотеки к сервису
- **Актор:** разработчик сервиса · **Предусловие:** сервис на NestJS 12 / Node ≥ 22.12, ESM; настроен доступ к реестру GitLab (FR-14) · **Триггер:** сервису нужно принимать токены.
- **Основной поток:** 1) `pnpm add @verdeect-v3/auth@2.0.0 --save-exact`. 2) По README регистрирует `VerdeectAuthModule.forRootAsync` в корневом модуле. 3) Ставит `@UseGuards(VerdeectAuthGuard)` и декораторы на маршруты. 4) Читает `Principal` через `principalOf(request)`.
- **Альтернативные потоки:** alt-1 (шаг 2) сервис без Nest (скрипт, воркер) использует только `createVerifier` из `@verdeect-v3/auth`; `@nestjs/*` не установлены, импорт работает.
- **Ошибки:** err-1 (шаг 2) неверная конфигурация (пустой `issuers`, повтор `iss`) — исключение при старте с понятным текстом (поведение не меняется); err-2 (шаг 1) нет строки реестра или токена в `~/.npmrc` — установка падает (401, 403 или 404 от реестра), README (раздел «Установка») говорит, что настроить.
- **Результат:** маршруты сервиса принимают токены по правилам V-1…V-8. · **AC:** AC-2, AC-3, AC-9, AC-15.

### UC-2. Тесты сервиса с `@verdeect-v3/auth/testing`
- **Актор:** разработчик сервиса · **Предусловие:** UC-1, тесты на Vitest.
- **Основной поток:** 1) В тесте импортирует `createTestSigner`, `tokenVectors` из `@verdeect-v3/auth/testing`. 2) Поднимает подписчик, передаёт `signer.issuer` в конфигурацию модуля. 3) Подписывает токены и проверяет ответы своих маршрутов. 4) `tsc --noEmit` проходит.
- **Ошибки:** err-1 импорт `testing` в production-коде — сервис падает при старте (UC-4), а не тихо работает с тестовым подписчиком.
- **Результат:** тесты сервиса проверяют авторизацию без Identity. · **AC:** AC-3, AC-7.

### UC-3. Выпуск версии
- **Актор:** мейнтейнер · **Предусловие:** изменения влиты в `main`, `make ci` зелёный, pipeline `main` в GitLab (запуск вручную, Run pipeline) зелёный.
- **Основной поток:** 1) Повышает `version` в `package.json` по semver. 2) Дописывает раздел версии в `CHANGELOG.md`. 3) Коммитит, ставит тег `vX.Y.Z`, пушит тег. 4) Pipeline тега в GitLab прогоняет проверки и публикует пакет в реестр проекта.
- **Альтернативные потоки:** alt-1 изменение ломает контракт (правило V-*, поле `Principal`, код ответа guard'а, сигнатура экспорта) — мажорная версия и раздел «Как обновиться» в CHANGELOG.
- **Ошибки:** err-1 тег не совпадает с `version` — задание падает до публикации; err-2 версия уже есть в реестре — задание падает, ничего не перезаписывается.
- **Результат:** версия доступна в реестре npm GitLab, её можно запинить. · **AC:** AC-8, AC-11, AC-16.

### UC-4. Production-сборка сервиса
- **Актор:** — (запуск Node в образе сервиса) · **Предусловие:** образ собран с `@verdeect-v3/auth`.
- **Основной поток:** 1) Node грузит `@verdeect-v3/auth` и `@verdeect-v3/auth/nest` из `dist`. 2) Импорт `@verdeect-v3/auth/testing` без условия `development` невозможен (`ERR_PACKAGE_PATH_NOT_EXPORTED`).
- **Результат:** тестовый подписчик с локальным JWKS не попадает в production-путь (закрывает пункт `testing-subpath` `.ai-factory/SECURITY.md` Identity). · **AC:** AC-1.

### UC-5. Перенос репозитория в GitLab (один раз, версия 1.1)
- **Актор:** мейнтейнер · **Предусловие:** владелец создал пустой проект `verdeect-v3/verdeect-v3-auth` на `gitlab.mkomov.com` (без README и других файлов); рабочая копия `verdeect2/verdeect-auth` чистая, `main` совпадает с GitHub.
- **Основной поток:** 1) Отправляет в GitLab все ветки и теги (`git push --mirror`). 2) Сверяет GitLab с GitHub: число коммитов `main`, хеш вершины `main`, список тегов и хеши тегов. 3) Переключает `origin` рабочей копии на GitLab; GitHub остаётся под именем `github` только для чтения. 4) Владелец переводит репозиторий GitHub в архив (только чтение).
- **Ошибки:** err-1 (шаг 1) проект не пустой — отправка отклоняется; мейнтейнер не перезаписывает его принудительно, а сообщает владельцу. err-2 (шаг 2) расхождение — перенос не считается выполненным, шаги 3–4 не делаются.
- **Результат:** история и теги (`v1.0.0`, `v1.0.1`) в GitLab те же, что в GitHub; дальнейшая работа идёт только в GitLab. Локальная папка остаётся `verdeect2/verdeect-auth`. · **AC:** AC-12.

## 5. Функциональные требования

- **FR-1 (UC-1, UC-3).** `package.json`: `name: "@verdeect-v3/auth"`, `version: "2.0.0"` (D-11), `type: "module"`, `engines.node: ">=22.12"`, `description`, `keywords`, `repository` (`git+https://gitlab.mkomov.com/verdeect-v3/verdeect-v3-auth.git`), `license` (см. D-4), `sideEffects: false`, без `private` и без `publishConfig` (`access: "public"` относился к npmjs.com; адрес реестра задаёт CI — FR-11). `files` — только `dist`, `README.md`, `CHANGELOG.md` (и файл лицензии, если появится).
- **FR-2 (UC-1, UC-4).** `exports`:
  - `"."` и `"./nest"` — `{types: "./dist/…/index.d.ts", default: "./dist/…/index.js"}`;
  - `"./testing"` — `{types: "./dist/testing/index.d.ts", development: "./dist/testing/index.js"}` без `default`: типы видны всегда (typecheck тестов), код грузится только с условием `development` (Vitest/Vite ставит его по умолчанию, Node — нет);
  - `"./package.json"`.
  Условия `development → src` из workspace-версии удаляются, исходники в архив не входят.
- **FR-3.** Сборка `tsc` в `dist/`: ESM `.js` и `.d.ts` для всех публичных модулей, без spec-файлов, без source map и declaration map (исходников в архиве нет). Цель — ES2023, `module`/`moduleResolution` — `NodeNext`.
- **FR-4 (UC-1 alt-1).** Зависимости: `jose` — `dependencies`, точная версия. `@nestjs/common`, `@nestjs/core` (`^12.1.3`), `reflect-metadata` (`^0.2.2`), `rxjs` (`^7.8.2`) — `peerDependencies` с диапазоном, все помечены `optional` в `peerDependenciesMeta`: ядро `@verdeect-v3/auth` не импортирует `@nestjs/*`, `rxjs`, `reflect-metadata` (проверяется тестом AC-2). В `devDependencies` версии точные.
- **FR-5.** Поведение не меняется: код `src/` и все spec-файлы переносятся как есть, кроме путей импорта и конфигурации. Имена тестов сохраняют ID AC-7.1–7.4 Identity.
- **FR-6.** Автономные настройки: `tsconfig.json` без `extends` за пределы репозитория (опции — из `tsconfig.base.json` Identity), `tsconfig.build.json`, `eslint.config.js` и Prettier — как в Identity, `vitest.config.ts`, `packageManager: pnpm@12.11.2`, `pnpm-lock.yaml`, пины точные, `minimumReleaseAge` — как в Identity. Ссылок на `../../` нет ни в конфигурации, ни в документации.
- **FR-7 (UC-3).** Проверки пакета (скрипт `pack:check`): `publint` без ошибок; `@arethetypeswrong/cli` с профилем `esm-only` без проблем; тест состава архива `npm pack --dry-run --json`.
- **FR-8 (UC-1, UC-2, UC-4).** Проверка потребителя: тест собирает архив (`pnpm pack`), устанавливает его во временный проект вне репозитория (`tests/consumer/` как шаблон) и проверяет AC-1, AC-2, AC-3, AC-7.
- **FR-9 (UC-1, UC-2).** Документация (раздел 9).
- **FR-10 (UC-3).** Makefile — единая точка входа: `install`, `lint`, `analyse` (typecheck), `test`, `build`, `pack-check`, `ci` (= `lint analyse test build pack-check`), `clean`. Docker-целей нет.
- **FR-11 (UC-3).** GitLab CI (`.gitlab-ci.yml`; каталог `.github/` удаляется). Стадии `lint` → `test` → `build` → `publish`.
  - **Когда создаётся pipeline** (`workflow: rules`): запуск вручную (`$CI_PIPELINE_SOURCE == "web"`) и тег вида `v<major>.<minor>.<patch>`. На push в ветку pipeline не создаётся (как у сервисов 2.0).
  - **Задания:** `lint` — `make install`, `make lint`, `make analyse`; `test` — на Node 22 и на Node 24, `make install`, `make test`; `build` — `make install`, `make build pack-check`, каталог `dist/` — artifact; `publish` — только в pipeline тега (правило по `$CI_COMMIT_TAG`), зависит (`needs`) от всех предыдущих заданий и берёт `dist/` из `build`. `allow_failure` нет ни у одного задания.
  - **Окружение заданий:** публичные образы `node` с закреплённым тегом (мажор.минор.патч; по одной переменной на Node 22 и Node 24), `lint` и `build` — Node 22, `publish` — Node 24; pnpm ставится версией из `packageManager` командой `npm install -g pnpm@<версия>` (не corepack); кэш хранилища pnpm — по `pnpm-lock.yaml`. Своего Docker-образа, services и выката нет. Раннеры — `build-vm`; теги раннеров — те же, что у проверочных заданий сервисов 2.0 (образец — `.gitlab-ci.yml` в `/home/administrator/projects/verdeect2/verdeect-orchestrator`, только чтение).
  - **Публикация:** задание `publish` создаёт временный пользовательский конфиг npm **вне `CI_PROJECT_DIR`** и передаёт его путь в `NPM_CONFIG_USERCONFIG`. В файле две строки: `@verdeect-v3:registry=${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/npm/` и строка авторизации для того же адреса без схемы — `//<хост и путь>/projects/${CI_PROJECT_ID}/packages/npm/:_authToken=${CI_JOB_TOKEN}`. Затем `node scripts/publish.mjs`; `after_script` удаляет файл при любом исходе. Скрипт до публикации: берёт тег из `CI_COMMIT_TAG`, сверяет его с `version`, проверяет, что версии нет в реестре проекта (`npm view`; ответ, отличный от «найдена» и «404», — падение), и запускает `npm publish` из собранного `dist/` без `--access`.
  - **Токены:** единственный токен — `CI_JOB_TOKEN`. В `.gitlab-ci.yml` и `scripts/` нет `NPM_TOKEN`, `NODE_AUTH_TOKEN` и ссылок на свои переменные с токенами (BR-5).
- **FR-12 (UC-3).** `CHANGELOG.md` в формате Keep a Changelog; версия 1.0.0 — «вынос из `verdeect-identity` без изменения поведения, новое имя `@verdeect/auth`, подпуть `testing` закрыт для production». Порядок выпуска — `docs/releasing.md`. Версия 2.0.0 — «переезд в GitLab: новое имя `@verdeect-v3/auth`, реестр npm GitLab; API и поведение не изменились» с подразделом «Как обновиться» (замена зависимости и путей импорта, настройка доступа к реестру). Разделы `[1.0.0]` и `[1.0.1]` остаются дословно, со старым именем.
- **FR-13 (UC-5).** Перенос репозитория: в проект GitLab `verdeect-v3/verdeect-v3-auth` отправляются все ветки и теги с исходными хешами (`git push --mirror`); `origin` рабочей копии — GitLab, GitHub — remote `github`. Принудительная перезапись непустого проекта запрещена. Настройка проекта GitLab, которую делает владелец и описывает `docs/releasing.md`: защищённые теги `v*` (создание — Maintainer); Settings → CI/CD → Job token permissions — добавлена группа `verdeect-v3` (иначе CI потребителей не скачает пакет токеном задания).
- **FR-14 (UC-1).** README, раздел «Установка»: пакет ставится из реестра npm GitLab; в `~/.npmrc` разработчика или сервера (вне git) — две строки: `@verdeect-v3:registry=https://gitlab.mkomov.com/api/v4/packages/npm/` и `//gitlab.mkomov.com/api/v4/packages/npm/:_authToken=<токен>`, где токен — личный токен GitLab с правом `read_api`; в CI потребителя вместо личного токена — `CI_JOB_TOKEN` во временном файле вне каталога проекта; токен в репозиторий не кладётся (ни в `.npmrc` проекта, ни в переменные Dockerfile). Команда установки — с точной версией (BR-2).
- **FR-15.** Имя `@verdeect/auth` заменено на `@verdeect-v3/auth` во всех отслеживаемых файлах: `package.json`, README, `docs/`, `AGENTS.md`, `Makefile`, `eslint.config.js`, `scripts/`, комментарии и TSDoc в `src/`, `tests/` (включая шаблоны `tests/consumer/*`), `.ai-factory/DESCRIPTION.md`, `.ai-factory/ARCHITECTURE.md`, `.ai-factory/rules/`. Упоминаний npmjs.com, GitHub (`smskin/verdeect-auth`, GitHub Actions, Trusted Publishing, `npm trust`) в этих файлах нет. Правило «Library Package Pipeline» в `.ai-factory/skill-context/aif-ci/SKILL.md` описывает GitLab CI по FR-11. Исключения — история: разделы `[1.0.0]` и `[1.0.1]` и подраздел «Как обновиться» версии 2.0.0 в `CHANGELOG.md`, `requirements/`, выполненные планы `.ai-factory/plans/`, `.ai-factory/ROADMAP.md` (этапы E1–E2). Префикс `verdeect-auth:` в текстах исключений конфигурации и имена констант `TEST_*` не меняются — это поведение (FR-5).

## 6. Бизнес-правила и ограничения

- **BR-1.** Semver: ломающее изменение контракта (правило V-*, поле `Principal`, код или статус ответа guard'а, сигнатура или удаление экспорта, поднятие минимальной версии Node или NestJS) — только мажорная версия.
- **BR-2.** Потребители ставят версию точно (`--save-exact`); README так и показывает установку.
- **BR-3.** В пакете нет секретов, URL окружений и бизнес-логики Вердикта сверх контракта токена (до 2.0.0 пакет был публичным; с 2.0.0 он виден всем, у кого есть доступ к группе `verdeect-v3`, — правило сохраняется).
- **BR-4.** Код `testing` не импортируется из `.` и `./nest` (иначе он попадёт в production мимо FR-2).
- **BR-5.** Токены реестра не хранятся в репозитории и в переменных GitLab: файла `.npmrc` под git нет (`.npmrc` остаётся в `.gitignore`), значение после `_authToken=` в отслеживаемых файлах — только `${CI_JOB_TOKEN}` (в `.gitlab-ci.yml`) или заполнитель в угловых скобках (в документации); в архив пакета `.npmrc` не попадает.

## 7. Данные

Нет. Хранилищ и миграций у библиотеки нет.

## 8. API / интеграции

Публичный API — как в workspace-версии (README Identity-пакета), меняются только пути импорта:

| Было | Стало |
|---|---|
| `verdeect-auth` | `@verdeect-v3/auth` — значения `createVerifier`, `VerifyError`; типы `TokenKind`, `TrustedIssuer`, `VerifierOptions`, `UserPrincipal`, `ServicePrincipal`, `AgentPrincipal`, `Principal`, `Verifier`, `VerifyReason`, `VerifyRule` |
| `verdeect-auth/nest` | `@verdeect-v3/auth/nest` — значения `VerdeectAuthModule`, `VerdeectAuthGuard`, `VERDEECT_VERIFIER`, `RequireTenant`, `RequireScope`, `RequireUser`, `RequireService`, `principalOf`; типы `PrincipalCarrier`, `VerdeectAuthModuleOptions`, `VerdeectAuthAsyncOptions` |
| `verdeect-auth/testing` | `@verdeect-v3/auth/testing` — значения `createTestSigner`, `tokenVectors`, `TEST_IDENTITY_ISS`, `TEST_ORCHESTRATOR_ISS`, `TEST_RESOURCE`; типы `Claims`, `Header`, `TestSigner`, `TestSignerOptions`, `TokenVector`, `VectorExpectation`, `VectorSigners` |

Точный список экспортов фиксирует тест (AC-9). В версии 2.0.0 список экспортов и сигнатуры те же, что в 1.0.1; меняется только имя пакета в путях импорта: `@verdeect/auth`, `@verdeect/auth/nest`, `@verdeect/auth/testing` → `@verdeect-v3/auth`, `@verdeect-v3/auth/nest`, `@verdeect-v3/auth/testing` (AC-17). Интеграции: реестр npm GitLab (публикация — адрес проекта, установка — адрес инстанса; D-13), GitLab CI.

## 9. Документация

| Файл | Содержание |
|---|---|
| `README.md` | назначение; совместимость (Node ≥ 22.12, ESM, NestJS 12); установка из реестра GitLab с точной версией (FR-14); быстрый старт без Nest и с Nest (`forRootAsync`, guard, декораторы, `APP_GUARD`); таблица правил V-1…V-8 с `reason`; `Principal` по видам; порядок проверок guard'а и ответы (`01` §8); логи; тесты потребителя; чего библиотека не делает (роли и права — Platform `authz/check`, актуальность `pep`); ссылки на `docs/`; версионирование |
| `docs/getting-started.md` | пошаговое подключение к новому сервису NestJS: конфигурация издателей (Identity, Orchestrator с `kinds: ['agent']`), переменные окружения сервиса, проверка вызовом с токеном |
| `docs/nestjs.md` | модуль, `isGlobal`, guard на контроллере и через `APP_GUARD`, сочетания декораторов и ошибки конфигурации, чтение `Principal`, маршруты без токена |
| `docs/testing.md` | `createTestSigner` (все методы), векторы V-1…V-8 в тестах сервиса, условие `development` (Vitest — по умолчанию; Node — `--conditions=development`; почему `testing` недоступен в production) |
| `docs/errors.md` | `VerifyError`: `rule`, `reason`, что видит клиент (401 без причины) и что пишется в лог; сбой JWKS → 500, не 401 |
| `docs/releasing.md` | UC-3 по шагам, semver (BR-1), CHANGELOG; разовая настройка проекта GitLab (FR-13: защищённые теги `v*`, Job token permissions — группа `verdeect-v3`); как авторизуется публикация (`CI_JOB_TOKEN`, временный конфиг npm вне каталога проекта, FR-11); что проверяет `publish` до публикации; ошибки выпуска; проверка опубликованной версии (AC-16); где смотреть лог публикации. Разделов про GitHub, Trusted Publishing и ручной первый выпуск нет |
| `CHANGELOG.md` | FR-12 |
| TSDoc | у каждого публичного экспорта (функции, классы, декораторы, типы и их поля): назначение, параметры, исключения, пример для основных — видно в подсказках IDE через `.d.ts` |
| `AGENTS.md` | карта репозитория для агентов (как в Identity) |

Язык документации — русский (D-5). Ссылки только внутри репозитория или на публичные адреса; на файлы Identity — не относительными путями.

## 10. Edge cases

- **EC-1.** Потребитель на `moduleResolution: "bundler"` (Vite-приложение) — типы всех подпутей разрешаются (AC-3).
- **EC-2.** У потребителя другая патч-версия NestJS 12 — peer-диапазон не даёт конфликта при установке.
- **EC-3.** Два разных экземпляра `@nestjs/core` у потребителя — не наш случай: Nest — peer, свой экземпляр пакет не приносит (AC-4: в архиве нет `node_modules`, Nest нет в `dependencies`).

## 11. Нефункциональные требования

- Размер архива — без исходников, тестов и карт (AC-4).
- Безопасность: BR-3, BR-4, BR-5, FR-2; `npm publish` только из CI. Provenance у версий из GitLab нет (D-10).
- Совместимость: Node 22 (≥ 22.12) и 24 (тесты в CI на обеих — матрица job `test`; Identity работает на Node 24).

## 12. Принятые решения

- ~~**D-1.**~~ (заменено D-9 в версии 1.1) Имя `@verdeect/auth`, npmjs.com, публичный пакет — решение 21 `01`. Отвергнуто: GitLab npm registry (нужна авторизация у каждого потребителя и в каждом CI).
- **D-2.** Репозиторий `verdeect2/verdeect-auth` с историей из `verdeect-identity` (`git subtree split`). Отвергнуто: копирование файлов без истории.
- **D-3.** Первая версия — `1.0.0`: контракт стабилен и уже работает в Identity; с `0.x` semver не различает ломающие изменения. Отвергнуто: `0.1.0`.
- **D-4.** `[ASSUMPTION]` Лицензия `UNLICENSED` (все права защищены, код виден, но не передаётся по лицензии). Если нужна открытая (MIT) — правка `package.json` и файл `LICENSE` до выпуска.
- **D-5.** Документация на русском, как все документы проекта. Идентификаторы и код — на английском.
- **D-7.** Минимальная версия Node — 22.12 (r2). Node 20 вышел из поддержки 30.04.2026, закреплённый vitest 5 требует Node ≥ 22.12, Identity работает на Node 24; поднять минимум после выпуска 1.0.0 было бы ломающим изменением (BR-1), до выпуска — бесплатно. Отвергнуты: проверки на Node 20 без vitest (поддержка версии, которая уже не поддерживается) и откат vitest.
- ~~**D-8.**~~ (заменено D-10 и D-12 в версии 1.1) Репозиторий и CI — GitHub (`smskin/verdeect-auth`, GitHub Actions), а не GitLab, как остальные репозитории 2.0 (r3). Публикация — npm Trusted Publishing (OIDC) из job `publish` `ci.yml`, environment `npm` (r4): долгоживущего токена нет, provenance — автоматически (публичный пакет из публичного репозитория). Trusted publisher настраивается только у пакета, который уже есть в npm (первый выпуск через OIDC npm не поддерживает — npm/cli#8544), поэтому 1.0.0 мейнтейнер публикует вручную (r5): из чистого клона на теге `v1.0.0` после зелёного `make ci`, `npm login` с 2FA, `npm publish --access public` — токены не создаются. Сразу после выпуска — `npm trust github` и «require 2FA and disallow tokens» в настройках пакета; со следующей версии публикует только CI. Цена: у 1.0.0 нет provenance. Отвергнуто: временный granular-токен в CI (лишний секрет ради одного выпуска).
- **D-6.** `testing` закрыт условием `development` без `default`, но с `types` вне условия. Отвергнуты: отдельный пакет `@verdeect-v3/auth-testing` (лишний выпуск на каждое изменение), `testing` в `default` (тестовый подписчик доступен в production).

- **D-9.** (версия 1.1) Имя `@verdeect-v3/auth`, реестр npm GitLab `gitlab.mkomov.com`, проект `verdeect-v3/verdeect-v3-auth` — решение владельца 17.11.2026 (`01` решение 21). Цена, из-за которой в D-1 GitLab отвергали (авторизация у каждого потребителя и в каждом CI), принята: в CI — токен задания, локально и на серверах — токен `read_api` в `~/.npmrc`. Отвергнуто: остаться на npmjs.com.
- **D-10.** (версия 1.1) Публикует только задание `publish` GitLab CI в pipeline защищённого тега `v*`, токеном задания `CI_JOB_TOKEN`; своих токенов нет. Ручного первого выпуска нет: реестр GitLab принимает первую версию из CI. Цена: provenance нет (он был у 1.0.1 на npmjs.com). Отвергнуто: deploy token или личный токен в переменных GitLab (лишний долгоживущий секрет).
- **D-11.** (версия 1.1) Первая версия под новым именем — `2.0.0`: потребитель обязан заменить зависимость и все пути импорта и настроить доступ к реестру — это ломающее изменение (BR-1, раздел «Как обновиться»); номер не пересекается с `@verdeect/auth@1.0.x` на npmjs.com, поэтому по номеру видно, откуда пакет. Отвергнуто: `1.0.2` (ломающий переход не виден), `1.0.0` (тот же номер у другой сборки под старым именем).
- **D-12.** (версия 1.1) CI — GitLab CI без своего Docker-образа: публичные образы `node` 22 и 24 с закреплённым тегом; pipeline — вручную и по тегу `v*`, как у сервисов 2.0. Отвергнуто: стадия `ci` в Dockerfile (библиотеке образ не нужен — правило «Library Package Without Docker»).
- **D-13.** (версия 1.1) Два адреса реестра: установка — адрес инстанса `https://gitlab.mkomov.com/api/v4/packages/npm/` (один для всех пакетов `@verdeect-v3`; работает, потому что scope совпадает с путём группы верхнего уровня `verdeect-v3`), публикация — адрес проекта `…/projects/<id>/packages/npm/`. Файла `.npmrc` в репозитории пакета нет: у пакета нет зависимостей из `@verdeect-v3`, а строка реестра для публикации создаётся в CI. Отвергнуто: адрес группы (нужен её числовой id в конфигурации каждого потребителя).
- **D-14.** (версия 1.1) Перенос — `git push --mirror` с исходными хешами; локальная папка остаётся `verdeect2/verdeect-auth`; GitHub после сверки — архив только для чтения, удаление — по команде координатора. Отвергнуто: новый репозиторий с одним коммитом (теряется история), импорт проекта средствами GitLab (нужен токен GitHub в GitLab).

## 13. Открытые вопросы

Нет.

`[ASSUMPTION]` (версия 1.1) Раннер с тегом проверочных заданий сервисов 2.0 запускает задания в Docker с образом из `image:` и может скачать публичный образ `node`. Если это не так (shell-раннер, нет доступа к Docker Hub) — не обходить, остановиться и спросить.

## 14. Критерии приёмки

- **AC-1 (UC-4, FR-2, BR-4).** В проекте, куда установлен архив: `node -e "import('@verdeect-v3/auth/testing')"` → `ERR_PACKAGE_PATH_NOT_EXPORTED`; `node --conditions=development -e "import('@verdeect-v3/auth/testing')"` → загружается; в `dist/index.js` и `dist/nest/**` нет импорта из `testing`.
- **AC-2 (UC-1 alt-1, FR-4).** В проекте без `@nestjs/*`, `rxjs`, `reflect-metadata` `import('@verdeect-v3/auth')` и `createVerifier(...)` работают; установка не падает и не требует peer-зависимостей. С установленными NestJS 12.x `import('@verdeect-v3/auth/nest')` работает.
- **AC-3 (UC-1, UC-2, EC-1, FR-8).** Файл потребителя, импортирующий все три подпути, проходит `tsc --noEmit` при `moduleResolution: "NodeNext"` и при `"bundler"`.
- **AC-4 (FR-1, FR-3, EC-3).** `npm pack --dry-run --json` — в архиве только `package.json`, `README.md`, `CHANGELOG.md`, `dist/**/*.js`, `dist/**/*.d.ts` (и `LICENSE`, если есть); нет `src/`, `*.spec.*`, `*.map`, `tsconfig*`, `requirements/`, `.ai-factory/`, `docs/`.
- **AC-5 (FR-7).** `publint` — 0 ошибок; `attw --pack --profile esm-only` — 0 проблем.
- **AC-6 (FR-5).** Все перенесённые тесты зелёные, в их именах остались AC-7.1–7.4; число тестов не меньше, чем в `verdeect-identity/packages/verdeect-auth` на момент выноса (3 spec-файла: `verifier.spec.ts`, `verifier.jwks.spec.ts`, `nest/verdeect-auth.guard.spec.ts`).
- **AC-7 (UC-2, FR-8).** В проекте-потребителе тест Vitest импортирует `@verdeect-v3/auth/testing`, поднимает `createTestSigner`, проверяет `userToken` через `createVerifier` из `@verdeect-v3/auth` и проходит без дополнительной настройки условий.
- **AC-8 (UC-3, FR-11).** (изменён в версии 1.1) Разбор `.gitlab-ci.yml` тестом: pipeline создаётся только при запуске вручную и на тег `v<major>.<minor>.<patch>`; задание `publish` есть только в pipeline тега и зависит от `lint`, `test` (Node 22 и 24) и `build`; команды заданий — как в FR-11; `allow_failure` нет; каталога `.github/` нет. Сухой прогон `scripts/publish.mjs --dry-run` против локального реестра в тесте: тег `v2.0.0` при `version` `2.0.0` — доходит до `npm publish --dry-run`, код 0; тег `v2.0.1` при `version` `2.0.0` — падение до `npm publish` с сообщением о несовпадении; версия уже в реестре — падение до `npm publish`; тег не по шаблону или пустой `CI_COMMIT_TAG` — падение до `npm publish`.
- **AC-9 (FR-9, §8).** Тест сверяет список экспортов трёх подпутей с таблицей §8 (новый экспорт без записи в README и CHANGELOG — падение). `make lint` требует TSDoc у каждого публичного экспорта (`eslint-plugin-jsdoc` или аналог на TypeScript).
- **AC-10 (FR-9).** Тест проверяет Markdown-файлы репозитория: относительные ссылки ведут на существующие файлы, ссылок `../../` нет; в README есть разделы: установка, быстрый старт, правила V-1…V-8, `Principal`, NestJS, тесты, версионирование. (версия 1.1) README показывает `pnpm add @verdeect-v3/auth@<version из package.json> --save-exact` (BR-2).
- **AC-11 (FR-10, FR-12).** `make ci` выполняет `lint analyse test build pack-check` и зелёный; в `CHANGELOG.md` есть раздел `1.0.0`; `docs/releasing.md` описывает UC-3. (версия 1.1) В `CHANGELOG.md` есть раздел `[2.0.0]` с подразделом «Как обновиться», разделы `[1.0.0]` и `[1.0.1]` не изменены; `docs/releasing.md` содержит настройку GitLab из FR-13 и не содержит `Trusted Publishing`, `npm trust`, `npm login`, `NPM_TOKEN`, `github`.
- **AC-12 (UC-5, FR-13).** После переноса: `git rev-list --count main` и хеш вершины `main` в GitLab и в GitHub равны; списки тегов равны (`v1.0.0`, `v1.0.1`) и хеши тегов совпадают; `git remote get-url origin` — адрес проекта `verdeect-v3/verdeect-v3-auth` на `gitlab.mkomov.com`. Проверка — командами, вывод в отчёте этапа.
- **AC-13 (FR-1, FR-15).** Тест репозитория: в файлах из перечня FR-15 (с его исключениями) нет строк `@verdeect/auth`, `npmjs`, `github`, `Trusted Publishing`, `npm trust`. В упакованном `package.json`: `name` — `@verdeect-v3/auth`, `version` — `2.0.0`, `repository.url` — `git+https://gitlab.mkomov.com/verdeect-v3/verdeect-v3-auth.git`, поля `publishConfig` нет.
- **AC-14 (BR-5, FR-11).** Тест репозитория: файла `.npmrc` под git нет, `.npmrc` есть в `.gitignore`; в отслеживаемых файлах после `_authToken=` стоит только `${CI_JOB_TOKEN}` или заполнитель в угловых скобках; в `.gitlab-ci.yml` и `scripts/` нет `NPM_TOKEN`, `NODE_AUTH_TOKEN`; задание `publish` пишет конфиг npm по пути вне `CI_PROJECT_DIR`, передаёт его через `NPM_CONFIG_USERCONFIG` и удаляет в `after_script`; в архиве пакета нет `.npmrc` (AC-4).
- **AC-15 (UC-1, FR-14).** Тест документации: раздел «Установка» README содержит обе строки `~/.npmrc` из FR-14 (адрес инстанса, заполнитель токена), слова `read_api` и `CI_JOB_TOKEN` и предупреждение не класть токен в репозиторий.
- **AC-16 (UC-3, D-10).** Выпуск 2.0.0: pipeline тега `v2.0.0` в GitLab зелёный, задание `publish` выполнено. После него с токеном `read_api` через адрес инстанса: `npm view @verdeect-v3/auth@2.0.0 version` → `2.0.0`; установка `@verdeect-v3/auth@2.0.0` в пустой проект вне репозитория проходит; в этом проекте выполняются проверки AC-1 (подпуть `testing` закрыт без условия `development`) и `import('@verdeect-v3/auth')`. Проверка — командами после выпуска, вывод в отчёте этапа.
- **AC-17 (FR-5, §8).** Список экспортов трёх подпутей и поле `exports` в `package.json` те же, что в теге `v1.0.1` (тест AC-9 проходит без изменения списка); `git diff v1.0.1 -- src` показывает только замену имени пакета в комментариях и TSDoc.

## 15. Тестовые данные

Не нужны: JWKS — локальный сервер `createTestSigner`, проект-потребитель — шаблон `tests/consumer/`.

## 16. Затрагиваемые части системы

Репозиторий `verdeect2/verdeect-auth` (до версии 1.1 — GitHub `smskin/verdeect-auth`; с версии 1.1 — GitLab `gitlab.mkomov.com/verdeect-v3/verdeect-v3-auth`; WSL: `/home/administrator/projects/verdeect2/verdeect-auth`). Источник кода — `/home/administrator/projects/verdeect2/verdeect-identity/packages/verdeect-auth` (перенести как есть). Стек: TypeScript (ESM), NestJS 12 (peer), `jose`, Vitest, pnpm. Специалисты: `nestjs-specialist`, `nestjs-code`, `nestjs-generate-documentation`.
