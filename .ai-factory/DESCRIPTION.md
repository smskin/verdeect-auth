# `@verdeect/auth` — библиотека проверки токенов Вердикта 2.0

## Обзор

npm-библиотека, которой каждый сервер ресурсов Вердикта 2.0 (`https://api.verdeect.ru`) проверяет access-токены `at+jwt`. Ядро на `jose` реализует правила V-1…V-8 и строит `Principal`. Модуль NestJS даёт guard и декораторы. Подпуть `testing` содержит тестовый подписчик с локальным JWKS и векторы токенов.

Код и тесты перенесены с историей из `verdeect-identity/packages/verdeect-auth` (workspace-пакет `verdeect-auth`, `private`, `0.0.0`). Цель — выпустить публичный пакет `@verdeect/auth` 1.0.0 на npmjs.com. **Контракт поведения не меняется**: правила V-1…V-8, `Principal`, guard'ы, коды ответов и тестовые векторы определены в PRD Identity §7.5 (AC-7.1–7.4).

Источник требований — `requirements/0000-verdeect-auth/prd.md` (FR-1…FR-12, BR-1…BR-4, AC-1…AC-11). Этапы: E1 «Автономный пакет», E2 «Документация и выпуск» (`requirements/0000-verdeect-auth/README.md`).

## Основные возможности

- `createVerifier(options)` (`@verdeect/auth`): проверка `typ`, `alg`, `kid`, издателя, подписи по JWKS с кэшем, `exp`/`iat`/`nbf`, `aud`, вида токена и обязательных claim'ов. Отказ — `VerifyError` с `rule` и `reason`. Сбой JWKS пробрасывается как есть.
- `Principal` трёх видов: `user`, `service`, `agent`.
- `@verdeect/auth/nest`: `VerdeectAuthModule.forRoot/forRootAsync` (глобальный по умолчанию), `VerdeectAuthGuard` (401 → 403 → 409 → 403), декораторы `RequireUser`, `RequireService`, `RequireTenant`, `RequireScope`, функция `principalOf(request)`.
- `@verdeect/auth/testing`: `createTestSigner`, `tokenVectors` и константы. Загружается только с условием `development` (Vitest — по умолчанию). В production импорт падает с `ERR_PACKAGE_PATH_NOT_EXPORTED`.

## Технологический стек

- **Язык:** TypeScript 5.9, `strict`, ESM (`"type": "module"`, `NodeNext`), цель ES2023
- **Рантайм:** Node.js ≥ 20 (CI: 20 и 22)
- **Фреймворк:** NestJS 12 — необязательная peer-зависимость (`@nestjs/common`, `@nestjs/core`, `reflect-metadata`, `rxjs`, все `optional`)
- **Криптография/JWT:** `jose` (единственная runtime-зависимость, точная версия)
- **Тесты:** Vitest + `unplugin-swc`; HTTP-тесты guard'а на `@nestjs/platform-fastify`; JWKS — локальный сервер `createTestSigner`
- **Пакетный менеджер:** pnpm (точные пины)
- **Проверки пакета:** `publint`, `@arethetypeswrong/cli` (`esm-only`), состав `npm pack --dry-run`, проект-потребитель `tests/consumer/`
- **Линт/формат:** ESLint (flat config, typescript-eslint, TSDoc-проверка публичного API) + Prettier
- **CI/выпуск:** Makefile + GitLab CI, `npm publish --access public` только по защищённому тегу `v<semver>`
- **База данных, ORM, брокер, Docker, GlitchTip:** нет. Это библиотека, а не сервис.

## Архитектурные заметки

- Три точки входа (`exports`): `.` (ядро, только `jose`), `./nest` (зависит от ядра и `@nestjs/*`), `./testing` (зависит от ядра и `jose`). Зависимости строго однонаправленные: ядро не импортирует `@nestjs/*`, `rxjs`, `reflect-metadata` и `testing`. `./nest` не импортирует `testing` (BR-4).
- Слоёв сервиса из `nestjs-specialist` (modules, use-cases, repositories, outbox, RLS) здесь нет. Действуют его общие правила: язык, ESM с суффиксом `.js`, именование, стиль кода, Vitest, ID критериев в именах тестов.
## Архитектура

Подробные правила архитектуры — `.ai-factory/ARCHITECTURE.md`.
Паттерн: Layered Architecture (библиотека «ядро + адаптеры»)

## Текущее состояние (после E1)

Пакет автономный: `@verdeect/auth` 1.0.0, `exports` из `dist`, `./testing` только с условием `development`, peer-зависимости `^` и `optional`, свой `tsconfig.json`, ESLint/Prettier, `pnpm-lock.yaml`. Проверки пакета — `pnpm pack:check` (publint, attw, `tests/package/`). Ещё нет: Makefile, `.gitlab-ci.yml`, `CHANGELOG.md`, `docs/` (E2).

## Нефункциональные требования

- **Безопасность:** в пакете нет секретов, URL окружений и бизнес-логики сверх контракта токена (BR-3). `testing` недоступен в production (FR-2, BR-4). Публикация только из CI с `NPM_TOKEN` (masked, protected).
- **Логи:** только guard, через `Logger` NestJS. В лог идут `sub`, `clientId`, `kind`, `kid`, `iss` (обрезка до 256 символов). Токен, `Authorization`, email и имена не пишутся. Ядро не логирует.
- **Ошибки:** клиент получает 401 без причины. Причина (`rule`, `reason`) остаётся в логе. Сбой JWKS даёт 500, а не 401. Ошибки конфигурации — исключение при старте.
- **Совместимость и версии:** semver (BR-1). Ломающее изменение контракта — только мажорная версия. Потребители пинят версию точно (BR-2).
- **Размер архива:** только `dist/**/*.{js,d.ts}`, `README.md`, `CHANGELOG.md`, `package.json` (AC-4).
- **Документация:** на русском (D-5). Идентификаторы и код — на английском.
