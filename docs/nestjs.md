# NestJS: модуль, guard, декораторы

[← README](../README.md)

## Модуль

| Метод                                    | Когда                                                  |
| ---------------------------------------- | ------------------------------------------------------ |
| `VerdeectAuthModule.forRoot(options)`    | конфигурация известна заранее (тесты, константы)       |
| `VerdeectAuthModule.forRootAsync({...})` | конфигурация из `ConfigService` или других провайдеров |

`forRootAsync` принимает `imports`, `inject`, `useFactory` (возвращает параметры `createVerifier`, можно `Promise`) и `isGlobal`.

Модуль регистрирует:

- verifier под токеном `VERDEECT_VERIFIER` — его можно внедрить и вызвать `verify()` вручную;
- `VerdeectAuthGuard`.

### `isGlobal`

По умолчанию `true`: модуль подключается один раз в корневом модуле, verifier и кэш JWKS — один на приложение, и окно перечитывания JWKS (V-3, не чаще раза в 60 с) действует на всё приложение. Функциональные модули `VerdeectAuthModule` не импортируют.

`isGlobal: false` — только для изоляции: модуль импортируется туда, где стоит `@UseGuards`, и у каждого импорта свой кэш JWKS.

## Guard

На контроллере или маршруте:

```ts
@Controller('api/organizations')
@UseGuards(VerdeectAuthGuard)
export class CreateOrganizationController {}
```

На всё приложение — через `APP_GUARD`:

```ts
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [VerdeectAuthModule.forRoot({ issuers: […], resource: 'https://api.verdeect.ru' })],
    providers: [{ provide: APP_GUARD, useExisting: VerdeectAuthGuard }],
})
export class AppModule {}
```

## Порядок проверок и ответы

| Шаг | Условие                                            | Ответ                                                  |
| --- | -------------------------------------------------- | ------------------------------------------------------ |
| 0   | `@RequireUser()` и `@RequireService()` вместе      | 500 — ошибка конфигурации маршрута                     |
| 1   | нет заголовка, не `Bearer`, `VerifyError`          | 401 `UNAUTHENTICATED` (причина не раскрывается)        |
| 1   | сбой загрузки JWKS                                 | 500 — ошибка инфраструктуры, не токена                 |
| 2   | `@RequireUser()` — не user                         | 403 `USER_TOKEN_REQUIRED`                              |
| 2   | `@RequireService()` — не service                   | 403 `FORBIDDEN`                                        |
| 3   | `@RequireTenant()` — нет `tenant` (service всегда) | 409 `TENANT_REQUIRED`                                  |
| 4   | `@RequireScope(...)` — нет хотя бы одной области   | 403 `SCOPE_REQUIRED`, `details.required` — недостающие |

Тело ответа — `{error: {code, message, details}}`.

## Декораторы

| Декоратор                  | Требует                      | Отказ                     |
| -------------------------- | ---------------------------- | ------------------------- |
| `@RequireUser()`           | токен пользователя           | 403 `USER_TOKEN_REQUIRED` |
| `@RequireService()`        | сервисный токен              | 403 `FORBIDDEN`           |
| `@RequireTenant()`         | компанию в токене (`tenant`) | 409 `TENANT_REQUIRED`     |
| `@RequireScope(...scopes)` | все перечисленные области    | 403 `SCOPE_REQUIRED`      |

Сочетания:

| Сочетание                                 | Результат                                           |
| ----------------------------------------- | --------------------------------------------------- |
| декоратор на классе и на методе           | метод перекрывает класс (`getAllAndOverride`)       |
| `@RequireUser()` + `@RequireService()`    | ошибка конфигурации, каждый запрос к маршруту — 500 |
| `@RequireScope()` без аргументов          | исключение `verdeect-auth:` при объявлении класса   |
| `@RequireTenant()` для сервисного токена  | всегда 409: сервисный токен компании не несёт       |
| `@RequireUser()` + `@RequireTenant()`     | пользователь с выбранной компанией                  |
| `@RequireTenant()` + `@RequireScope(...)` | сначала компания (409), затем области (403)         |

## Чтение `Principal`

Guard кладёт проверенный `Principal` в `request.principal`. Читать — через `principalOf`:

```ts
import { Get, Req } from '@nestjs/common';
import { principalOf, type PrincipalCarrier } from '@verdeect/auth/nest';

@Get('me')
me(@Req() request: PrincipalCarrier) {
    const principal = principalOf(request);
    if (principal === null) {
        return null; // guard на маршруте не стоял
    }
    switch (principal.kind) {
        case 'user':
            return { sub: principal.sub, tenant: principal.tenant };
        case 'service':
            return { client: principal.clientId };
        case 'agent':
            return { sub: principal.sub, asid: principal.asid };
    }
}
```

## Маршруты без токена

Guard не знает «публичных» маршрутов, отдельного декоратора нет.

- **Guard на контроллерах** (`@UseGuards`): маршрут без токена — это маршрут в контроллере без `@UseGuards(VerdeectAuthGuard)` (например, `/healthz`).
- **`APP_GUARD`**: guard стоит на каждом маршруте приложения, и все маршруты требуют токен. Подходит, когда всё приложение — сервер ресурсов. Если нужны открытые маршруты, ставьте guard на контроллеры, а не через `APP_GUARD`.

## Логи guard'а

`Logger` Nest, контекст `VerdeectAuthGuard`:

| Уровень | Событие                                    | Поля                              |
| ------- | ------------------------------------------ | --------------------------------- |
| WARN    | токен отклонён                             | `rule`, `reason`, `iss`, `kid`    |
| DEBUG   | токен истёк                                | `rule`, `reason`, `iss`, `kid`    |
| DEBUG   | нет токена `Bearer`                        | —                                 |
| DEBUG   | токен принят, доступ разрешён или запрещён | `kind`, `sub`, `clientId`, `code` |

Токен, заголовок `Authorization`, email и имена в лог не попадают; `iss` и `kid` обрезаются до 256 символов.
