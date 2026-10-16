[Back to project README](../../README.md)

# verdeect-auth

> Проверка токенов доступа `at+jwt` для серверов ресурсов «Вердикта» (prd.md §7.5, `01` §5.3–5.4).

Ядро (`verdeect-auth`) — чистая функция на `jose` без Nest и инфраструктуры. Подпути: `verdeect-auth/nest` — guard и декораторы, `verdeect-auth/testing` — подписчик с mock JWKS и векторы. Пакет workspace; `exports` указывают на исходники `.ts` (сборка в JS — этап E6).

## Проверка токена

```ts
import { createVerifier, VerifyError } from 'verdeect-auth';

const verifier = createVerifier({
  issuers: [
    { iss: 'https://id.verdeect.ru', jwksUri: 'https://id.verdeect.ru/oidc/jwks' },
    { iss: 'https://orchestrator.verdeect.internal', jwksUri: '…', kinds: ['agent'] },
  ],
  resource: 'https://api.verdeect.ru',
  clockToleranceSec: 30,
});

const principal = await verifier.verify(jwt); // Principal или VerifyError
```

| Параметр            | Значение                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `issuers[].iss`     | издатель; повтор `iss` — ошибка конфигурации                                                                  |
| `issuers[].jwksUri` | JWKS издателя; один кэш на издателя                                                                           |
| `issuers[].kinds`   | какие виды токенов издатель вправе выпускать; по умолчанию `['user', 'service']` (Orchestrator — `['agent']`) |
| `resource`          | `aud` токена обязан его содержать                                                                             |
| `clockToleranceSec` | допуск часов для `exp`/`iat`, по умолчанию 30                                                                 |

Пустой список издателей, пустой `resource` или повтор `iss` — исключение при создании.

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

Отказ — `VerifyError` с полями `rule` (`V-1`…`V-8`) и `reason`. Сбой загрузки JWKS (сеть, таймаут, не-JSON) — **не** `VerifyError`: исходная ошибка пробрасывается, приложение отвечает 500, а не выбрасывает пользователей 401.

## `Principal`

| `kind`    | Поля                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `user`    | `sub`, `clientId`, `sid`, `scopes`, `tenant \| null`, `tenantId \| null`                                             |
| `service` | `sub` (= `clientId`), `clientId`, `scopes`; `tenant` не переносится                                                  |
| `agent`   | `sub`, `clientId \| null`, `scopes` (пустой без `scope`), `tenant`, `tenantId`, `asid`, `wid \| null`, `prof`, `pep` |

Ролей в `Principal` нет: посторонние claim'ы (`roles`, `entitlements`) игнорируются.

## NestJS

Модуль регистрируется **один раз в корневом модуле** и по умолчанию глобальный: один verifier и один кэш JWKS на приложение — окно V-3 (перечитывание ≤ раз в 60 с) действует на всё приложение, а функциональным модулям импортировать его не нужно.

```ts
import { Controller, Module, Post, UseGuards } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RequireScope, VerdeectAuthGuard, VerdeectAuthModule } from 'verdeect-auth/nest';

// Корень: регистрация verifier'а
@Module({
    imports: [
        ConfigModule.forRoot(),
        VerdeectAuthModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({ issuers: …, resource: 'https://api.verdeect.ru' }),
        }),
        OrganizationsModule,
    ],
})
class AppModule {}

// Функциональный модуль: VerdeectAuthModule не импортируется
@Controller('api/organizations')
@UseGuards(VerdeectAuthGuard)
class CreateOrganizationController {
    @Post()
    @RequireScope('identity:organizations.manage')
    handle() {}
}

@Module({ controllers: [CreateOrganizationController] })
class OrganizationsModule {}
```

Вариант с `APP_GUARD` — guard на каждом маршруте приложения без `@UseGuards` (маршруты без токена тогда получают 401, подходит, когда всё приложение — сервер ресурсов):

```ts
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [VerdeectAuthModule.forRoot({ issuers: […], resource: 'https://api.verdeect.ru' })],
    providers: [{ provide: APP_GUARD, useExisting: VerdeectAuthGuard }],
})
class AppModule {}
```

- `VerdeectAuthModule.forRoot(options, {isGlobal?})` / `forRootAsync({imports, inject, useFactory, isGlobal?})` регистрирует verifier под токеном `VERDEECT_VERIFIER` и `VerdeectAuthGuard`. `isGlobal` по умолчанию `true`; `false` — только для изоляции, тогда модуль импортируется туда, где стоит `@UseGuards`, и у каждого импорта свой кэш JWKS.
- Guard кладёт `Principal` в `request.principal`; читать — `principalOf(request)`.
- Декораторы применимы к методу и классу; метод перекрывает класс. `@RequireScope()` без областей — ошибка при объявлении; `@RequireUser()` вместе с `@RequireService()` на маршруте — ошибка конфигурации (500).

Порядок проверок и ответы (`{error: {code, message, details}}`, `01` §8):

| Шаг | Условие                                            | Ответ                                                  |
| --- | -------------------------------------------------- | ------------------------------------------------------ |
| 1   | нет заголовка, не `Bearer`, `VerifyError`          | 401 `UNAUTHENTICATED` (причина не раскрывается)        |
| 2   | `@RequireUser()` — не user                         | 403 `USER_TOKEN_REQUIRED`                              |
| 2   | `@RequireService()` — не service                   | 403 `FORBIDDEN`                                        |
| 3   | `@RequireTenant()` — нет `tenant` (service всегда) | 409 `TENANT_REQUIRED`                                  |
| 4   | `@RequireScope(...)` — нет хотя бы одной области   | 403 `SCOPE_REQUIRED`, `details.required` — недостающие |

Логи guard'а (`Logger` Nest, контекст `VerdeectAuthGuard`): WARN — отказ проверки (`rule`, `reason`, `iss`, `kid`), истёкший токен — DEBUG; решения декораторов — DEBUG. Токен, заголовок `Authorization`, email и имена не пишутся.

## Тесты потребителей: `verdeect-auth/testing`

```ts
import { createTestSigner, TEST_RESOURCE, tokenVectors } from 'verdeect-auth/testing';

const identity = await createTestSigner(); // iss https://id.verdeect.ru, kinds user, service
const issuer = identity.issuer; // TrustedIssuer с jwksUri локального сервера
const token = await identity.userToken({ tenant: 'acme', tenant_id: 'org_acme' });
await identity.close();
```

| Метод                                           | Назначение                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `userToken` / `serviceToken` / `agentToken`     | образцы prd.md §7.1, §7.2, `01` §5.4; claim'ы переопределяются, `undefined` убирает поле |
| `sign(claims, header?)`                         | произвольный набор, заголовок по умолчанию `at+jwt` / `EdDSA` / текущий `kid`            |
| `rotate()`                                      | новый ключ — текущий и опубликован в JWKS                                                |
| `signWithUnpublishedKey` / `signWithForeignKey` | неизвестный `kid` (V-3) / чужая подпись с тем же `kid` (V-2)                             |
| `forge(header, claims)`                         | произвольный `alg` и заведомо неверная подпись                                           |
| `jwksRequests()`                                | число запросов к JWKS                                                                    |

`tokenVectors` — векторы V-1…V-8 (`id`, `rule`, `title`, `token(signers)`, `expect`) для подписчиков Identity и Orchestrator (`kinds: ['agent']`).

## Чего библиотека не делает

- Ролей и прав не знает: права — Platform `authz/check` в сервисе после guard'ов (D9).
- Актуальность `pep` агента не проверяет — это делает сервис (`01` §6.4).

## Разработка

```bash
corepack pnpm --filter verdeect-auth test       # unit-тесты уровня L
corepack pnpm --filter verdeect-auth typecheck
```

## See Also

- [Разработка](../../docs/development.md) — тесты, Makefile
- [prd.md §7.5](../../requirements/0000-identity-server/prd.md) — требования к библиотеке
