# Roadmap проекта

> Библиотека `@verdeect/auth` — общая проверка токенов `at+jwt` для всех сервисов Вердикта 2.0. С E3 пакет называется `@verdeect-v3/auth`.

## Этапы

- [x] **E1 Автономный пакет** — перенос кода с историей; настройки без ссылок на Identity (FR-6); `package.json` и `exports` с закрытым `testing` (FR-1, FR-2); `.d.ts` (FR-3); peer-зависимости (FR-4); перенос тестов без изменения поведения (FR-5); проверки пакета и проект-потребитель (FR-7, FR-8); BR-3, BR-4; EC-1–EC-3. Makefile и CI — нет (после этапа, 5.1a) · requirements/0000-verdeect-auth · UC-1, UC-2, UC-4, AC-1–AC-7
- [x] **E2 Документация и выпуск** — README, `docs/*`, TSDoc публичного API, `AGENTS.md` (FR-9); CHANGELOG и порядок выпуска (FR-12); проверка Makefile и CI, сгенерированных в 5.1a, на FR-10, FR-11 (доработка, если не хватает); BR-1, BR-2 · requirements/0000-verdeect-auth · UC-3, AC-8–AC-11
- [ ] **E3 Переезд в GitLab** — перенос репозитория в GitLab с историей и тегами (FR-13); имя `@verdeect-v3/auth` (FR-1, FR-15); GitLab CI с публикацией по тегу токеном задания, удаление `.github/` (FR-11); README и `docs/` — установка из GitLab и выпуск (FR-14, §9); CHANGELOG 2.0.0 (FR-12); BR-5; D-9–D-14 · requirements/0000-verdeect-auth · UC-5; UC-1 и UC-3 — в редакции версии 1.1, AC-8 (новая редакция), AC-10 и AC-11 (дополнения версии 1.1), AC-12–AC-17

## Завершено

| Этап | Дата |
|------|------|
| E1 Автономный пакет | 2026-10-22 |
| E2 Документация и выпуск | 2026-10-22 |

## Requirements Map

| Этап | Пакет | UC | AC | Зависит от |
|------|-------|----|----|------------|
| E1 Автономный пакет | requirements/0000-verdeect-auth | UC-1, UC-2, UC-4 | AC-1–AC-7 | — |
| E2 Документация и выпуск | requirements/0000-verdeect-auth | UC-3 | AC-8–AC-11 | E1 |
| E3 Переезд в GitLab | requirements/0000-verdeect-auth | UC-5; UC-1 и UC-3 — в редакции версии 1.1 | AC-8 (новая редакция), AC-10 и AC-11 (дополнения версии 1.1), AC-12–AC-17 | E2 |
