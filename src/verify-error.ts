// Отказ проверки токена (PRD Identity §7.5). generic: ошибка библиотеки без Nest и без кодов §8 —
// guard переводит её в 401 UNAUTHENTICATED. Сообщение техническое, без значений claim'ов и токена.

/** Номер нарушенного правила проверки (PRD Identity §7.5). */
export type VerifyRule = 'V-1' | 'V-2' | 'V-3' | 'V-4' | 'V-5' | 'V-6' | 'V-7' | 'V-8';

/** Стабильный машинный код причины отказа; соответствие правилам — в README, раздел «Правила V-1…V-8». */
export type VerifyReason =
    | 'malformed'
    | 'typ_mismatch'
    | 'alg_not_allowed'
    | 'kid_missing'
    | 'issuer_unknown'
    | 'signature_invalid'
    | 'kid_unknown'
    | 'expired'
    | 'exp_missing'
    | 'iat_missing'
    | 'iat_in_future'
    | 'not_before'
    | 'audience_mismatch'
    | 'kind_unresolved'
    | 'kind_not_allowed'
    | 'agent_claim_missing'
    | 'pep_not_integer'
    | 'tenant_pair_broken';

/**
 * Токен отклонён по одному из правил V-1…V-8. Клиенту причина не раскрывается (guard отвечает 401),
 * `rule` и `reason` предназначены для логов. Сбой загрузки JWKS — не `VerifyError`.
 *
 * @example
 * ```ts
 * try {
 *     await verifier.verify(jwt);
 * } catch (error) {
 *     if (error instanceof VerifyError) {
 *         console.warn(error.rule, error.reason);
 *     }
 * }
 * ```
 */
export class VerifyError extends Error {
    override readonly name = 'VerifyError';

    constructor(
        /** Нарушенное правило. */
        readonly rule: VerifyRule,
        /** Машинный код причины. */
        readonly reason: VerifyReason,
    ) {
        super(`Token rejected: ${rule} ${reason}`);
    }
}
