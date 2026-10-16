// VerdeectAuthGuard (prd.md §7.5, §8, AC-7.4; 01 §4 п. 1, §5.3, §8; UC-14). generic: guard общей библиотеки.
// Порядок: токен (401) → вид (@RequireUser/@RequireService, 403) → тенант (409) → области (403).
// Логи — только sub, clientId, kind, kid, iss; токен, заголовок Authorization, email и имена не пишутся.
import {
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    Logger,
    type CanActivate,
    type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { decodeJwt, decodeProtectedHeader } from 'jose';
import { VerifyError } from '../verify-error.js';
import {
    REQUIRE_SCOPES,
    REQUIRE_SERVICE,
    REQUIRE_TENANT,
    REQUIRE_USER,
    type PrincipalCarrier,
} from './decorators.js';
import type { Principal, Verifier } from '../index.js';

/** Токен DI проверяющего; регистрирует VerdeectAuthModule. */
export const VERDEECT_VERIFIER = Symbol('VERDEECT_VERIFIER');

interface AuthRequest extends PrincipalCarrier {
    headers: Record<string, string | string[] | undefined>;
}

/** Bearer, схема без учёта регистра, ровно один токен (RFC 6750 b64token). */
const BEARER = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i;

@Injectable()
export class VerdeectAuthGuard implements CanActivate {
    private readonly logger = new Logger(VerdeectAuthGuard.name);

    constructor(
        @Inject(VERDEECT_VERIFIER) private readonly verifier: Verifier,
        private readonly reflector: Reflector,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthRequest>();
        const targets = [context.getHandler(), context.getClass()];

        const requireUser =
            this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_USER, targets) ?? false;
        const requireService =
            this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_SERVICE, targets) ??
            false;
        if (requireUser && requireService) {
            throw new Error(
                'verdeect-auth: @RequireUser() and @RequireService() on the same route',
            );
        }
        const requireTenant =
            this.reflector.getAllAndOverride<boolean | undefined>(REQUIRE_TENANT, targets) ?? false;
        const requiredScopes =
            this.reflector.getAllAndOverride<string[] | undefined>(REQUIRE_SCOPES, targets) ?? [];

        const principal = await this.authenticate(request);
        request.principal = principal;

        if (requireUser && principal.kind !== 'user') {
            this.deny(principal, 'USER_TOKEN_REQUIRED');
            throw failure(HttpStatus.FORBIDDEN, 'USER_TOKEN_REQUIRED', 'Нужен токен пользователя');
        }
        if (requireService && principal.kind !== 'service') {
            this.deny(principal, 'FORBIDDEN');
            throw failure(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'Доступ запрещён');
        }
        if (requireTenant && (principal.kind === 'service' || principal.tenant === null)) {
            this.deny(principal, 'TENANT_REQUIRED');
            throw failure(HttpStatus.CONFLICT, 'TENANT_REQUIRED', 'Не выбрана компания');
        }

        const missing = requiredScopes.filter((scope) => !principal.scopes.includes(scope));
        if (missing.length > 0) {
            this.deny(principal, 'SCOPE_REQUIRED');
            throw failure(HttpStatus.FORBIDDEN, 'SCOPE_REQUIRED', 'Нужна область доступа', {
                required: missing,
            });
        }

        this.logger.debug(
            {
                kind: principal.kind,
                sub: principal.sub,
                requireUser,
                requireService,
                requireTenant,
                requiredScopes,
            },
            '[VerdeectAuthGuard.canActivate] access granted',
        );

        return true;
    }

    private async authenticate(request: AuthRequest): Promise<Principal> {
        const header = request.headers['authorization'];
        const match = typeof header === 'string' ? BEARER.exec(header) : null;
        const jwt = match?.[1];
        if (jwt === undefined) {
            this.logger.debug({}, '[VerdeectAuthGuard.authenticate] no bearer token');
            throw unauthenticated();
        }

        try {
            const principal = await this.verifier.verify(jwt);
            this.logger.debug(
                {
                    kind: principal.kind,
                    sub: principal.sub,
                    clientId: principal.clientId,
                    ...tokenOrigin(jwt),
                },
                '[VerdeectAuthGuard.authenticate] token accepted',
            );

            return principal;
        } catch (error) {
            if (!(error instanceof VerifyError)) {
                throw error;
            }
            const fields = { rule: error.rule, reason: error.reason, ...tokenOrigin(jwt) };
            // Истечение — штатное событие при сроке токена 5 минут (prd.md §7.1).
            if (error.reason === 'expired') {
                this.logger.debug(fields, '[VerdeectAuthGuard.authenticate] token expired');
            } else {
                this.logger.warn(fields, '[VerdeectAuthGuard.authenticate] token rejected');
            }
            throw unauthenticated();
        }
    }

    private deny(principal: Principal, code: string): void {
        this.logger.debug(
            { kind: principal.kind, sub: principal.sub, clientId: principal.clientId, code },
            '[VerdeectAuthGuard.canActivate] access denied',
        );
    }
}

/** Предел длины iss/kid в логе: значения задаёт отправитель токена до проверки подписи. */
const LOGGED_CLAIM_MAX_LENGTH = 256;

/** iss и kid из неподписанных частей — только для логов; при неразборчивом токене поля опускаются. */
function tokenOrigin(jwt: string): { iss?: string; kid?: string } {
    const origin: { iss?: string; kid?: string } = {};
    try {
        const { kid } = decodeProtectedHeader(jwt);
        if (typeof kid === 'string') {
            origin.kid = kid.slice(0, LOGGED_CLAIM_MAX_LENGTH);
        }
        const { iss } = decodeJwt(jwt);
        if (typeof iss === 'string') {
            origin.iss = iss.slice(0, LOGGED_CLAIM_MAX_LENGTH);
        }
    } catch {
        // неразборчивый токен — без iss/kid
    }

    return origin;
}

function unauthenticated(): HttpException {
    return failure(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'Требуется вход');
}

/** Формат 01 §8: {error: {code, message, details}}. */
function failure(
    status: HttpStatus,
    code: string,
    message: string,
    details: object = {},
): HttpException {
    return new HttpException({ error: { code, message, details } }, status);
}
