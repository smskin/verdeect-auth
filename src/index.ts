// Публичный контракт verdeect-auth (prd.md §7.5; 01 §5.3–5.4).

/** Вид токена (prd.md §7.5, V-6). */
export type TokenKind = 'user' | 'service' | 'agent';

/** Доверенный издатель токенов (prd.md §7.5). */
export interface TrustedIssuer {
    readonly iss: string;
    readonly jwksUri: string;
    /**
     * Виды токенов, которые издатель вправе выпускать (V-6); по умолчанию `['user', 'service']` (Identity).
     * Orchestrator — `['agent']`; если §21.3 решат обменом RFC 8693, Identity получит `['user', 'service', 'agent']`.
     */
    readonly kinds?: readonly TokenKind[];
}

/** Параметры createVerifier (prd.md §7.5). */
export interface VerifierOptions {
    readonly issuers: readonly TrustedIssuer[];
    /** Сервер ресурсов: `aud` токена обязан его содержать (V-5). */
    readonly resource: string;
    /** Допуск часов для exp/iat в секундах (V-4); по умолчанию 30. */
    readonly clockToleranceSec?: number;
}

/** Токен пользователя: есть `sid` и `client_id` (V-6). Ролей нет (D9). */
export interface UserPrincipal {
    readonly kind: 'user';
    readonly sub: string;
    readonly clientId: string;
    readonly sid: string;
    readonly scopes: readonly string[];
    /** `tenant` ⇔ `tenantId`: оба заданы или оба null (V-8). */
    readonly tenant: string | null;
    readonly tenantId: string | null;
}

/** Сервисный токен: `sub = client_id`, без `sid` (V-6). */
export interface ServicePrincipal {
    readonly kind: 'service';
    readonly sub: string;
    readonly clientId: string;
    readonly scopes: readonly string[];
}

/** Токен агента от Orchestrator: `act = agent` (01 §5.4, V-6, V-7). */
export interface AgentPrincipal {
    readonly kind: 'agent';
    readonly sub: string;
    /** `client_id` у агента необязателен (V-7). */
    readonly clientId: string | null;
    /** Пустой список, если `scope` в токене нет (V-7). */
    readonly scopes: readonly string[];
    /** Обязательны оба (V-7, V-8). */
    readonly tenant: string;
    readonly tenantId: string;
    readonly asid: string;
    readonly wid: string | null;
    readonly prof: string;
    /** Актуальность `pep` проверяет сервис (01 §6.4), не библиотека. */
    readonly pep: number;
}

/** Результат проверки токена (prd.md §7.5). */
export type Principal = UserPrincipal | ServicePrincipal | AgentPrincipal;

/** Проверяющий `at+jwt` (prd.md §7.5, правила V-1…V-8). */
export interface Verifier {
    verify(jwt: string): Promise<Principal>;
}

export { createVerifier } from './verifier.js';
export { VerifyError, type VerifyReason, type VerifyRule } from './verify-error.js';
