# Базовые правила проекта

> Соглашения выведены из анализа кода (`src/`) и скила `nestjs-specialist`. Правьте при необходимости.

## Соглашения об именовании

- Файлы: kebab-case с суффиксом роли (`verdeect-auth.guard.ts`, `verdeect-auth.module.ts`, `verify-error.ts`, `test-signer.ts`). Тесты лежат рядом с кодом: `*.spec.ts`.
- Переменные и функции: camelCase, описательные (`createVerifier`, `principalOf`, `buildIssuers`).
- Константы модуля: SCREAMING_SNAKE (`DEFAULT_CLOCK_TOLERANCE_SEC`, `JWKS_COOLDOWN_MS`, `TEST_RESOURCE`). DI-токены — `Symbol('…')` с тем же именем (`VERDEECT_VERIFIER`).
- Классы и типы: PascalCase (`VerdeectAuthGuard`, `VerifyError`, `UserPrincipal`). Союзы строковых литералов вместо enum (`TokenKind`, `VerifyReason`).
- Декораторы NestJS: PascalCase-фабрики (`RequireScope(...)`).
- Коды причин отказа: snake_case строки (`issuer_unknown`). Номера правил: `V-1`…`V-8`.

## Структура модулей

- `src/` — ядро (`@verdeect/auth`): только `jose`. Без `@nestjs/*`, `rxjs`, `reflect-metadata`, без логов.
- `src/nest/` — адаптер NestJS (`@verdeect/auth/nest`): зависит от ядра.
- `src/testing/` — тестовые помощники (`@verdeect/auth/testing`): зависят от ядра. Их не импортируют ни `src/`, ни `src/nest/` (BR-4).
- Каждая точка входа — `index.ts` с явным списком реэкспортов (`export { … }`, `export type`). Публичные типы ядра объявлены в `src/index.ts`.
- ESM: относительные импорты с суффиксом `.js`. Типы — через `import type`.

## Обработка ошибок

- Отказ токена — только `VerifyError(rule, reason)`. Сообщение техническое, без значений claim'ов и токена.
- Ошибка конфигурации (пустой `issuers`, повтор `iss`, пустой `resource`, несовместимые декораторы) — `Error` с префиксом `verdeect-auth:`, выбрасывается при создании или первом вызове.
- Сбой загрузки JWKS не маскируется под `VerifyError`: пробрасывается как есть, guard отвечает 500.
- Guard переводит ошибки в `HttpException` с кодами `UNAUTHENTICATED`, `USER_TOKEN_REQUIRED`, `FORBIDDEN`, `TENANT_REQUIRED`, `SCOPE_REQUIRED`. Причина отказа клиенту не раскрывается.

## Поток управления

- Prefer flat, readable control flow over deeply nested conditionals. Use guard clauses, early `return`/`continue`, small named helper methods, or explicit classification logic when they make the code easier to follow. Handle edge cases and irrelevant branches early so the main path stays visible.
- Всегда фигурные скобки (`curly: all`), без однострочных `if`.

## Логирование

- Логирует только guard, через `new Logger(VerdeectAuthGuard.name)` из `@nestjs/common`. Ядро и `testing` не логируют.
- Разрешённые поля: `sub`, `clientId`, `kind`, `kid`, `iss` (недоверенные значения обрезаются до 256 символов). Запрещены токен, заголовок `Authorization`, email, имена.

## Тесты

- Vitest + `unplugin-swc` (`vitest.config.ts`), Jest не используется.
- Имена `describe`/`it` начинаются с ID критерия или сценария: `AC-7.4: …`, `UC-14: …`, `V-2: …`. ID AC-7.1–7.4 Identity в перенесённых тестах не меняются (FR-5). Новые тесты пакета ссылаются на AC-1…AC-11 этого PRD.
- JWKS — локальный сервер `createTestSigner`, без внешней сети и БД.

## Комментарии и документация в коде

- Первая строка файла — комментарий `//` с назначением и ссылками на требования (`prd.md §7.5`, `01 §5.3`, `UC-14`).
- TSDoc `/** … */` у каждого публичного экспорта и его полей (AC-9).
- Комментарии и документация на русском, идентификаторы на английском.

## Стиль кода

- Prettier: 4 пробела, одинарные кавычки, точки с запятой, ширина 100, висячие запятые.
- `readonly` у полей публичных интерфейсов и параметров конструктора. `any` запрещён.
- Версии зависимостей в `devDependencies` и `jose` — точные. Peer-зависимости — диапазоны `^` (FR-4).
