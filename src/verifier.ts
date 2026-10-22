// createVerifier: правила V-1…V-5 (PRD Identity §7.5; 01 §5.3; UC-14 основной поток, A1, A2), V-6…V-8 — principal.ts.
// generic: ядро библиотеки — только jose, без Nest и без логов; причина отказа — VerifyError.rule/reason.
// Сбой загрузки JWKS (сеть, таймаут, не-JSON, не-200) — не ошибка токена: пробрасывается как есть (G3).
import {
    createRemoteJWKSet,
    decodeJwt,
    decodeProtectedHeader,
    errors,
    jwtVerify,
    type JWTPayload,
    type JWTVerifyGetKey,
} from 'jose';
import { toPrincipal } from './principal.js';
import { VerifyError } from './verify-error.js';
import type { Principal, TokenKind, Verifier, VerifierOptions } from './index.js';

const DEFAULT_KINDS: readonly TokenKind[] = ['user', 'service'];
const DEFAULT_CLOCK_TOLERANCE_SEC = 30;
/** V-3: неизвестный kid перечитывает JWKS не чаще раза в 60 с. */
const JWKS_COOLDOWN_MS = 60_000;

interface IssuerEntry {
    readonly keys: JWTVerifyGetKey;
    readonly kinds: readonly TokenKind[];
}

/**
 * Создаёт проверяющий токенов `at+jwt` по правилам V-1…V-8. Ключи издателей загружаются по `jwksUri`
 * лениво и кэшируются; неизвестный `kid` перечитывает JWKS не чаще раза в 60 с (V-3).
 *
 * @param options - издатели, сервер ресурсов и допуск часов.
 * @returns {@link Verifier} — один экземпляр на приложение, чтобы кэш JWKS был общим.
 * @throws Error с префиксом `verdeect-auth:` — пустой `issuers`, пустой `resource` или повтор `iss`.
 *
 * @example
 * ```ts
 * const verifier = createVerifier({
 *     issuers: [{ iss: 'https://id.verdeect.ru', jwksUri: 'https://id.verdeect.ru/oidc/jwks' }],
 *     resource: 'https://api.verdeect.ru',
 * });
 * const principal = await verifier.verify(jwt);
 * ```
 */
export function createVerifier(options: VerifierOptions): Verifier {
    const issuers = buildIssuers(options);
    const resource = options.resource;
    const tolerance = options.clockToleranceSec ?? DEFAULT_CLOCK_TOLERANCE_SEC;

    return {
        async verify(jwt: string): Promise<Principal> {
            checkHeader(jwt);

            const iss = readIssuer(jwt);
            const issuer = issuers.get(iss);
            if (!issuer) {
                throw new VerifyError('V-2', 'issuer_unknown');
            }

            const payload = await verifySignatureAndClaims(
                jwt,
                iss,
                issuer.keys,
                resource,
                tolerance,
            );

            return toPrincipal(payload, issuer.kinds);
        },
    };
}

function buildIssuers(options: VerifierOptions): Map<string, IssuerEntry> {
    if (options.issuers.length === 0) {
        throw new Error('verdeect-auth: issuers must not be empty');
    }
    if (options.resource.length === 0) {
        throw new Error('verdeect-auth: resource must not be empty');
    }

    const issuers = new Map<string, IssuerEntry>();
    for (const issuer of options.issuers) {
        if (issuers.has(issuer.iss)) {
            throw new Error(`verdeect-auth: duplicate issuer ${issuer.iss}`);
        }
        issuers.set(issuer.iss, {
            keys: createRemoteJWKSet(new URL(issuer.jwksUri), {
                cooldownDuration: JWKS_COOLDOWN_MS,
            }),
            kinds: issuer.kinds ?? DEFAULT_KINDS,
        });
    }

    return issuers;
}

/** V-1: typ = at+jwt (RFC 9068 допускает application/at+jwt), alg = EdDSA, kid — непустая строка. */
function checkHeader(jwt: string): void {
    let header: ReturnType<typeof decodeProtectedHeader>;
    try {
        header = decodeProtectedHeader(jwt);
    } catch {
        throw new VerifyError('V-1', 'malformed');
    }

    const typ = typeof header.typ === 'string' ? header.typ.toLowerCase() : '';
    if (typ !== 'at+jwt' && typ !== 'application/at+jwt') {
        throw new VerifyError('V-1', 'typ_mismatch');
    }
    if (header.alg !== 'EdDSA') {
        throw new VerifyError('V-1', 'alg_not_allowed');
    }
    if (typeof header.kid !== 'string' || header.kid.length === 0) {
        throw new VerifyError('V-1', 'kid_missing');
    }
}

/** V-2: издатель выбирается по неподписанному iss до любого сетевого запроса. */
function readIssuer(jwt: string): string {
    let iss: unknown;
    try {
        iss = decodeJwt(jwt).iss;
    } catch {
        throw new VerifyError('V-1', 'malformed');
    }
    if (typeof iss !== 'string') {
        throw new VerifyError('V-2', 'issuer_unknown');
    }

    return iss;
}

/** V-2 подпись, V-3 kid, V-4 exp/iat, V-5 aud. */
async function verifySignatureAndClaims(
    jwt: string,
    iss: string,
    keys: JWTVerifyGetKey,
    resource: string,
    tolerance: number,
): Promise<JWTPayload> {
    let payload: JWTPayload;
    try {
        ({ payload } = await jwtVerify(jwt, keys, {
            issuer: iss,
            audience: resource,
            algorithms: ['EdDSA'],
            requiredClaims: ['exp', 'iat'],
            clockTolerance: tolerance,
        }));
    } catch (error) {
        throw toVerifyError(error);
    }

    // jose проверяет iat из будущего только при maxTokenAge — проверяем сами (V-4).
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof payload.iat === 'number' && payload.iat > nowSec + tolerance) {
        throw new VerifyError('V-4', 'iat_in_future');
    }

    return payload;
}

/** Ошибки токена → VerifyError; прочие (сбой JWKS, сеть) возвращаются без изменений и пробрасываются. */
function toVerifyError(error: unknown): unknown {
    if (error instanceof errors.JWTExpired) {
        return new VerifyError('V-4', 'expired');
    }
    if (error instanceof errors.JWTClaimValidationFailed) {
        return fromClaimFailure(error);
    }
    if (error instanceof errors.JWSSignatureVerificationFailed) {
        return new VerifyError('V-2', 'signature_invalid');
    }
    if (
        error instanceof errors.JWKSNoMatchingKey ||
        error instanceof errors.JWKSMultipleMatchingKeys
    ) {
        return new VerifyError('V-3', 'kid_unknown');
    }
    if (error instanceof errors.JOSEAlgNotAllowed) {
        return new VerifyError('V-1', 'alg_not_allowed');
    }
    if (error instanceof errors.JWSInvalid || error instanceof errors.JWTInvalid) {
        return new VerifyError('V-1', 'malformed');
    }

    return error;
}

function fromClaimFailure(
    error: InstanceType<typeof errors.JWTClaimValidationFailed>,
): VerifyError {
    switch (error.claim) {
        case 'exp':
            return new VerifyError('V-4', error.reason === 'missing' ? 'exp_missing' : 'malformed');
        case 'iat':
            return new VerifyError('V-4', error.reason === 'missing' ? 'iat_missing' : 'malformed');
        case 'nbf':
            return new VerifyError('V-4', 'not_before');
        case 'aud':
            return new VerifyError('V-5', 'audience_mismatch');
        case 'typ':
            return new VerifyError('V-1', 'typ_mismatch');
        default:
            return new VerifyError('V-1', 'malformed');
    }
}
