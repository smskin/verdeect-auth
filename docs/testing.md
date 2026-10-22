# Тесты сервиса: `@verdeect/auth/testing`

[← README](../README.md)

Подпуть даёт тестового издателя токенов с локальным JWKS и векторы правил V-1…V-8. Identity для тестов не нужен.

## Условие `development`

Код подпути грузится только с условием экспорта `development`:

| Где запускается              | Условие                         | `import('@verdeect/auth/testing')` |
| ---------------------------- | ------------------------------- | ---------------------------------- |
| Vitest (Vite)                | ставится по умолчанию           | работает без настройки             |
| Node                         | `node --conditions=development` | работает                           |
| Node без условия, production | —                               | `ERR_PACKAGE_PATH_NOT_EXPORTED`    |

Почему так: в `exports` у `./testing` нет `default`. Тестовый подписчик с локальным JWKS не может случайно оказаться в production-пути сервиса — импорт из рабочего кода упадёт при старте, а не будет тихо работать.

Типы подпути (`types`) видны всегда, поэтому `tsc --noEmit` для тестов проходит без настройки.

## `createTestSigner`

```ts
import { createTestSigner, TEST_ORCHESTRATOR_ISS } from '@verdeect/auth/testing';

const identity = await createTestSigner(); // iss https://id.verdeect.ru, kinds user, service
const orchestrator = await createTestSigner({ iss: TEST_ORCHESTRATOR_ISS, kinds: ['agent'] });
// … тесты …
await identity.close();
await orchestrator.close();
```

`TestSigner`:

| Член                             | Что делает                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| `issuer`                         | готовый `TrustedIssuer` (`iss`, `jwksUri` локального сервера, `kinds`) для конфигурации сервиса |
| `userToken(overrides?)`          | токен пользователя: `sub`, `client_id`, `sid`, `scope`; срок 5 минут                            |
| `serviceToken(overrides?)`       | сервисный токен: `sub = client_id`; срок 10 минут                                               |
| `agentToken(overrides?)`         | токен агента: `act = agent`, `tenant`, `tenant_id`, `asid`, `wid`, `prof`, `pep`                |
| `sign(claims, header?)`          | произвольный набор claim'ов; заголовок по умолчанию `at+jwt` / `EdDSA` / текущий `kid`          |
| `rotate()`                       | новый ключ становится текущим и публикуется в JWKS (старый остаётся)                            |
| `signWithUnpublishedKey(claims)` | подпись ключом с `kid`, которого нет в JWKS (V-3)                                               |
| `signWithForeignKey(claims)`     | чужая подпись с текущим `kid` (V-2)                                                             |
| `forge(header, claims)`          | произвольный заголовок (любой `alg`) и заведомо неверная подпись                                |
| `jwksRequests()`                 | сколько раз запрошен JWKS                                                                       |
| `close()`                        | останавливает сервер JWKS; повторный вызов — без ошибки                                         |

Переопределения claim'ов: значение заменяет поле, `undefined` убирает его.

```ts
await identity.userToken({ tenant: 'acme', tenant_id: 'org_acme', scope: 'projects:read' });
await identity.userToken({ sid: undefined }); // без sid — уже не токен пользователя
await identity.sign({ iss: identity.issuer.iss, sub: 'x' }, { typ: 'JWT' }); // V-1
```

Константы: `TEST_IDENTITY_ISS`, `TEST_ORCHESTRATOR_ISS`, `TEST_RESOURCE` (`https://api.verdeect.ru` — `aud` всех токенов подписчика).

## Тест маршрута сервиса

```ts
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { VerdeectAuthModule } from '@verdeect/auth/nest';
import { createTestSigner, TEST_RESOURCE, type TestSigner } from '@verdeect/auth/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('UC-1: список проектов', () => {
  let identity: TestSigner;
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    identity = await createTestSigner();
    const moduleRef = await Test.createTestingModule({
      imports: [
        VerdeectAuthModule.forRoot({ issuers: [identity.issuer], resource: TEST_RESOURCE }),
        ProjectsModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
    await identity.close();
  });

  it('AC-1: токен с областью projects:read — 200', async () => {
    const token = await identity.userToken({ scope: 'projects:read' });
    const response = await fetch(`${baseUrl}/api/projects`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
  });
});
```

## Векторы V-1…V-8

`tokenVectors` — готовые сценарии по всем правилам. У вектора есть `id`, `rule`, `title`, `token(signers)` и `expect`:

- `{ kind, fields? }` — токен должен быть принят;
- `{ rule, reason }` — токен должен быть отклонён.

Verifier для векторов: издатели `[identity.issuer, orchestrator.issuer]`, `resource` — `TEST_RESOURCE`, допуск часов 30 с. Через guard отклонённый вектор даёт 401, принятый — проходит дальше по декораторам маршрута.

```ts
import { tokenVectors } from '@verdeect/auth/testing';

it.each(tokenVectors)('$id: $title', async (vector) => {
  const token = await vector.token({ identity, orchestrator });
  const response = await fetch(`${baseUrl}/api/whoami`, {
    headers: { authorization: `Bearer ${token}` },
  });

  expect(response.status).toBe('rule' in vector.expect ? 401 : 200);
});
```
