# @verdeect/auth

Проверка токенов доступа `at+jwt` для серверов ресурсов Вердикта 2.0. Каждый сервис `https://api.verdeect.ru` принимает токены только через эту библиотеку: ядро на `jose` проверяет правила V-1…V-8 и строит `Principal`, модуль NestJS даёт guard и декораторы, подпуть `testing` — подписчик с локальным JWKS и тестовые векторы.

## Совместимость

|             |                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| Node.js     | ≥ 22.12 (проверяется на 22 и 24; Node 20 не поддерживается)                                             |
| Модули      | только ESM (`import`), CommonJS-сборки нет                                                              |
| NestJS      | 12 — необязательная peer-зависимость, нужна только для `@verdeect/auth/nest`                            |
| Зависимости | `jose` (точная версия); `@nestjs/common`, `@nestjs/core`, `reflect-metadata`, `rxjs` — peer, `optional` |

## Установка

Ставьте точную версию: потребители пинят её, обновление — осознанный шаг по CHANGELOG.

```bash
pnpm add @verdeect/auth@1.0.1 --save-exact
# или
npm install @verdeect/auth@1.0.1 --save-exact
```

## Быстрый старт

### Без NestJS (скрипт, воркер)

```ts
import { createVerifier, VerifyError } from '@verdeect/auth';

const verifier = createVerifier({
  issuers: [
    { iss: 'https://id.verdeect.ru', jwksUri: 'https://id.verdeect.ru/oidc/jwks' },
    { iss: 'https://orchestrator.verdeect.internal', jwksUri: '…', kinds: ['agent'] },
  ],
  resource: 'https://api.verdeect.ru',
  clockToleranceSec: 30,
});

try {
  const principal = await verifier.verify(jwt);
} catch (error) {
  if (error instanceof VerifyError) {
    // токен отклонён: error.rule, error.reason
  }
  throw error;
}
```

| Параметр            | Значение                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `issuers[].iss`     | издатель; повтор `iss` — ошибка конфигурации                                                                  |
| `issuers[].jwksUri` | JWKS издателя; один кэш на издателя                                                                           |
| `issuers[].kinds`   | какие виды токенов издатель вправе выпускать; по умолчанию `['user', 'service']` (Orchestrator — `['agent']`) |
| `resource`          | `aud` токена обязан его содержать                                                                             |
| `clockToleranceSec` | допуск часов для `exp`/`iat`, по умолчанию 30                                                                 |

Пустой список издателей, пустой `resource` или повтор `iss` — исключение с префиксом `verdeect-auth:` при создании.

### С NestJS

Модуль регистрируется **один раз в корневом модуле** и по умолчанию глобальный: один verifier и один кэш JWKS на приложение.

```ts
import { Controller, Module, Post, UseGuards } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RequireScope, VerdeectAuthGuard, VerdeectAuthModule } from '@verdeect/auth/nest';

@Module({
  imports: [
    ConfigModule.forRoot(),
    VerdeectAuthModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        issuers: [
          {
            iss: config.getOrThrow('AUTH_IDENTITY_ISS'),
            jwksUri: config.getOrThrow('AUTH_IDENTITY_JWKS_URI'),
          },
        ],
        resource: config.getOrThrow('AUTH_RESOURCE'),
      }),
    }),
    OrganizationsModule,
  ],
})
class AppModule {}

@Controller('api/organizations')
@UseGuards(VerdeectAuthGuard)
class CreateOrganizationController {
  @Post()
  @RequireScope('identity:organizations.manage')
  handle() {}
}
```

Guard на каждом маршруте без `@UseGuards` — через `APP_GUARD` (тогда все маршруты без токена получают 401):

```ts
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [VerdeectAuthModule.forRoot({ issuers: […], resource: 'https://api.verdeect.ru' })],
    providers: [{ provide: APP_GUARD, useExisting: VerdeectAuthGuard }],
})
class AppModule {}
```

Пошагово — [docs/getting-started.md](docs/getting-started.md), подробности модуля — [docs/nestjs.md](docs/nestjs.md).

## Правила V-1…V-8

| Правило | Проверка                                                                                                                                   | `reason` при отказе                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| V-1     | `typ = at+jwt` (допускается `application/at+jwt`), `alg = EdDSA`, есть `kid`                                                               | `typ_mismatch`, `alg_not_allowed`, `kid_missing`, `malformed`          |
| V-2     | `iss` из `issuers` (неизвестный — без сетевого запроса), подпись по JWKS этого издателя                                                    | `issuer_unknown`, `signature_invalid`                                  |
| V-3     | неизвестный `kid` → JWKS перечитывается не чаще раза в 60 с                                                                                | `kid_unknown`                                                          |
| V-4     | `exp` и `iat` обязательны, с допуском; `iat` из будущего больше допуска — отказ                                                            | `exp_missing`, `iat_missing`, `expired`, `iat_in_future`, `not_before` |
| V-5     | `aud` (строка или список) содержит `resource`                                                                                              | `audience_mismatch`                                                    |
| V-6     | вид: `act = agent` → agent; иначе `sub = client_id` без `sid` → service; есть `sid` и `client_id` → user; вид вне `kinds` издателя — отказ | `kind_unresolved`, `kind_not_allowed`, `malformed`                     |
| V-7     | агент: обязательны `sub`, `tenant`, `tenant_id`, `asid`, `prof`, `pep` (целое); `wid` — строка или `null`                                  | `agent_claim_missing`, `pep_not_integer`                               |
| V-8     | `tenant` ⇔ `tenant_id`: оба заданы или оба отсутствуют                                                                                     | `tenant_pair_broken`                                                   |

Отказ — `VerifyError` с полями `rule` (`V-1`…`V-8`) и `reason`. Сбой загрузки JWKS (сеть, таймаут, не-JSON) — **не** `VerifyError`: исходная ошибка пробрасывается, приложение отвечает 500, а не выбрасывает пользователей 401. Подробнее — [docs/errors.md](docs/errors.md).

## `Principal`

| `kind`    | Поля                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `user`    | `sub`, `clientId`, `sid`, `scopes`, `tenant \| null`, `tenantId \| null`                                             |
| `service` | `sub` (= `clientId`), `clientId`, `scopes`; `tenant` не переносится                                                  |
| `agent`   | `sub`, `clientId \| null`, `scopes` (пустой без `scope`), `tenant`, `tenantId`, `asid`, `wid \| null`, `prof`, `pep` |

Ролей в `Principal` нет: посторонние claim'ы (`roles`, `entitlements`) игнорируются.

## NestJS

- `VerdeectAuthModule.forRoot(options, {isGlobal?})` / `forRootAsync({imports, inject, useFactory, isGlobal?})` регистрирует verifier под токеном `VERDEECT_VERIFIER` и `VerdeectAuthGuard`. `isGlobal` по умолчанию `true`; `false` — только для изоляции, тогда у каждого импорта свой кэш JWKS.
- Guard кладёт `Principal` в `request.principal`; читать — `principalOf(request)`.
- Декораторы применимы к методу и классу; метод перекрывает класс. `@RequireScope()` без областей — ошибка при объявлении; `@RequireUser()` вместе с `@RequireService()` на маршруте — ошибка конфигурации (500).

Порядок проверок и ответы (`{error: {code, message, details}}` по соглашению об ответах API Вердикта):

| Шаг | Условие                                            | Ответ                                                  |
| --- | -------------------------------------------------- | ------------------------------------------------------ |
| 1   | нет заголовка, не `Bearer`, `VerifyError`          | 401 `UNAUTHENTICATED` (причина не раскрывается)        |
| 2   | `@RequireUser()` — не user                         | 403 `USER_TOKEN_REQUIRED`                              |
| 2   | `@RequireService()` — не service                   | 403 `FORBIDDEN`                                        |
| 3   | `@RequireTenant()` — нет `tenant` (service всегда) | 409 `TENANT_REQUIRED`                                  |
| 4   | `@RequireScope(...)` — нет хотя бы одной области   | 403 `SCOPE_REQUIRED`, `details.required` — недостающие |

## Логи

Логирует только guard — через `Logger` Nest с контекстом `VerdeectAuthGuard`:

- WARN — отказ проверки токена: `rule`, `reason`, `iss`, `kid`;
- DEBUG — истёкший токен, запрос без токена, решения декораторов (`kind`, `sub`, `clientId`).

Токен, заголовок `Authorization`, email и имена не пишутся; `iss` и `kid` обрезаются до 256 символов. Ядро и `testing` не логируют.

## Тесты

Подпуть `@verdeect/auth/testing` — для тестов сервиса без Identity:

```ts
import { createVerifier } from '@verdeect/auth';
import { createTestSigner, TEST_RESOURCE, tokenVectors } from '@verdeect/auth/testing';

const identity = await createTestSigner(); // iss https://id.verdeect.ru, kinds user, service
const verifier = createVerifier({ issuers: [identity.issuer], resource: TEST_RESOURCE });
const token = await identity.userToken({ tenant: 'acme', tenant_id: 'org_acme' });
await identity.close();
```

Код подпути грузится только с условием `development`: Vitest ставит его по умолчанию, в Node — `node --conditions=development`. В production импорт падает с `ERR_PACKAGE_PATH_NOT_EXPORTED`, поэтому тестовый подписчик туда не попадёт. Методы подписчика и векторы V-1…V-8 — [docs/testing.md](docs/testing.md).

## Чего библиотека не делает

- Ролей и прав не знает: права — Platform `authz/check` в сервисе после guard'ов.
- Актуальность `pep` агента не проверяет — это делает сервис.
- Токены не выпускает и не обменивает.

## API

| Подпуть                  | Значения                                                                                                                                        | Типы                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@verdeect/auth`         | `createVerifier`, `VerifyError`                                                                                                                 | `TokenKind`, `TrustedIssuer`, `VerifierOptions`, `UserPrincipal`, `ServicePrincipal`, `AgentPrincipal`, `Principal`, `Verifier`, `VerifyReason`, `VerifyRule` |
| `@verdeect/auth/nest`    | `VerdeectAuthModule`, `VerdeectAuthGuard`, `VERDEECT_VERIFIER`, `RequireTenant`, `RequireScope`, `RequireUser`, `RequireService`, `principalOf` | `PrincipalCarrier`, `VerdeectAuthModuleOptions`, `VerdeectAuthAsyncOptions`                                                                                   |
| `@verdeect/auth/testing` | `createTestSigner`, `tokenVectors`, `TEST_IDENTITY_ISS`, `TEST_ORCHESTRATOR_ISS`, `TEST_RESOURCE`                                               | `Claims`, `Header`, `TestSigner`, `TestSignerOptions`, `TokenVector`, `VectorExpectation`, `VectorSigners`                                                    |

У каждого экспорта есть TSDoc — описание видно в подсказках редактора.

## Документация

- [docs/getting-started.md](docs/getting-started.md) — подключение к новому сервису NestJS
- [docs/nestjs.md](docs/nestjs.md) — модуль, guard, декораторы, маршруты без токена
- [docs/testing.md](docs/testing.md) — `createTestSigner`, векторы, условие `development`
- [docs/errors.md](docs/errors.md) — `VerifyError`, ответы клиенту, логи, сбой JWKS
- [docs/releasing.md](docs/releasing.md) — выпуск версии (для мейнтейнеров)
- [CHANGELOG.md](CHANGELOG.md) — изменения по версиям

## Версионирование

[Semver](https://semver.org/lang/ru/). Мажорная версия — при любом ломающем изменении контракта:

- правило V-1…V-8 или код `reason`;
- поле `Principal`;
- код или статус ответа guard'а;
- сигнатура или удаление экспорта;
- поднятие минимальной версии Node или NestJS.

Пинайте версию точно (`--save-exact`) и обновляйтесь по [CHANGELOG.md](CHANGELOG.md): у мажорной версии там есть раздел «Как обновиться».

## Разработка

```bash
make help   # список целей
make ci     # lint analyse test build pack-check — то же, что в CI
```

## Лицензия

`UNLICENSED` — все права защищены: код открыт для чтения, но не передаётся по лицензии.
