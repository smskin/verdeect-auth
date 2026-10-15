// Публичный контракт verdeect-auth (prd.md §7.5; 01 §5.3–5.4). Реализацию createVerifier даёт этап E4.

/** Доверенный издатель токенов (prd.md §7.5). */
export interface TrustedIssuer {
    readonly iss: string;
    readonly jwksUri: string;
}

/** Параметры createVerifier (prd.md §7.5). */
export interface VerifierOptions {
    readonly issuers: readonly TrustedIssuer[];
    /** Сервер ресурсов: `aud` токена обязан его содержать (V-5). */
    readonly resource: string;
    /** Допуск часов для exp/iat в секундах; по умолчанию 30. */
    readonly clockToleranceSec?: number;
}

/** Токен пользователя: есть `sid` (prd.md §7.5, V-6). Ролей нет (D9). */
export interface UserPrincipal {
    readonly kind: 'user';
    readonly sub: string;
    readonly clientId: string;
    readonly sid: string;
    readonly scopes: readonly string[];
    readonly tenant: string | null;
    readonly tenantId: string | null;
}

/** Сервисный токен: `sub = client_id`, без `sid` (prd.md §7.5, V-6). */
export interface ServicePrincipal {
    readonly kind: 'service';
    readonly sub: string;
    readonly clientId: string;
    readonly scopes: readonly string[];
}

/** Токен агента от Orchestrator (01 §5.4, prd.md §7.5 V-7). */
export interface AgentPrincipal {
    readonly kind: 'agent';
    readonly sub: string;
    readonly clientId: string;
    readonly scopes: readonly string[];
    readonly tenant: string;
    readonly tenantId: string;
    readonly asid: string;
    readonly wid: string | null;
    readonly prof: string;
    readonly pep: number;
}

/** Результат проверки токена (prd.md §7.5). */
export type Principal = UserPrincipal | ServicePrincipal | AgentPrincipal;

/** Проверяющий `at+jwt` (prd.md §7.5, правила V-1…V-8). */
export interface Verifier {
    verify(jwt: string): Promise<Principal>;
}
