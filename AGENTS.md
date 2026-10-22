# AGENTS.md

> Карта репозитория для ИИ-агентов и новых разработчиков. Обновляйте при заметных изменениях структуры. Раздел «Документация» ведёт `/aif-docs`.

## Обзор проекта

`@verdeect/auth` — npm-библиотека проверки токенов `at+jwt` для серверов ресурсов Вердикта 2.0: ядро на `jose`, модуль NestJS (guard и декораторы), тестовые помощники. Подробности — `.ai-factory/DESCRIPTION.md`.

## Технологический стек

- **Язык:** TypeScript (ESM, Node ≥ 20)
- **Фреймворк:** NestJS 12 — необязательная peer-зависимость
- **JWT:** `jose`
- **Тесты:** Vitest + `unplugin-swc`
- **Пакетный менеджер:** pnpm
- **База данных / ORM / брокер / Docker:** нет (библиотека)

## Структура проекта

```
verdeect-auth/
├── src/                          # ядро — точка входа "."
│   ├── index.ts                  # публичные типы и реэкспорт createVerifier, VerifyError
│   ├── verifier.ts               # createVerifier: правила V-1…V-5, кэш JWKS
│   ├── principal.ts              # правила V-6…V-8, сборка Principal
│   ├── verify-error.ts           # VerifyError, VerifyRule, VerifyReason
│   ├── *.spec.ts                 # unit-тесты ядра
│   ├── nest/                     # адаптер NestJS — точка входа "./nest"
│   │   ├── index.ts
│   │   ├── verdeect-auth.module.ts   # VerdeectAuthModule.forRoot/forRootAsync
│   │   ├── verdeect-auth.guard.ts    # VerdeectAuthGuard, VERDEECT_VERIFIER
│   │   ├── decorators.ts             # Require*, principalOf
│   │   └── verdeect-auth.guard.spec.ts
│   └── testing/                  # тестовые помощники — точка входа "./testing"
│       ├── index.ts
│       ├── test-signer.ts        # createTestSigner, локальный JWKS
│       └── vectors.ts            # tokenVectors V-1…V-8
├── tests/
│   ├── package/                  # проверки архива и потребителя (pnpm test:package)
│   │   ├── tarball.spec.ts       # состав архива и package.json (AC-1, AC-4, FR-1–FR-4, BR-3)
│   │   ├── consumer.spec.ts      # установленный проект-потребитель (AC-1–AC-3, AC-7)
│   │   ├── quality.spec.ts       # publint, attw, перенесённые unit-тесты (AC-5, AC-6)
│   │   └── support/              # pack.ts, consumer-project.ts
│   └── consumer/                 # шаблоны проекта-потребителя
│       ├── core/                 # без NestJS: smoke.mjs
│       └── full/                 # NestJS 12: nest-smoke.mjs, src/*.ts, tsconfig NodeNext/bundler
├── requirements/                 # пакеты требований (PRD)
│   ├── INDEX.md
│   └── 0000-verdeect-auth/       # prd.md, README.md (этапы E1–E2)
├── .ai-factory/                  # контекст AI Factory
├── .claude/                      # скилы и агенты Claude Code
├── package.json                  # exports трёх подпутей, peer-зависимости
├── pnpm-workspace.yaml           # настройки pnpm (allowBuilds)
├── pnpm-lock.yaml
├── tsconfig.json                 # typecheck, автономный
├── tsconfig.build.json           # сборка в dist/ (.js + .d.ts)
├── eslint.config.js              # flat config
├── .prettierrc.json
├── .prettierignore
├── vitest.config.ts              # unit-контур
├── vitest.package.config.ts      # контур проверок пакета
└── Makefile                      # единая точка входа: make help, make ci
```

## Команды

```bash
make install     # зависимости по pnpm-lock.yaml
make lint        # ESLint + Prettier check
make analyse     # tsc --noEmit
make test        # unit-тесты; make test FILTER='V-2'
make build       # dist/ (.js + .d.ts)
make pack-check  # publint, attw esm-only, архив и проект-потребитель
make ci          # lint analyse test build pack-check
```

## Ключевые точки входа

| Файл                   | Назначение                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| `src/index.ts`         | `@verdeect/auth` — публичный контракт ядра                                                |
| `src/nest/index.ts`    | `@verdeect/auth/nest` — модуль, guard, декораторы                                         |
| `src/testing/index.ts` | `@verdeect/auth/testing` — подписчик и векторы (только условие `development`)             |
| `Makefile`             | единая точка входа для проверок и сборки (`make ci`)                                      |
| `package.json`         | `exports`, зависимости, скрипты `typecheck`, `lint`, `format:check`, `test`, `pack:check` |
| `tsconfig.build.json`  | сборка `tsc` в `dist/` без spec-файлов                                                    |
| `vitest.config.ts`     | конфигурация тестов                                                                       |

## Документация

| Документ | Путь                                        | Описание                                                                         |
| -------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| README   | `README.md`                                 | назначение, подключение, правила V-1…V-8, `Principal`, NestJS, тесты потребителя |
| PRD      | `requirements/0000-verdeect-auth/prd.md`    | требования к выносу и выпуску 1.0.0                                              |
| Этапы    | `requirements/0000-verdeect-auth/README.md` | E1 «Автономный пакет», E2 «Документация и выпуск»                                |

## Файлы контекста ИИ

| Файл                          | Назначение                                            |
| ----------------------------- | ----------------------------------------------------- |
| `AGENTS.md`                   | эта карта репозитория                                 |
| `.ai-factory/DESCRIPTION.md`  | описание проекта, стек, нефункциональные требования   |
| `.ai-factory/ARCHITECTURE.md` | архитектура, правила зависимостей между точками входа |
| `.ai-factory/rules/base.md`   | соглашения кода                                       |
| `.ai-factory/config.yaml`     | настройки AI Factory (язык, git)                      |

## Правила для агентов

- Не объединяйте shell-команды через `&&`, `||` или `;`. Каждая команда — отдельный вызов.
  - Неправильно: `git checkout main && git pull`
  - Правильно: сначала `git checkout main`, затем `git pull origin main`
- Поведение библиотеки (V-1…V-8, `Principal`, ответы guard'а, векторы) не меняется без мажорной версии (BR-1). Источник контракта — PRD Identity §7.5.
- Ядро (`src/*.ts`) не импортирует `@nestjs/*`, `rxjs`, `reflect-metadata` и `src/testing/`. `src/nest/` не импортирует `src/testing/` (BR-4).
- Для `.ts`-файлов используйте скилы `nestjs-specialist` и `nestjs-code` (тип `generic` для компонентов библиотеки).
