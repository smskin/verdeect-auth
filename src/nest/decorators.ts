// Декораторы маршрутов verdeect-auth (prd.md §7.5, AC-7.4; 01 §5.3; D8 — доступ по областям). generic: общая
// библиотека, не shared/auth сервиса. Применимы к методу и к классу; метаданные метода перекрывают класс.
import { SetMetadata } from '@nestjs/common';
import type { Principal } from '../index.js';

export const REQUIRE_TENANT = 'verdeect-auth:require-tenant';
export const REQUIRE_SCOPES = 'verdeect-auth:require-scopes';
export const REQUIRE_USER = 'verdeect-auth:require-user';
export const REQUIRE_SERVICE = 'verdeect-auth:require-service';

/** Нужна компания в токене: без `tenant` → 409 TENANT_REQUIRED. */
export const RequireTenant = (): ClassDecorator & MethodDecorator =>
    SetMetadata(REQUIRE_TENANT, true);

/** Нужны все перечисленные области: иначе 403 SCOPE_REQUIRED. Пустой вызов — ошибка при объявлении. */
export const RequireScope = (...scopes: string[]): ClassDecorator & MethodDecorator => {
    if (scopes.length === 0) {
        throw new Error('verdeect-auth: @RequireScope() needs at least one scope');
    }

    return SetMetadata(REQUIRE_SCOPES, scopes);
};

/** Только токен пользователя: иначе 403 USER_TOKEN_REQUIRED. */
export const RequireUser = (): ClassDecorator & MethodDecorator => SetMetadata(REQUIRE_USER, true);

/** Только сервисный токен: иначе 403 FORBIDDEN. */
export const RequireService = (): ClassDecorator & MethodDecorator =>
    SetMetadata(REQUIRE_SERVICE, true);

/** Запрос, в который VerdeectAuthGuard кладёт проверенный Principal. */
export interface PrincipalCarrier {
    principal?: Principal;
}

/** Principal из запроса (кладёт VerdeectAuthGuard); null — guard на маршруте не стоял. */
export function principalOf(request: PrincipalCarrier): Principal | null {
    return request.principal ?? null;
}
