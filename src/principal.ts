// Классификация проверенных claim'ов в Principal: правила V-6, V-7, V-8 (prd.md §7.5, §7.1, §7.2; 01 §5.4).
// generic: чистая функция ядра библиотеки, без Nest и без логов. Вызывается после V-1…V-5.
import { VerifyError } from './verify-error.js';
import type { AgentPrincipal, Principal, TokenKind, UserPrincipal } from './index.js';

type Claims = Readonly<Record<string, unknown>>;

/** Возвращает Principal или бросает VerifyError. Посторонние claim'ы (`roles`, `entitlements`…) игнорируются. */
export function toPrincipal(claims: Claims, kinds: readonly TokenKind[]): Principal {
    const sub = claims['sub'];
    const sid = claims['sid'];
    const clientId = claims['client_id'];

    if (
        !isNonEmptyString(sub) ||
        !isAbsentOrNonEmptyString(sid) ||
        !isAbsentOrNonEmptyString(clientId)
    ) {
        throw new VerifyError('V-6', 'malformed');
    }

    const scopes = parseScopes(claims['scope']);
    const kind = resolveKind(claims['act'], sub, sid, clientId);

    if (!kinds.includes(kind)) {
        throw new VerifyError('V-6', 'kind_not_allowed');
    }

    if (kind === 'agent') {
        return toAgent(claims, sub, clientId ?? null, scopes);
    }

    if (kind === 'service') {
        // §7.2: у сервисного токена нет sid/tenant — tenant/tenant_id не переносятся.
        return { kind: 'service', sub, clientId: sub, scopes };
    }

    return toUser(claims, sub, sid, clientId, scopes);
}

function resolveKind(
    act: unknown,
    sub: string,
    sid: string | undefined,
    clientId: string | undefined,
): TokenKind {
    if (act !== undefined) {
        if (act === 'agent') {
            return 'agent';
        }
        throw new VerifyError('V-6', 'kind_unresolved');
    }

    if (sub === clientId && sid === undefined) {
        return 'service';
    }

    if (sid !== undefined && clientId !== undefined) {
        return 'user';
    }

    throw new VerifyError('V-6', 'kind_unresolved');
}

function toAgent(
    claims: Claims,
    sub: string,
    clientId: string | null,
    scopes: string[],
): AgentPrincipal {
    const tenant = claims['tenant'];
    const tenantId = claims['tenant_id'];
    const asid = claims['asid'];
    const prof = claims['prof'];
    const pep = claims['pep'];
    const wid = claims['wid'] ?? null;

    if (!isNonEmptyString(tenant) || !isNonEmptyString(tenantId) || !isNonEmptyString(asid)) {
        throw new VerifyError('V-7', 'agent_claim_missing');
    }
    if (!isNonEmptyString(prof) || pep === undefined || pep === null) {
        throw new VerifyError('V-7', 'agent_claim_missing');
    }
    if (typeof pep !== 'number' || !Number.isInteger(pep)) {
        throw new VerifyError('V-7', 'pep_not_integer');
    }
    if (wid !== null && typeof wid !== 'string') {
        throw new VerifyError('V-7', 'agent_claim_missing');
    }

    return { kind: 'agent', sub, clientId, scopes, tenant, tenantId, asid, wid, prof, pep };
}

function toUser(
    claims: Claims,
    sub: string,
    sid: string | undefined,
    clientId: string | undefined,
    scopes: string[],
): UserPrincipal {
    if (sid === undefined || clientId === undefined) {
        throw new VerifyError('V-6', 'kind_unresolved');
    }

    const tenant = claims['tenant'] ?? null;
    const tenantId = claims['tenant_id'] ?? null;

    if (tenant === null && tenantId === null) {
        return { kind: 'user', sub, clientId, sid, scopes, tenant: null, tenantId: null };
    }
    if (!isNonEmptyString(tenant) || !isNonEmptyString(tenantId)) {
        throw new VerifyError('V-8', 'tenant_pair_broken');
    }

    return { kind: 'user', sub, clientId, sid, scopes, tenant, tenantId };
}

function parseScopes(scope: unknown): string[] {
    if (scope === undefined || scope === null) {
        return [];
    }
    if (typeof scope !== 'string') {
        throw new VerifyError('V-6', 'malformed');
    }

    return scope.split(' ').filter((item) => item.length > 0);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function isAbsentOrNonEmptyString(value: unknown): value is string | undefined {
    return value === undefined || isNonEmptyString(value);
}
