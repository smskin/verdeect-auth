// Декораторы маршрутов @verdeect/auth/nest (PRD Identity §7.5, AC-7.4; 01 §5.3; D8 — доступ по областям). generic: общая
// библиотека, не shared/auth сервиса. Применимы к методу и к классу; метаданные метода перекрывают класс.
import { SetMetadata } from '@nestjs/common';
import type { Principal } from '../index.js';

/** Внутренний ключ метаданных {@link RequireTenant} (не экспортируется из пакета). */
export const REQUIRE_TENANT = 'verdeect-auth:require-tenant';
/** Внутренний ключ метаданных {@link RequireScope} (не экспортируется из пакета). */
export const REQUIRE_SCOPES = 'verdeect-auth:require-scopes';
/** Внутренний ключ метаданных {@link RequireUser} (не экспортируется из пакета). */
export const REQUIRE_USER = 'verdeect-auth:require-user';
/** Внутренний ключ метаданных {@link RequireService} (не экспортируется из пакета). */
export const REQUIRE_SERVICE = 'verdeect-auth:require-service';

/**
 * Нужна компания в токене: без `tenant` → 409 `TENANT_REQUIRED`. Сервисный токен компании не несёт
 * и с этим декоратором всегда получает 409.
 *
 * @example
 * ```ts
 * @Get()
 * @RequireTenant()
 * list() {}
 * ```
 */
export const RequireTenant = (): ClassDecorator & MethodDecorator =>
    SetMetadata(REQUIRE_TENANT, true);

/**
 * Нужны все перечисленные области: иначе 403 `SCOPE_REQUIRED`, в `details.required` — недостающие.
 *
 * @param scopes - области доступа, все обязательны.
 * @throws Error с префиксом `verdeect-auth:` при объявлении без областей.
 *
 * @example
 * ```ts
 * @Post()
 * @RequireScope('identity:organizations.manage')
 * create() {}
 * ```
 */
export const RequireScope = (...scopes: string[]): ClassDecorator & MethodDecorator => {
    if (scopes.length === 0) {
        throw new Error('verdeect-auth: @RequireScope() needs at least one scope');
    }

    return SetMetadata(REQUIRE_SCOPES, scopes);
};

/**
 * Только токен пользователя: иначе 403 `USER_TOKEN_REQUIRED`. Вместе с {@link RequireService}
 * на одном маршруте — ошибка конфигурации, guard отвечает 500.
 */
export const RequireUser = (): ClassDecorator & MethodDecorator => SetMetadata(REQUIRE_USER, true);

/**
 * Только сервисный токен: иначе 403 `FORBIDDEN`. Вместе с {@link RequireUser}
 * на одном маршруте — ошибка конфигурации, guard отвечает 500.
 */
export const RequireService = (): ClassDecorator & MethodDecorator =>
    SetMetadata(REQUIRE_SERVICE, true);

/** Запрос, в который VerdeectAuthGuard кладёт проверенный Principal. */
export interface PrincipalCarrier {
    /** Проверенный `Principal`; появляется после успешной проверки guard'ом. */
    principal?: Principal;
}

/**
 * Principal из запроса (кладёт VerdeectAuthGuard).
 *
 * @param request - объект запроса Nest (`@Req()`).
 * @returns `Principal` или null, если guard на маршруте не стоял.
 *
 * @example
 * ```ts
 * @Get('me')
 * me(@Req() request: PrincipalCarrier) {
 *     return principalOf(request)?.sub;
 * }
 * ```
 */
export function principalOf(request: PrincipalCarrier): Principal | null {
    return request.principal ?? null;
}
