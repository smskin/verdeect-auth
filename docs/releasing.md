# Выпуск версии

[← README](../README.md)

Документ для мейнтейнеров. Пакет публикует только CI по защищённому тегу; ручная публикация с машины разработчика — не способ выпуска.

## UC-3: выпуск по шагам

1. **`main` зелёный.** Изменения влиты, локально проходит `make ci`.
2. **Повысить `version`** в `package.json` по semver (см. ниже).
3. **Дописать раздел версии в `CHANGELOG.md`**: перенести пункты из `## [Unreleased]` в `## [X.Y.Z] - ГГГГ-ММ-ДД` с датой выпуска. Новый экспорт — строка в `### Added` и в таблице «API» README.
4. **Коммит и тег:**

   ```bash
   git commit -am "chore(release): vX.Y.Z"
   git tag vX.Y.Z
   git push origin main
   git push origin vX.Y.Z
   ```

5. **CI** прогоняет `lint` → `test` (Node 22 и 24) → `build` (`make build pack-check`) → `publish` (Node 24, npm ≥ 11.15, Trusted Publishing — см. ниже). Job `publish` запускается только на тег `v<major>.<minor>.<patch>` и только после зелёных проверок.
6. **Проверить публикацию:**

   ```bash
   npm view @verdeect/auth@X.Y.Z version
   ```

## Что проверяет `publish` до публикации

`scripts/publish.mjs`:

| Проверка                                         | Если не прошла                                              |
| ------------------------------------------------ | ----------------------------------------------------------- |
| тег соответствует `v<major>.<minor>.<patch>`     | job падает                                                  |
| тег равен `v` + `version` из `package.json`      | job падает: «тег vX не совпадает с version Y»               |
| `npm view @verdeect/auth@<version>` — версии нет | job падает: «версия уже опубликована, перезапись запрещена» |
| `npm view` ответил ошибкой, отличной от E404     | job падает: без ответа реестра ничего не публикуется        |

Затем `npm publish --access public` из собранного в job `build` каталога `dist/`.

## Ошибки выпуска

- **Тег не совпадает с `version`.** Ничего не опубликовано. Удалить тег, исправить `version` или поставить правильный тег:

  ```bash
  git push origin :refs/tags/vX.Y.Z
  git tag -d vX.Y.Z
  ```

- **Версия уже есть в npm.** Ничего не перезаписано: версию в npm нельзя заменить даже после `unpublish`. Повысить `version`, дописать CHANGELOG, поставить новый тег.

## Semver (BR-1)

| Изменение                                         | Версия   |
| ------------------------------------------------- | -------- |
| правило V-1…V-8 или код `reason`                  | мажорная |
| поле `Principal`                                  | мажорная |
| код или статус ответа guard'а                     | мажорная |
| сигнатура или удаление экспорта                   | мажорная |
| поднятие минимальной версии Node или NestJS       | мажорная |
| новый экспорт, новая необязательная опция         | минорная |
| исправление без изменения контракта, документация | патч     |

Мажорная версия (UC-3 alt-1): в разделе версии CHANGELOG обязателен подраздел `### Как обновиться` — что изменилось и что сделать потребителю.

## Авторизация в npm: Trusted Publishing

Пакет публикуется через npm Trusted Publishing (OIDC): job `publish` получает от GitHub короткоживущий `id-token` (`permissions: id-token: write`) и обменивает его в npm на токен публикации. Долгоживущего токена в репозитории нет. Требования: GitHub-hosted runner, npm ≥ 11.15 (job ставит его сам: `npm install -g npm@^11.15.0`), environment `npm`.

npm сначала пробует OIDC и только потом `NODE_AUTH_TOKEN`. Workflow передаёт `NODE_AUTH_TOKEN` из секрета `NPM_TOKEN`, но не требует его: пустое значение — норма.

### Разовая настройка GitHub

| Что                | Где                         | Значение                                                       |
| ------------------ | --------------------------- | -------------------------------------------------------------- |
| environment `npm`  | Settings → Environments     | правило развёртывания: только теги `v*`                        |
| ruleset тегов `v*` | Settings → Rules → Rulesets | создание — только мейнтейнеры; удаление и перезапись запрещены |

### Первый выпуск (1.0.0) — с временным токеном

Trusted Publisher настраивается только для пакета, который уже есть в npm, поэтому 1.0.0 публикуется токеном:

1. На npmjs.com создать granular access token: право публикации только в scope `@verdeect`, срок действия не больше 1 дня (D-8).
2. Положить его в секрет `NPM_TOKEN` environment `npm` (Settings → Environments → `npm` → Secrets).
3. Выпустить 1.0.0 по шагам UC-3 выше.

### После первого выпуска — переход на OIDC

1. Связать пакет с workflow (нужны npm ≥ 11.15, 2FA на аккаунте и право записи в пакет):

   ```bash
   npm trust github @verdeect/auth --repo smskin/verdeect-auth --file ci.yml --env npm --allow-publish
   ```

   Параметры доверия: репозиторий `smskin/verdeect-auth`, файл workflow `ci.yml`, environment `npm`, разрешение `--allow-publish`. Имена флагов сверьте с `npm trust github --help` — их задаёт npm CLI. То же можно сделать на странице пакета: Settings → Trusted Publisher.

2. Запретить публикацию токенами: страница пакета → Settings → Publishing access → «Require two-factor authentication and disallow tokens».
3. Удалить секрет `NPM_TOKEN` из environment `npm` и отозвать токен на npmjs.com.
4. Следующий выпуск идёт через OIDC; в логе `[publish]` будет «запасной NODE_AUTH_TOKEN не задан».

Если Trusted Publisher не совпадает с запуском (другой репозиторий, файл workflow или environment), `npm publish` падает с E404 — проверьте параметры из шага 1.

Секреты GitHub маскирует в логах, скрипт публикации токен не печатает — только факт его наличия.

## Где смотреть логи публикации

Actions → запуск для тега → job `publish` → шаг `publish`. Строки с префиксом `[publish]`: тег, `version`, результат `npm view`, решение, способ авторизации и команда `npm publish`. Причина падения — последняя строка `[publish]` в stderr.

См. также [CHANGELOG.md](../CHANGELOG.md).
