# PRD: `@verdeect/auth` — библиотека проверки токенов Вердикта 2.0

> Пакет: requirements/0000-verdeect-auth/ · Ревизия: r5 · Дата: 2026-10-22 · Источник: обсуждение в Claude (чат Identity)
> Тип: новая библиотека (вынос существующего кода) · Изменяет: — · UI: нет

Контракт проверки токена (правила V-1…V-8, `Principal`, guard'ы, ответы) уже определён и реализован в Identity: `verdeect-identity/requirements/0000-identity-server/prd.md` §7.5, AC-7.1–7.4. Этот PRD **не меняет поведение** библиотеки. Он описывает, как она становится отдельным npm-пакетом: упаковка, документация, выпуск. Основание — решение 21 `01-architecture-and-contracts.md`: общие пакеты публикуются в npm, scope `@verdeect` на npmjs.com, один репозиторий на пакет, semver, публикация из CI по тегу, потребители пинят версию точно.

## 1. Цель и контекст

Каждый сервис Вердикта — сервер ресурсов `https://api.verdeect.ru` и проверяет `at+jwt` **только** этой библиотекой (`01` §5.3). Сейчас она лежит в `verdeect-identity/packages/verdeect-auth` как workspace-пакет (`private`, `0.0.0`). Подключить её в Platform, BFF, Orchestrator и другие сервисы нельзя. Цель — опубликовать `@verdeect/auth` 1.0.0 с документацией, по которой разработчик сервиса подключает проверку без чтения исходников и PRD Identity.

## 2. Скоуп

**Входит:**
- перенос кода и тестов в репозиторий `verdeect2/verdeect-auth` с историей коммитов;
- автономные настройки (TypeScript, ESLint, Prettier, Vitest, pnpm) без ссылок на файлы Identity;
- упаковка: имя, `exports`, типы `.d.ts`, состав архива, зависимости;
- закрытие подпути `testing` для production;
- проверки пакета (содержимое архива, `exports`, типы, установка в чистый проект);
- документация: README, руководства, TSDoc публичного API, CHANGELOG, порядок выпуска;
- Makefile и GitHub Actions с публикацией по тегу.

**Не входит:**
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

Публиковать может только job `publish` GitHub Actions на теге `v*`, защищённом ruleset'ом репозитория, через npm Trusted Publishing (OIDC, без долгоживущего токена; D-8). Единственное исключение — первый выпуск 1.0.0: вручную мейнтейнером с 2FA (D-8). Ручная публикация с машины разработчика — не способ выпуска.

## 4. Use cases

### UC-1. Подключение библиотеки к сервису
- **Актор:** разработчик сервиса · **Предусловие:** сервис на NestJS 12 / Node ≥ 22.12, ESM · **Триггер:** сервису нужно принимать токены.
- **Основной поток:** 1) `pnpm add @verdeect/auth@1.0.0 --save-exact`. 2) По README регистрирует `VerdeectAuthModule.forRootAsync` в корневом модуле. 3) Ставит `@UseGuards(VerdeectAuthGuard)` и декораторы на маршруты. 4) Читает `Principal` через `principalOf(request)`.
- **Альтернативные потоки:** alt-1 (шаг 2) сервис без Nest (скрипт, воркер) использует только `createVerifier` из `@verdeect/auth`; `@nestjs/*` не установлены, импорт работает.
- **Ошибки:** err-1 (шаг 2) неверная конфигурация (пустой `issuers`, повтор `iss`) — исключение при старте с понятным текстом (поведение не меняется).
- **Результат:** маршруты сервиса принимают токены по правилам V-1…V-8. · **AC:** AC-2, AC-3, AC-9.

### UC-2. Тесты сервиса с `@verdeect/auth/testing`
- **Актор:** разработчик сервиса · **Предусловие:** UC-1, тесты на Vitest.
- **Основной поток:** 1) В тесте импортирует `createTestSigner`, `tokenVectors` из `@verdeect/auth/testing`. 2) Поднимает подписчик, передаёт `signer.issuer` в конфигурацию модуля. 3) Подписывает токены и проверяет ответы своих маршрутов. 4) `tsc --noEmit` проходит.
- **Ошибки:** err-1 импорт `testing` в production-коде — сервис падает при старте (UC-4), а не тихо работает с тестовым подписчиком.
- **Результат:** тесты сервиса проверяют авторизацию без Identity. · **AC:** AC-3, AC-7.

### UC-3. Выпуск версии
- **Актор:** мейнтейнер · **Предусловие:** изменения влиты в `main`, `make ci` зелёный.
- **Основной поток:** 1) Повышает `version` в `package.json` по semver. 2) Дописывает раздел версии в `CHANGELOG.md`. 3) Коммитит, ставит тег `vX.Y.Z`, пушит тег. 4) CI прогоняет проверки и публикует пакет.
- **Альтернативные потоки:** alt-1 изменение ломает контракт (правило V-*, поле `Principal`, код ответа guard'а, сигнатура экспорта) — мажорная версия и раздел «Как обновиться» в CHANGELOG.
- **Ошибки:** err-1 тег не совпадает с `version` — job падает до публикации; err-2 версия уже есть в npm — job падает, ничего не перезаписывается.
- **Результат:** версия доступна в npm, её можно запинить. · **AC:** AC-8, AC-11.

### UC-4. Production-сборка сервиса
- **Актор:** — (запуск Node в образе сервиса) · **Предусловие:** образ собран с `@verdeect/auth`.
- **Основной поток:** 1) Node грузит `@verdeect/auth` и `@verdeect/auth/nest` из `dist`. 2) Импорт `@verdeect/auth/testing` без условия `development` невозможен (`ERR_PACKAGE_PATH_NOT_EXPORTED`).
- **Результат:** тестовый подписчик с локальным JWKS не попадает в production-путь (закрывает пункт `testing-subpath` `.ai-factory/SECURITY.md` Identity). · **AC:** AC-1.

## 5. Функциональные требования

- **FR-1 (UC-1, UC-3).** `package.json`: `name: "@verdeect/auth"`, `version: "1.0.0"`, `type: "module"`, `engines.node: ">=22.12"`, `description`, `keywords`, `repository` (GitHub `smskin/verdeect-auth`, `git+https://github.com/smskin/verdeect-auth.git`), `license` (см. D-4), `sideEffects: false`, `publishConfig: {access: "public"}`, без `private`. `files` — только `dist`, `README.md`, `CHANGELOG.md` (и файл лицензии, если появится).
- **FR-2 (UC-1, UC-4).** `exports`:
  - `"."` и `"./nest"` — `{types: "./dist/…/index.d.ts", default: "./dist/…/index.js"}`;
  - `"./testing"` — `{types: "./dist/testing/index.d.ts", development: "./dist/testing/index.js"}` без `default`: типы видны всегда (typecheck тестов), код грузится только с условием `development` (Vitest/Vite ставит его по умолчанию, Node — нет);
  - `"./package.json"`.
  Условия `development → src` из workspace-версии удаляются, исходники в архив не входят.
- **FR-3.** Сборка `tsc` в `dist/`: ESM `.js` и `.d.ts` для всех публичных модулей, без spec-файлов, без source map и declaration map (исходников в архиве нет). Цель — ES2023, `module`/`moduleResolution` — `NodeNext`.
- **FR-4 (UC-1 alt-1).** Зависимости: `jose` — `dependencies`, точная версия. `@nestjs/common`, `@nestjs/core` (`^12.1.3`), `reflect-metadata` (`^0.2.2`), `rxjs` (`^7.8.2`) — `peerDependencies` с диапазоном, все помечены `optional` в `peerDependenciesMeta`: ядро `@verdeect/auth` не импортирует `@nestjs/*`, `rxjs`, `reflect-metadata` (проверяется тестом AC-2). В `devDependencies` версии точные.
- **FR-5.** Поведение не меняется: код `src/` и все spec-файлы переносятся как есть, кроме путей импорта и конфигурации. Имена тестов сохраняют ID AC-7.1–7.4 Identity.
- **FR-6.** Автономные настройки: `tsconfig.json` без `extends` за пределы репозитория (опции — из `tsconfig.base.json` Identity), `tsconfig.build.json`, `eslint.config.js` и Prettier — как в Identity, `vitest.config.ts`, `packageManager: pnpm@12.11.2`, `pnpm-lock.yaml`, пины точные, `minimumReleaseAge` — как в Identity. Ссылок на `../../` нет ни в конфигурации, ни в документации.
- **FR-7 (UC-3).** Проверки пакета (скрипт `pack:check`): `publint` без ошибок; `@arethetypeswrong/cli` с профилем `esm-only` без проблем; тест состава архива `npm pack --dry-run --json`.
- **FR-8 (UC-1, UC-2, UC-4).** Проверка потребителя: тест собирает архив (`pnpm pack`), устанавливает его во временный проект вне репозитория (`tests/consumer/` как шаблон) и проверяет AC-1, AC-2, AC-3, AC-7.
- **FR-9 (UC-1, UC-2).** Документация (раздел 9).
- **FR-10 (UC-3).** Makefile — единая точка входа: `install`, `lint`, `analyse` (typecheck), `test`, `build`, `pack-check`, `ci` (= `lint analyse test build pack-check`), `clean`. Docker-целей нет.
- **FR-11 (UC-3).** GitHub Actions (`.github/workflows/ci.yml`): jobs `lint` → `test` (матрица Node) → `build` → `publish`. Проверки — на каждый push и pull request. `publish` — только на тег `v<semver>` (ruleset тегов), environment `npm`, `permissions: id-token: write` только у этого job, npm CLI ≥ 11.15 на GitHub-hosted runner; публикация через Trusted Publishing (OIDC); до публикации сверяет тег с `version` и проверяет, что версии нет в npm; `npm publish --access public` из собранного `dist`. Без `allow_failure`.
- **FR-12 (UC-3).** `CHANGELOG.md` в формате Keep a Changelog; версия 1.0.0 — «вынос из `verdeect-identity` без изменения поведения, новое имя `@verdeect/auth`, подпуть `testing` закрыт для production». Порядок выпуска — `docs/releasing.md`.

## 6. Бизнес-правила и ограничения

- **BR-1.** Semver: ломающее изменение контракта (правило V-*, поле `Principal`, код или статус ответа guard'а, сигнатура или удаление экспорта, поднятие минимальной версии Node или NestJS) — только мажорная версия.
- **BR-2.** Потребители ставят версию точно (`--save-exact`); README так и показывает установку.
- **BR-3.** В пакете нет секретов, URL окружений и бизнес-логики Вердикта сверх контракта токена (пакет публичный).
- **BR-4.** Код `testing` не импортируется из `.` и `./nest` (иначе он попадёт в production мимо FR-2).

## 7. Данные

Нет. Хранилищ и миграций у библиотеки нет.

## 8. API / интеграции

Публичный API — как в workspace-версии (README Identity-пакета), меняются только пути импорта:

| Было | Стало |
|---|---|
| `verdeect-auth` | `@verdeect/auth` — значения `createVerifier`, `VerifyError`; типы `TokenKind`, `TrustedIssuer`, `VerifierOptions`, `UserPrincipal`, `ServicePrincipal`, `AgentPrincipal`, `Principal`, `Verifier`, `VerifyReason`, `VerifyRule` |
| `verdeect-auth/nest` | `@verdeect/auth/nest` — значения `VerdeectAuthModule`, `VerdeectAuthGuard`, `VERDEECT_VERIFIER`, `RequireTenant`, `RequireScope`, `RequireUser`, `RequireService`, `principalOf`; типы `PrincipalCarrier`, `VerdeectAuthModuleOptions`, `VerdeectAuthAsyncOptions` |
| `verdeect-auth/testing` | `@verdeect/auth/testing` — значения `createTestSigner`, `tokenVectors`, `TEST_IDENTITY_ISS`, `TEST_ORCHESTRATOR_ISS`, `TEST_RESOURCE`; типы `Claims`, `Header`, `TestSigner`, `TestSignerOptions`, `TokenVector`, `VectorExpectation`, `VectorSigners` |

Точный список экспортов фиксирует тест (AC-9). Интеграции: npmjs.com (публикация), GitHub Actions.

## 9. Документация

| Файл | Содержание |
|---|---|
| `README.md` | назначение; совместимость (Node ≥ 22.12, ESM, NestJS 12); установка с точной версией; быстрый старт без Nest и с Nest (`forRootAsync`, guard, декораторы, `APP_GUARD`); таблица правил V-1…V-8 с `reason`; `Principal` по видам; порядок проверок guard'а и ответы (`01` §8); логи; тесты потребителя; чего библиотека не делает (роли и права — Platform `authz/check`, актуальность `pep`); ссылки на `docs/`; версионирование |
| `docs/getting-started.md` | пошаговое подключение к новому сервису NestJS: конфигурация издателей (Identity, Orchestrator с `kinds: ['agent']`), переменные окружения сервиса, проверка вызовом с токеном |
| `docs/nestjs.md` | модуль, `isGlobal`, guard на контроллере и через `APP_GUARD`, сочетания декораторов и ошибки конфигурации, чтение `Principal`, маршруты без токена |
| `docs/testing.md` | `createTestSigner` (все методы), векторы V-1…V-8 в тестах сервиса, условие `development` (Vitest — по умолчанию; Node — `--conditions=development`; почему `testing` недоступен в production) |
| `docs/errors.md` | `VerifyError`: `rule`, `reason`, что видит клиент (401 без причины) и что пишется в лог; сбой JWKS → 500, не 401 |
| `docs/releasing.md` | UC-3 по шагам, semver (BR-1), CHANGELOG, настройка GitHub (environment `npm`, ruleset тегов) и npm (trusted publisher `smskin/verdeect-auth`, workflow `ci.yml`, environment `npm`; `npm trust github …`); первый выпуск вручную (D-8) и переход на OIDC по шагам; после перехода — запрет токенов публикации у пакета |
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
- Безопасность: BR-3, BR-4, FR-2; `npm publish` только из CI.
- Совместимость: Node 22 (≥ 22.12) и 24 (тесты в CI на обеих — матрица job `test`; Identity работает на Node 24).

## 12. Принятые решения

- **D-1.** Имя `@verdeect/auth`, npmjs.com, публичный пакет — решение 21 `01`. Отвергнуто: GitLab npm registry (нужна авторизация у каждого потребителя и в каждом CI).
- **D-2.** Репозиторий `verdeect2/verdeect-auth` с историей из `verdeect-identity` (`git subtree split`). Отвергнуто: копирование файлов без истории.
- **D-3.** Первая версия — `1.0.0`: контракт стабилен и уже работает в Identity; с `0.x` semver не различает ломающие изменения. Отвергнуто: `0.1.0`.
- **D-4.** `[ASSUMPTION]` Лицензия `UNLICENSED` (все права защищены, код виден, но не передаётся по лицензии). Если нужна открытая (MIT) — правка `package.json` и файл `LICENSE` до выпуска.
- **D-5.** Документация на русском, как все документы проекта. Идентификаторы и код — на английском.
- **D-7.** Минимальная версия Node — 22.12 (r2). Node 20 вышел из поддержки 30.04.2026, закреплённый vitest 5 требует Node ≥ 22.12, Identity работает на Node 24; поднять минимум после выпуска 1.0.0 было бы ломающим изменением (BR-1), до выпуска — бесплатно. Отвергнуты: проверки на Node 20 без vitest (поддержка версии, которая уже не поддерживается) и откат vitest.
- **D-8.** Репозиторий и CI — GitHub (`smskin/verdeect-auth`, GitHub Actions), а не GitLab, как остальные репозитории 2.0 (r3). Публикация — npm Trusted Publishing (OIDC) из job `publish` `ci.yml`, environment `npm` (r4): долгоживущего токена нет, provenance — автоматически (публичный пакет из публичного репозитория). Trusted publisher настраивается только у пакета, который уже есть в npm (первый выпуск через OIDC npm не поддерживает — npm/cli#8544), поэтому 1.0.0 мейнтейнер публикует вручную (r5): из чистого клона на теге `v1.0.0` после зелёного `make ci`, `npm login` с 2FA, `npm publish --access public` — токены не создаются. Сразу после выпуска — `npm trust github` и «require 2FA and disallow tokens» в настройках пакета; со следующей версии публикует только CI. Цена: у 1.0.0 нет provenance. Отвергнуто: временный granular-токен в CI (лишний секрет ради одного выпуска).
- **D-6.** `testing` закрыт условием `development` без `default`, но с `types` вне условия. Отвергнуты: отдельный пакет `@verdeect/auth-testing` (лишний выпуск на каждое изменение), `testing` в `default` (тестовый подписчик доступен в production).

## 13. Открытые вопросы

Нет.

## 14. Критерии приёмки

- **AC-1 (UC-4, FR-2, BR-4).** В проекте, куда установлен архив: `node -e "import('@verdeect/auth/testing')"` → `ERR_PACKAGE_PATH_NOT_EXPORTED`; `node --conditions=development -e "import('@verdeect/auth/testing')"` → загружается; в `dist/index.js` и `dist/nest/**` нет импорта из `testing`.
- **AC-2 (UC-1 alt-1, FR-4).** В проекте без `@nestjs/*`, `rxjs`, `reflect-metadata` `import('@verdeect/auth')` и `createVerifier(...)` работают; установка не падает и не требует peer-зависимостей. С установленными NestJS 12.x `import('@verdeect/auth/nest')` работает.
- **AC-3 (UC-1, UC-2, EC-1, FR-8).** Файл потребителя, импортирующий все три подпути, проходит `tsc --noEmit` при `moduleResolution: "NodeNext"` и при `"bundler"`.
- **AC-4 (FR-1, FR-3, EC-3).** `npm pack --dry-run --json` — в архиве только `package.json`, `README.md`, `CHANGELOG.md`, `dist/**/*.js`, `dist/**/*.d.ts` (и `LICENSE`, если есть); нет `src/`, `*.spec.*`, `*.map`, `tsconfig*`, `requirements/`, `.ai-factory/`, `docs/`.
- **AC-5 (FR-7).** `publint` — 0 ошибок; `attw --pack --profile esm-only` — 0 проблем.
- **AC-6 (FR-5).** Все перенесённые тесты зелёные, в их именах остались AC-7.1–7.4; число тестов не меньше, чем в `verdeect-identity/packages/verdeect-auth` на момент выноса (3 spec-файла: `verifier.spec.ts`, `verifier.jwks.spec.ts`, `nest/verdeect-auth.guard.spec.ts`).
- **AC-7 (UC-2, FR-8).** В проекте-потребителе тест Vitest импортирует `@verdeect/auth/testing`, поднимает `createTestSigner`, проверяет `userToken` через `createVerifier` из `@verdeect/auth` и проходит без дополнительной настройки условий.
- **AC-8 (UC-3, FR-11).** CI: push в ветку — нет job `publish`; тег `v1.0.0` при `version` `1.0.0` — `publish` выполняется после зелёных проверок, у job `publish` (и только у него) `id-token: write`, npm CLI ≥ 11.15; тег `v1.0.1` при `version` `1.0.0` — `publish` падает до `npm publish` с сообщением о несовпадении; версия уже в npm — падает до `npm publish`. Проверяется сухим прогоном скрипта публикации (`--dry-run`) в тесте и разбором `.github/workflows/ci.yml`.
- **AC-9 (FR-9, §8).** Тест сверяет список экспортов трёх подпутей с таблицей §8 (новый экспорт без записи в README и CHANGELOG — падение). `make lint` требует TSDoc у каждого публичного экспорта (`eslint-plugin-jsdoc` или аналог на TypeScript).
- **AC-10 (FR-9).** Тест проверяет Markdown-файлы репозитория: относительные ссылки ведут на существующие файлы, ссылок `../../` нет; в README есть разделы: установка, быстрый старт, правила V-1…V-8, `Principal`, NestJS, тесты, версионирование.
- **AC-11 (FR-10, FR-12).** `make ci` выполняет `lint analyse test build pack-check` и зелёный; в `CHANGELOG.md` есть раздел `1.0.0`; `docs/releasing.md` описывает UC-3.

## 15. Тестовые данные

Не нужны: JWKS — локальный сервер `createTestSigner`, проект-потребитель — шаблон `tests/consumer/`.

## 16. Затрагиваемые части системы

Новый репозиторий `verdeect2/verdeect-auth` (GitHub `smskin/verdeect-auth`; WSL: `/home/administrator/projects/verdeect2/verdeect-auth`). Источник кода — `/home/administrator/projects/verdeect2/verdeect-identity/packages/verdeect-auth` (перенести как есть). Стек: TypeScript (ESM), NestJS 12 (peer), `jose`, Vitest, pnpm. Специалисты: `nestjs-specialist`, `nestjs-code`, `nestjs-generate-documentation`.
