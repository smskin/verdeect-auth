# Changelog

Все заметные изменения `@verdeect/auth`. Формат — [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), версии — [Semantic Versioning](https://semver.org/lang/ru/). У мажорной версии есть раздел «Как обновиться».

## [Unreleased]

## [1.0.1] - 2026-10-22

Первый выпуск из CI через npm Trusted Publishing (OIDC) с provenance. Изменений API и поведения нет.

## [1.0.0] - 2026-10-22

Вынос из `verdeect-identity` без изменения поведения, новое имя `@verdeect/auth`, подпуть `testing` закрыт для production.

### Added

- `@verdeect/auth`: `createVerifier`, `VerifyError`; типы `TokenKind`, `TrustedIssuer`, `VerifierOptions`, `UserPrincipal`, `ServicePrincipal`, `AgentPrincipal`, `Principal`, `Verifier`, `VerifyReason`, `VerifyRule`.
- `@verdeect/auth/nest`: `VerdeectAuthModule`, `VerdeectAuthGuard`, `VERDEECT_VERIFIER`, `RequireTenant`, `RequireScope`, `RequireUser`, `RequireService`, `principalOf`; типы `PrincipalCarrier`, `VerdeectAuthModuleOptions`, `VerdeectAuthAsyncOptions`.
- `@verdeect/auth/testing`: `createTestSigner`, `tokenVectors`, `TEST_IDENTITY_ISS`, `TEST_ORCHESTRATOR_ISS`, `TEST_RESOURCE`; типы `Claims`, `Header`, `TestSigner`, `TestSignerOptions`, `TokenVector`, `VectorExpectation`, `VectorSigners`.
- TSDoc у каждого публичного экспорта.
- Документация: README, `docs/getting-started.md`, `docs/nestjs.md`, `docs/testing.md`, `docs/errors.md`, `docs/releasing.md`.

### Changed

- Пути импорта: `verdeect-auth` → `@verdeect/auth`, `verdeect-auth/nest` → `@verdeect/auth/nest`, `verdeect-auth/testing` → `@verdeect/auth/testing`.
- Пакет собирается в `dist/` (ESM `.js` и `.d.ts`); исходники в архив не входят.
- `@verdeect/auth/testing` грузится только с условием `development` (Vitest — по умолчанию, Node — `--conditions=development`); в production импорт падает с `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- Минимальная версия Node — 22.12.

### Как обновиться

Переход с workspace-пакета `verdeect-auth`: установить `@verdeect/auth@1.0.0 --save-exact` и заменить пути импорта. Поведение правил V-1…V-8, `Principal`, ответы guard'а и тестовые векторы не изменились.
