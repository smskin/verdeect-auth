# Ошибки и отказы

[← README](../README.md)

## `VerifyError`

`verifier.verify(jwt)` отклоняет токен исключением `VerifyError`:

| Поле     | Тип             | Значение                        |
| -------- | --------------- | ------------------------------- |
| `rule`   | `VerifyRule`    | нарушенное правило, `V-1`…`V-8` |
| `reason` | `VerifyReason`  | стабильный машинный код причины |
| `name`   | `'VerifyError'` | —                               |

Сообщение техническое (`Token rejected: V-4 expired`): в нём нет значений claim'ов и самого токена.

| `reason`              | Правило       | Когда                                         |
| --------------------- | ------------- | --------------------------------------------- |
| `malformed`           | V-1, V-4, V-6 | токен не разбирается или claim неверного типа |
| `typ_mismatch`        | V-1           | `typ` не `at+jwt`                             |
| `alg_not_allowed`     | V-1           | `alg` не `EdDSA`                              |
| `kid_missing`         | V-1           | нет `kid`                                     |
| `issuer_unknown`      | V-2           | `iss` не из списка издателей                  |
| `signature_invalid`   | V-2           | подпись не сходится с ключом издателя         |
| `kid_unknown`         | V-3           | `kid` нет в JWKS и после перечитывания        |
| `expired`             | V-4           | истёк `exp`                                   |
| `exp_missing`         | V-4           | нет `exp`                                     |
| `iat_missing`         | V-4           | нет `iat`                                     |
| `iat_in_future`       | V-4           | `iat` из будущего больше допуска часов        |
| `not_before`          | V-4           | `nbf` ещё не наступил                         |
| `audience_mismatch`   | V-5           | `aud` не содержит `resource`                  |
| `kind_unresolved`     | V-6           | вид токена не определяется                    |
| `kind_not_allowed`    | V-6           | издатель не вправе выпускать этот вид         |
| `agent_claim_missing` | V-7           | у токена агента нет обязательного claim'а     |
| `pep_not_integer`     | V-7           | `pep` не целое                                |
| `tenant_pair_broken`  | V-8           | задан только один из `tenant` и `tenant_id`   |

## Что видит клиент

Guard переводит любой `VerifyError` в 401 без причины:

```json
{ "error": { "code": "UNAUTHENTICATED", "message": "Требуется вход", "details": {} } }
```

Клиент не узнаёт, какое правило не прошло: причина остаётся в логе сервиса.

## Что пишется в лог

| Событие                 | Уровень | Поля                           |
| ----------------------- | ------- | ------------------------------ |
| токен отклонён          | WARN    | `rule`, `reason`, `iss`, `kid` |
| токен истёк (`expired`) | DEBUG   | `rule`, `reason`, `iss`, `kid` |

Истечение — штатное событие при сроке токена 5 минут, поэтому оно не на WARN. Токен и заголовок `Authorization` в лог не попадают; `iss` и `kid` берутся из неподписанных частей токена и обрезаются до 256 символов.

## Сбой JWKS — 500, а не 401

Сбой загрузки ключей издателя (сеть, таймаут, ответ не JSON, не 200) — **не** `VerifyError`. Исходная ошибка пробрасывается из `verify()`, guard её не перехватывает, и приложение отвечает 500.

Почему: отказ инфраструктуры не должен выглядеть как «токен неверный». Иначе при недоступном JWKS все пользователи получили бы 401 и клиенты начали бы выходить из сессии, хотя их токены в порядке. 500 честно сообщает о сбое на стороне сервиса и попадает в мониторинг ошибок.

## Ошибки конфигурации

Ошибки с префиксом `verdeect-auth:` — это `Error`, а не `VerifyError`, и они видны сразу:

| Сообщение                                                               | Когда                                 |
| ----------------------------------------------------------------------- | ------------------------------------- |
| `verdeect-auth: issuers must not be empty`                              | `createVerifier` / старт модуля       |
| `verdeect-auth: resource must not be empty`                             | `createVerifier` / старт модуля       |
| `verdeect-auth: duplicate issuer <iss>`                                 | `createVerifier` / старт модуля       |
| `verdeect-auth: @RequireScope() needs at least one scope`               | объявление класса с `@RequireScope()` |
| `verdeect-auth: @RequireUser() and @RequireService() on the same route` | запрос к маршруту (ответ 500)         |

## Без NestJS

```ts
import { createVerifier, VerifyError } from '@verdeect/auth';

try {
  const principal = await verifier.verify(jwt);
  // работа с principal
} catch (error) {
  if (error instanceof VerifyError) {
    logger.warn({ rule: error.rule, reason: error.reason }, 'token rejected');
    return reject(401);
  }
  throw error; // сбой JWKS — не отказ токена
}
```
