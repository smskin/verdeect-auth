// Отказ проверки токена (prd.md §7.5). generic: ошибка библиотеки без Nest и без кодов §8 —
// guard переводит её в 401 UNAUTHENTICATED. Сообщение техническое, без значений claim'ов и токена.

/** Номер правила prd.md §7.5. */
export type VerifyRule = 'V-1' | 'V-2' | 'V-3' | 'V-4' | 'V-5' | 'V-6' | 'V-7' | 'V-8';

/** Стабильный машинный код причины отказа. */
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

export class VerifyError extends Error {
    override readonly name = 'VerifyError';

    constructor(
        readonly rule: VerifyRule,
        readonly reason: VerifyReason,
    ) {
        super(`Token rejected: ${rule} ${reason}`);
    }
}
