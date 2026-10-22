// Публичный контракт @verdeect/auth (PRD Identity §7.5; 01 §5.3–5.4; prd.md §8, AC-9 — TSDoc).

/**
 * Вид токена (правило V-6).
 *
 * - `user` — токен пользователя: есть `sid` и `client_id`;
 * - `service` — сервисный токен: `sub = client_id`, без `sid`;
 * - `agent` — токен агента от Orchestrator: `act = agent`.
 */
export type TokenKind = 'user' | 'service' | 'agent';

/** Доверенный издатель токенов (PRD Identity §7.5). */
export interface TrustedIssuer {
    /** Значение claim'а `iss`; повтор `iss` в списке издателей — ошибка конфигурации. */
    readonly iss: string;
    /** Адрес JWKS издателя; на каждого издателя — свой кэш ключей (V-3). */
    readonly jwksUri: string;
    /**
     * Виды токенов, которые издатель вправе выпускать (V-6); по умолчанию `['user', 'service']` (Identity).
     * Orchestrator — `['agent']`; если §21.3 решат обменом RFC 8693, Identity получит `['user', 'service', 'agent']`.
     */
    readonly kinds?: readonly TokenKind[];
}

/** Параметры {@link createVerifier} (PRD Identity §7.5). */
export interface VerifierOptions {
    /** Доверенные издатели; пустой список — ошибка конфигурации. */
    readonly issuers: readonly TrustedIssuer[];
    /** Сервер ресурсов: `aud` токена обязан его содержать (V-5); пустая строка — ошибка конфигурации. */
    readonly resource: string;
    /** Допуск часов для exp/iat в секундах (V-4); по умолчанию 30. */
    readonly clockToleranceSec?: number;
}

/** Токен пользователя: есть `sid` и `client_id` (V-6). Ролей нет (D9). */
export interface UserPrincipal {
    /** Вид токена — `user`. */
    readonly kind: 'user';
    /** Идентификатор пользователя (`sub`). */
    readonly sub: string;
    /** Клиент, получивший токен (`client_id`). */
    readonly clientId: string;
    /** Сессия пользователя у издателя (`sid`). */
    readonly sid: string;
    /** Области доступа из `scope`; пустой список, если claim'а нет. */
    readonly scopes: readonly string[];
    /** Слаг компании (`tenant`); `tenant` ⇔ `tenantId`: оба заданы или оба null (V-8). */
    readonly tenant: string | null;
    /** Идентификатор компании (`tenant_id`); задан вместе с `tenant` (V-8). */
    readonly tenantId: string | null;
}

/** Сервисный токен: `sub = client_id`, без `sid` (V-6). */
export interface ServicePrincipal {
    /** Вид токена — `service`. */
    readonly kind: 'service';
    /** Идентификатор сервиса; совпадает с `clientId`. */
    readonly sub: string;
    /** Клиент-сервис (`client_id`). */
    readonly clientId: string;
    /** Области доступа из `scope`; пустой список, если claim'а нет. */
    readonly scopes: readonly string[];
}

/** Токен агента от Orchestrator: `act = agent` (01 §5.4, V-6, V-7). */
export interface AgentPrincipal {
    /** Вид токена — `agent`. */
    readonly kind: 'agent';
    /** Идентификатор агента (`sub`). */
    readonly sub: string;
    /** `client_id` у агента необязателен (V-7). */
    readonly clientId: string | null;
    /** Пустой список, если `scope` в токене нет (V-7). */
    readonly scopes: readonly string[];
    /** Слаг компании; обязателен вместе с `tenantId` (V-7, V-8). */
    readonly tenant: string;
    /** Идентификатор компании (`tenant_id`); обязателен (V-7, V-8). */
    readonly tenantId: string;
    /** Claim `asid`; обязателен (V-7). */
    readonly asid: string;
    /** Claim `wid` — строка или null (V-7). */
    readonly wid: string | null;
    /** Claim `prof`; обязателен (V-7). */
    readonly prof: string;
    /** Claim `pep` — целое число (V-7). Актуальность `pep` проверяет сервис (01 §6.4), не библиотека. */
    readonly pep: number;
}

/**
 * Результат проверки токена (PRD Identity §7.5): различается по полю `kind`.
 *
 * @example
 * ```ts
 * if (principal.kind === 'user') {
 *     console.log(principal.sid);
 * }
 * ```
 */
export type Principal = UserPrincipal | ServicePrincipal | AgentPrincipal;

/** Проверяющий `at+jwt` (PRD Identity §7.5, правила V-1…V-8); создаётся {@link createVerifier}. */
export interface Verifier {
    /**
     * Проверяет токен по правилам V-1…V-8 и строит {@link Principal}.
     *
     * @param jwt - токен без префикса `Bearer`.
     * @returns `Principal` проверенного токена.
     * @throws {@link VerifyError} — токен отклонён (поля `rule` и `reason`).
     * @throws Исходная ошибка загрузки JWKS (сеть, таймаут, не-JSON) — пробрасывается как есть, это не отказ токена.
     *
     * @example
     * ```ts
     * const principal = await verifier.verify(jwt);
     * ```
     */
    verify(jwt: string): Promise<Principal>;
}

export { createVerifier } from './verifier.js';
export { VerifyError, type VerifyReason, type VerifyRule } from './verify-error.js';
