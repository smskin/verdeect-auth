# Архитектура: Layered Architecture (библиотека «ядро + адаптеры»)

## Обзор

`@verdeect/auth` — небольшая библиотека с одним ограниченным контекстом: проверка токена `at+jwt`. Модулей, данных, транзакций и сетевых границ у неё нет, поэтому подходит самый простой паттерн — **слоистая архитектура**. Слои совпадают с тремя точками входа пакета (`exports`): ядро внизу, адаптер NestJS и тестовые помощники над ним. Зависимости направлены только вниз, к ядру.

Общие правила `nestjs-specialist` действуют: TypeScript `strict`, ESM с суффиксом `.js`, именование (§10), стиль, Vitest, ID критериев в именах тестов. **Не действуют** слои сервиса: `modules/`, `use-cases/`, `actions/`, `repositories/`, `schema/`, outbox, RLS, `RequestContext`, `nestjs-pino`, `@nestjs/config`, zod, Docker, GlitchTip. Компоненты библиотеки создаются через `nestjs-code generic <path>` с обоснованием «компонент библиотеки, не сервиса».

## Обоснование выбора

- **Тип проекта:** npm-библиотека, публичный пакет; поведение заморожено контрактом PRD Identity §7.5.
- **Стек:** TypeScript (ESM, Node ≥ 22.12), `jose`, NestJS 12 как необязательная peer-зависимость, Vitest, pnpm.
- **Ключевой фактор:** граница между слоями — это граница **установки и загрузки**, а не только кода. Ядро должно работать без `@nestjs/*` (AC-2). `testing` не должен попасть в production (FR-2, BR-4, AC-1). Нужна жёсткая однонаправленность импортов, а не богатая доменная модель.
- **Отвергнуто:** Structured Modules и Explicit Architecture — один контекст из ~8 файлов, порты и модули добавили бы только церемонии. Отдельный пакет `@verdeect/auth-testing` отвергнут в D-6.

## Структура каталогов

```
verdeect-auth/
├── src/
│   ├── index.ts                    # "."  — публичные типы ядра + реэкспорт значений
│   ├── verifier.ts                 # ядро: createVerifier, V-1…V-5, кэш JWKS
│   ├── principal.ts                # ядро: V-6…V-8, toPrincipal (внутренний)
│   ├── verify-error.ts             # ядро: VerifyError, VerifyRule, VerifyReason
│   ├── *.spec.ts                   # unit-тесты ядра (рядом с кодом)
│   ├── nest/                       # "./nest" — адаптер NestJS
│   │   ├── index.ts                #   список реэкспортов
│   │   ├── verdeect-auth.module.ts #   динамический модуль, VERDEECT_VERIFIER
│   │   ├── verdeect-auth.guard.ts  #   guard: 401 → 403 → 409 → 403, логи
│   │   ├── decorators.ts           #   Require*, principalOf, ключи метаданных
│   │   └── *.spec.ts               #   HTTP-тесты guard'а (Fastify)
│   └── testing/                    # "./testing" — только условие development
│       ├── index.ts
│       ├── test-signer.ts          #   createTestSigner: Ed25519 в памяти, JWKS на 127.0.0.1
│       └── vectors.ts              #   tokenVectors V-1…V-8
├── tests/
│   ├── consumer/                   # шаблон проекта-потребителя (FR-8, AC-1–AC-3, AC-7)
│   └── package/*.spec.ts           # проверки пакета: архив, потребитель, выпуск, exports, docs (AC-1–AC-11)
├── docs/                           # руководства (FR-9): getting-started, nestjs, testing, errors, releasing
├── dist/                           # результат tsc (в git не попадает): *.js + *.d.ts
├── requirements/                   # PRD (в архив не попадает)
├── package.json                    # exports, files, peer-зависимости
├── tsconfig.json                   # автономный, без extends наружу (FR-6)
├── tsconfig.build.json             # сборка src → dist без spec
├── vitest.config.ts
├── eslint.config.js                # flat config + TSDoc публичного API
├── Makefile                        # install, lint, analyse, test, build, pack-check, ci, clean
├── .github/workflows/ci.yml        # lint → test (Node 22, 24) → build → publish (по тегу)
├── scripts/publish.mjs             # публикация из CI: тег = version, версии нет в npm
├── README.md
└── CHANGELOG.md
```

`tests/`, `docs/`, `scripts/`, `eslint.config.js`, `Makefile`, `.github/workflows/ci.yml`, `CHANGELOG.md` появляются на этапах E1–E2. Пустые каталоги заранее не создаются.

## Правила зависимостей

```
           ┌──────────────┐        ┌──────────────────┐
           │  ./nest      │        │  ./testing        │
           │  @nestjs/*   │        │  jose, node:*     │
           └──────┬───────┘        └────────┬─────────┘
                  │  (значения и типы)      │ (типы; значения — только ядра)
                  ▼                         ▼
           ┌─────────────────────────────────────────┐
           │  "." ядро — только jose                  │
           └─────────────────────────────────────────┘
```

- ✅ `src/nest/**` → `src/*.ts` (ядро) и `@nestjs/common`, `@nestjs/core`, `jose`.
- ✅ `src/testing/**` → `src/*.ts` (ядро), `jose`, `node:*`.
- ✅ Ядро (`src/*.ts`) → `jose`, `node:*`, другие файлы ядра.
- ❌ Ядро → `@nestjs/*`, `rxjs`, `reflect-metadata`, `src/nest/`, `src/testing/` (AC-2).
- ❌ `src/nest/` → `src/testing/` и наоборот (BR-4: `testing` не должен попасть в production-граф).
- ❌ Импорт по имени собственного пакета (`@verdeect/auth/...`) внутри `src/` — только относительные пути с `.js`.
- ❌ Новые runtime-зависимости в `dependencies` без решения: пакет приносит потребителю только `jose`.
- ✅ Тесты (`*.spec.ts`) могут импортировать любой слой, включая `testing`.

Правила проверяются тестами пакета: AC-1 (нет импорта `testing` в `dist/index.js` и `dist/nest/**`), AC-2 (ядро грузится без peer-зависимостей).

## Взаимодействие слоёв

- **Публичная поверхность** каждого слоя — его `index.ts` с явным списком `export { … }` / `export type`. Всё, чего нет в `index.ts`, внутреннее (`toPrincipal`, `REQUIRE_*`). Список экспортов зафиксирован таблицей PRD §8 и тестом AC-9.
- **Ядро → потребитель:** `createVerifier(options)` возвращает объект `Verifier` с методом `verify(jwt)`. Отказ — исключение `VerifyError`, ошибка JWKS — исходное исключение.
- **NestJS-адаптер → ядро:** модуль строит `Verifier` через `createVerifier` и кладёт его в DI под `VERDEECT_VERIFIER`. Guard получает его через `@Inject` и переводит `VerifyError` в HTTP-ответ. Декораторы общаются с guard'ом только через метаданные `Reflector`.
- **Testing → ядро:** `createTestSigner` отдаёт готовый `TrustedIssuer` (`signer.issuer`) для `createVerifier`. Других связей нет.
- **Сборка и загрузка:** `exports` в `package.json` ведёт `"."` и `"./nest"` на `dist` (`types` + `default`). `"./testing"` — `types` + `development` без `default` (D-6). Условий `development → src` в опубликованном пакете нет.

## Ключевые принципы

1. **Контракт заморожен.** V-1…V-8, поля `Principal`, коды и статусы guard'а, сигнатуры экспортов меняются только мажорной версией (BR-1). Перенос из Identity — без изменения поведения (FR-5).
2. **Ядро без фреймворка и без логов.** Ядро сообщает о результате значением или исключением. Решения о логах и HTTP принимает адаптер.
3. **Сбой инфраструктуры ≠ отказ токена.** Ошибка JWKS не становится `VerifyError`, клиент получает 500, а не 401.
4. **Ошибка конфигурации — громко и рано:** `Error('verdeect-auth: …')` при создании verifier'а или объявлении декоратора.
5. **Минимум в архиве и в зависимостях:** только `dist/**/*.{js,d.ts}`, README, CHANGELOG. Nest — peer `optional`.
6. **Без секретов и окружений:** URL издателей и `resource` передаёт потребитель. В пакете только тестовые константы `TEST_*` внутри `testing` (BR-3).
7. **TSDoc у каждого публичного экспорта** — это документация для IDE потребителя через `.d.ts` (AC-9).

## Организация кода

- **Новый код** следует этому документу.
- **Существующий код** (перенесён из Identity) уже соответствует структуре. Меняются только конфигурация и пути импорта (FR-5, FR-6). Рефакторинг ради стиля без требования не делается: это изменение поведения «по касательной».
- **Компоненты** создаются через `nestjs-code generic <path>`: ядро, guard, модуль, декораторы, помощники `testing`, тесты пакета.

## Примеры кода

### Ядро: только `jose`, отказ — `VerifyError`

```ts
// src/verifier.ts
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { toPrincipal } from './principal.js';
import { VerifyError } from './verify-error.js';
import type { Principal, Verifier, VerifierOptions } from './index.js';

/** Создаёт проверяющий; неверные параметры — Error при создании (ошибка конфигурации). */
export function createVerifier(options: VerifierOptions): Verifier {
    if (options.issuers.length === 0) {
        throw new Error('verdeect-auth: issuers must not be empty');
    }
    // ...
    return {
        async verify(jwt: string): Promise<Principal> {
            const issuer = issuers.get(readIssuer(jwt));
            if (!issuer) {
                throw new VerifyError('V-2', 'issuer_unknown');
            }
            // ...
        },
    };
}
```

### Адаптер NestJS зависит от ядра, а не наоборот

```ts
// src/nest/verdeect-auth.guard.ts
import { Inject, Injectable, Logger, type CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { VerifyError } from '../verify-error.js'; // ✅ nest → ядро
import type { Verifier } from '../index.js';
// import { createTestSigner } from '../testing/index.js'; // ❌ BR-4

export const VERDEECT_VERIFIER = Symbol('VERDEECT_VERIFIER');

@Injectable()
export class VerdeectAuthGuard implements CanActivate {
    private readonly logger = new Logger(VerdeectAuthGuard.name);

    constructor(
        @Inject(VERDEECT_VERIFIER) private readonly verifier: Verifier,
        private readonly reflector: Reflector,
    ) {}
    // ...
}
```

### Точка входа — явный список экспортов

```ts
// src/nest/index.ts
export {
    principalOf,
    RequireScope,
    RequireService,
    RequireTenant,
    RequireUser,
    type PrincipalCarrier,
} from './decorators.js';
export { VERDEECT_VERIFIER, VerdeectAuthGuard } from './verdeect-auth.guard.js';
export {
    VerdeectAuthModule,
    type VerdeectAuthAsyncOptions,
    type VerdeectAuthModuleOptions,
} from './verdeect-auth.module.js';
```

### `testing` закрыт для production (FR-2, D-6)

```json
"exports": {
    ".":         { "types": "./dist/index.d.ts",         "default": "./dist/index.js" },
    "./nest":    { "types": "./dist/nest/index.d.ts",    "default": "./dist/nest/index.js" },
    "./testing": { "types": "./dist/testing/index.d.ts", "development": "./dist/testing/index.js" },
    "./package.json": "./package.json"
}
```

## Антипаттерны

- ❌ Импорт `@nestjs/*`, `rxjs` или `reflect-metadata` в ядре, даже ради типа: `import type` тоже ломает `.d.ts` у потребителя без Nest.
- ❌ Импорт `testing` из ядра или `nest`, а также `default` у `./testing` в `exports`.
- ❌ Логи, `console.*` или HTTP-коды в ядре.
- ❌ Превращение ошибки JWKS в `VerifyError` (401 вместо 500).
- ❌ Раскрытие причины отказа клиенту или запись токена и `Authorization` в лог.
- ❌ Изменение правил, полей `Principal`, кодов ответа или имён экспортов в минорной или патч-версии.
- ❌ Новый публичный экспорт без TSDoc, записи в README и CHANGELOG (AC-9).
- ❌ Слои сервиса из `nestjs-specialist` (`modules/`, `use-cases/`, `repositories/`, `shared/`), zod, `@nestjs/config`, `nestjs-pino`, Docker.
- ❌ `extends` или ссылки `../../` на файлы Identity в конфигурации и документации (FR-6, AC-10).
- ❌ Jest, CommonJS, `require()`, source map в архиве.
