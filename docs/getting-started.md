# Подключение к сервису NestJS

[← README](../README.md)

Пошагово: новый сервис NestJS 12 начинает принимать токены `at+jwt` Вердикта.

## 1. Установка

Нужны Node.js ≥ 22.12 и ESM (`"type": "module"`). Версия ставится точно:

```bash
pnpm add @verdeect/auth@1.0.0 --save-exact
```

## 2. Peer-зависимости

`@verdeect/auth/nest` использует то, что уже есть в приложении NestJS: `@nestjs/common`, `@nestjs/core` (12.x), `reflect-metadata`, `rxjs`. Своих копий пакет не приносит. Если сервис создан `nest new`, ставить ничего не нужно.

## 3. Издатели токенов

Сервис доверяет двум издателям:

| Издатель     | `kinds`                        | Что выпускает                   |
| ------------ | ------------------------------ | ------------------------------- |
| Identity     | по умолчанию `user`, `service` | токены пользователей и сервисов |
| Orchestrator | `['agent']`                    | токены агентов                  |

Для каждого нужны `iss` и адрес JWKS. Сервер ресурсов (`resource`) — значение, которое токен обязан нести в `aud`.

## 4. Переменные окружения

Библиотека переменные окружения не читает: конфигурацию передаёт сервис. Пример имён:

```dotenv
AUTH_IDENTITY_ISS=
AUTH_IDENTITY_JWKS_URI=
AUTH_ORCHESTRATOR_ISS=
AUTH_ORCHESTRATOR_JWKS_URI=
AUTH_RESOURCE=
```

Значения берутся из конфигурации окружения сервиса.

## 5. Регистрация модуля

Один раз, в корневом модуле:

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VerdeectAuthModule } from '@verdeect/auth/nest';

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
          {
            iss: config.getOrThrow('AUTH_ORCHESTRATOR_ISS'),
            jwksUri: config.getOrThrow('AUTH_ORCHESTRATOR_JWKS_URI'),
            kinds: ['agent'],
          },
        ],
        resource: config.getOrThrow('AUTH_RESOURCE'),
      }),
    }),
  ],
})
export class AppModule {}
```

Неверная конфигурация (пустой `issuers`, пустой `resource`, повтор `iss`) — исключение с префиксом `verdeect-auth:` при старте приложения.

## 6. Guard на контроллере

```ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  principalOf,
  RequireScope,
  VerdeectAuthGuard,
  type PrincipalCarrier,
} from '@verdeect/auth/nest';

@Controller('api/projects')
@UseGuards(VerdeectAuthGuard)
export class ListProjectsController {
  @Get()
  @RequireScope('projects:read')
  handle(@Req() request: PrincipalCarrier) {
    const principal = principalOf(request);
    // principal.kind, principal.sub, principal.scopes …
  }
}
```

Функциональному модулю `VerdeectAuthModule` импортировать не нужно: модуль глобальный.

## 7. Проверка вызовом

```bash
curl -i -H "Authorization: Bearer <token>" http://localhost:3000/api/projects
# 200 — токен принят

curl -i http://localhost:3000/api/projects
# 401 {"error":{"code":"UNAUTHENTICATED","message":"Требуется вход","details":{}}}
```

Если пришёл 401 с правильным токеном — причина в логе сервиса: строка WARN от `VerdeectAuthGuard` с `rule` и `reason` ([errors.md](errors.md)).

## Дальше

- [nestjs.md](nestjs.md) — декораторы, `APP_GUARD`, маршруты без токена
- [testing.md](testing.md) — тесты сервиса без Identity
