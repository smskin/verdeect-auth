// Unit (prd.md §18, уровень L, без БД): VerdeectAuthGuard и декораторы через HTTP — Nest на Fastify, запросы inject.
// Требования: requirements/0000-identity-server/prd.md §7.5, §8; files/01-contracts-excerpt.md §5.3, §8;
// UC-14; AC-7.4; таблица комбинаций видов и декораторов из плана E4 (Requirements Reconciliation).
import 'reflect-metadata';
import {
    Controller,
    Get,
    Inject,
    Module,
    Req,
    UseGuards,
    type LoggerService,
} from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
    createTestSigner,
    TEST_ORCHESTRATOR_ISS,
    TEST_RESOURCE,
    type TestSigner,
} from '../testing/index.js';
import {
    principalOf,
    RequireScope,
    RequireService,
    RequireTenant,
    RequireUser,
    VERDEECT_VERIFIER,
    VerdeectAuthGuard,
    VerdeectAuthModule,
    type PrincipalCarrier,
} from './index.js';
import type { TrustedIssuer, Verifier } from '../index.js';

@Controller('routes')
@UseGuards(VerdeectAuthGuard)
class RoutesController {
    @Get('open')
    open(@Req() request: PrincipalCarrier): { kind?: string; sub?: string } {
        const principal = principalOf(request);

        return { kind: principal?.kind, sub: principal?.sub };
    }

    @Get('user')
    @RequireUser()
    user(): { ok: true } {
        return { ok: true };
    }

    @Get('service')
    @RequireService()
    service(): { ok: true } {
        return { ok: true };
    }

    @Get('tenant')
    @RequireTenant()
    tenant(): { ok: true } {
        return { ok: true };
    }

    @Get('scope')
    @RequireScope('identity:organizations.manage')
    scope(): { ok: true } {
        return { ok: true };
    }

    @Get('user-tenant')
    @RequireUser()
    @RequireTenant()
    userTenant(): { ok: true } {
        return { ok: true };
    }

    @Get('conflict')
    @RequireUser()
    @RequireService()
    conflict(): { ok: true } {
        return { ok: true };
    }
}

@Controller('class-scope')
@UseGuards(VerdeectAuthGuard)
@RequireScope('verdeect')
class ClassScopeController {
    @Get('inherited')
    inherited(): { ok: true } {
        return { ok: true };
    }

    @Get('overridden')
    @RequireScope('identity:users.read')
    overridden(): { ok: true } {
        return { ok: true };
    }
}

// Функциональные модули без импорта VerdeectAuthModule: guard и verifier приходят из глобального модуля корня.
const seenVerifiers: Verifier[] = [];

@Controller('feature-a')
@UseGuards(VerdeectAuthGuard)
class FeatureAController {
    constructor(@Inject(VERDEECT_VERIFIER) verifier: Verifier) {
        seenVerifiers.push(verifier);
    }

    @Get()
    @RequireUser()
    handle(): { ok: true } {
        return { ok: true };
    }
}

@Controller('feature-b')
@UseGuards(VerdeectAuthGuard)
class FeatureBController {
    constructor(@Inject(VERDEECT_VERIFIER) verifier: Verifier) {
        seenVerifiers.push(verifier);
    }

    @Get()
    handle(): { ok: true } {
        return { ok: true };
    }
}

@Module({ controllers: [FeatureAController] })
class FeatureAModule {}

@Module({ controllers: [FeatureBController] })
class FeatureBModule {}

const TEST_ISSUERS = Symbol('TEST_ISSUERS');

async function startApp(
    module: Parameters<typeof Test.createTestingModule>[0],
    logger: LoggerService | false = false,
): Promise<NestFastifyApplication> {
    const moduleRef = await Test.createTestingModule(module).compile();
    const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
        logger,
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    return app;
}

describe("UC-14: guard'ы verdeect-auth", () => {
    let identity: TestSigner;
    let orchestrator: TestSigner;
    let app: NestFastifyApplication;

    beforeAll(async () => {
        identity = await createTestSigner();
        orchestrator = await createTestSigner({ iss: TEST_ORCHESTRATOR_ISS, kinds: ['agent'] });
        app = await startApp({
            imports: [
                VerdeectAuthModule.forRoot({
                    issuers: [identity.issuer, orchestrator.issuer],
                    resource: TEST_RESOURCE,
                }),
            ],
            controllers: [RoutesController, ClassScopeController],
        });
    });

    afterAll(async () => {
        await app.close();
        await identity.close();
        await orchestrator.close();
    });

    async function call(url: string, authorization?: string) {
        const response = await app.inject({
            method: 'GET',
            url,
            headers: authorization === undefined ? {} : { authorization },
        });
        const body = response.json<{
            error?: { code: string; message: string; details: Record<string, unknown> };
        }>();

        return { status: response.statusCode, body, code: body.error?.code };
    }

    const bearer = async (token: Promise<string>): Promise<string> => `Bearer ${await token}`;
    const userWithTenant = () =>
        bearer(identity.userToken({ tenant: 'acme', tenant_id: 'org_test_acme' }));

    it('AC-7.4: нет заголовка Authorization → 401 UNAUTHENTICATED', async () => {
        const result = await call('/routes/open');

        expect(result.status).toBe(401);
        expect(result.body).toEqual({
            error: { code: 'UNAUTHENTICATED', message: 'Требуется вход', details: {} },
        });
    });

    it('AC-7.4: схема Basic → 401 UNAUTHENTICATED', async () => {
        const result = await call('/routes/open', 'Basic dXNlcjpwYXNz');

        expect(result.status).toBe(401);
        expect(result.code).toBe('UNAUTHENTICATED');
    });

    it('AC-7.4: недействительный токен → 401 UNAUTHENTICATED, причина не раскрыта', async () => {
        const result = await call(
            '/routes/open',
            await bearer(identity.userToken({ aud: ['https://other.example'] })),
        );

        expect(result.status).toBe(401);
        expect(result.body).toEqual({
            error: { code: 'UNAUTHENTICATED', message: 'Требуется вход', details: {} },
        });
    });

    it('AC-7.4: мусор вместо токена → 401 UNAUTHENTICATED', async () => {
        const result = await call('/routes/open', 'Bearer not-a-jwt');

        expect(result.status).toBe(401);
        expect(result.code).toBe('UNAUTHENTICATED');
    });

    it('AC-7.4: @RequireTenant с пользовательским токеном без tenant → 409 TENANT_REQUIRED', async () => {
        const result = await call('/routes/tenant', await bearer(identity.userToken()));

        expect(result.status).toBe(409);
        expect(result.code).toBe('TENANT_REQUIRED');
    });

    it('AC-7.4: @RequireTenant с сервисным токеном → 409 TENANT_REQUIRED', async () => {
        const result = await call('/routes/tenant', await bearer(identity.serviceToken()));

        expect(result.status).toBe(409);
        expect(result.code).toBe('TENANT_REQUIRED');
    });

    it('AC-7.4: @RequireTenant с tenant → 200', async () => {
        expect((await call('/routes/tenant', await userWithTenant())).status).toBe(200);
    });

    it('AC-7.4: @RequireTenant с токеном агента → 200', async () => {
        expect((await call('/routes/tenant', await bearer(orchestrator.agentToken()))).status).toBe(
            200,
        );
    });

    it('AC-7.4: @RequireScope без области → 403 SCOPE_REQUIRED с details.required', async () => {
        const result = await call('/routes/scope', await bearer(identity.serviceToken()));

        expect(result.status).toBe(403);
        expect(result.body.error).toEqual({
            code: 'SCOPE_REQUIRED',
            message: 'Нужна область доступа',
            details: { required: ['identity:organizations.manage'] },
        });
    });

    it('AC-7.4: @RequireScope с областью → 200', async () => {
        const token = await bearer(
            identity.serviceToken({ scope: 'identity:organizations.manage' }),
        );

        expect((await call('/routes/scope', token)).status).toBe(200);
    });

    it('AC-7.4: @RequireScope с пользовательским токеном с областью → 200', async () => {
        const token = await bearer(
            identity.userToken({ scope: 'verdeect identity:organizations.manage' }),
        );

        expect((await call('/routes/scope', token)).status).toBe(200);
    });

    it('AC-7.4: @RequireScope с пользовательским токеном без области → 403 SCOPE_REQUIRED', async () => {
        const result = await call('/routes/scope', await bearer(identity.userToken()));

        expect(result.status).toBe(403);
        expect(result.code).toBe('SCOPE_REQUIRED');
        expect(result.body.error?.details).toEqual({ required: ['identity:organizations.manage'] });
    });

    it('AC-7.4: @RequireScope на токен агента без scope → 403 SCOPE_REQUIRED', async () => {
        const result = await call('/routes/scope', await bearer(orchestrator.agentToken()));

        expect(result.status).toBe(403);
        expect(result.code).toBe('SCOPE_REQUIRED');
    });

    it('AC-7.4: @RequireUser на сервисный токен → 403 USER_TOKEN_REQUIRED', async () => {
        const result = await call('/routes/user', await bearer(identity.serviceToken()));

        expect(result.status).toBe(403);
        expect(result.code).toBe('USER_TOKEN_REQUIRED');
    });

    it('AC-7.4: @RequireUser на токен агента → 403 USER_TOKEN_REQUIRED', async () => {
        const result = await call('/routes/user', await bearer(orchestrator.agentToken()));

        expect(result.status).toBe(403);
        expect(result.code).toBe('USER_TOKEN_REQUIRED');
    });

    it('AC-7.4: @RequireUser на пользовательский токен → 200', async () => {
        expect((await call('/routes/user', await bearer(identity.userToken()))).status).toBe(200);
    });

    it('AC-7.4: @RequireUser на пользовательский токен с tenant → 200', async () => {
        expect((await call('/routes/user', await userWithTenant())).status).toBe(200);
    });

    it('AC-7.4: @RequireService на пользовательский токен без tenant → 403 FORBIDDEN', async () => {
        const result = await call('/routes/service', await bearer(identity.userToken()));

        expect(result.status).toBe(403);
        expect(result.code).toBe('FORBIDDEN');
    });

    it('AC-7.4: @RequireService на пользовательский токен → 403 FORBIDDEN', async () => {
        const result = await call('/routes/service', await userWithTenant());

        expect(result.status).toBe(403);
        expect(result.code).toBe('FORBIDDEN');
    });

    it('AC-7.4: @RequireService на токен агента → 403 FORBIDDEN', async () => {
        const result = await call('/routes/service', await bearer(orchestrator.agentToken()));

        expect(result.status).toBe(403);
        expect(result.code).toBe('FORBIDDEN');
    });

    it('AC-7.4: @RequireService на сервисный токен → 200', async () => {
        expect((await call('/routes/service', await bearer(identity.serviceToken()))).status).toBe(
            200,
        );
    });

    it('UC-14: маршрут без декораторов принимает любой действительный токен и кладёт Principal в request.principal', async () => {
        const service = await call('/routes/open', await bearer(identity.serviceToken()));
        const agent = await call('/routes/open', await bearer(orchestrator.agentToken()));

        expect(service).toMatchObject({
            status: 200,
            body: { kind: 'service', sub: 'verdeect-platform' },
        });
        expect(agent).toMatchObject({ status: 200, body: { kind: 'agent', sub: 'acc_test_user' } });
    });

    it('UC-14: декоратор метода перекрывает декоратор класса', async () => {
        const token = await bearer(identity.serviceToken({ scope: 'identity:users.read' }));

        expect((await call('/class-scope/inherited', token)).code).toBe('SCOPE_REQUIRED');
        expect((await call('/class-scope/overridden', token)).status).toBe(200);
    });

    it('UC-14: порядок проверок — сервисный токен на @RequireUser + @RequireTenant → 403, не 409', async () => {
        const result = await call('/routes/user-tenant', await bearer(identity.serviceToken()));

        expect(result.status).toBe(403);
        expect(result.code).toBe('USER_TOKEN_REQUIRED');
    });

    it("UC-14: @RequireUser и @RequireService на одном маршруте → ошибка конфигурации guard'а, ответ 500", async () => {
        expect((await call('/routes/conflict', await bearer(identity.userToken()))).status).toBe(
            500,
        );
    });

    it('UC-14: VerdeectAuthModule.forRootAsync с фабрикой и inject регистрирует verifier — защищённый маршрут отвечает 200 на действительный токен', async () => {
        @Module({
            providers: [{ provide: TEST_ISSUERS, useValue: [identity.issuer] }],
            exports: [TEST_ISSUERS],
        })
        class IssuersModule {}

        const asyncApp = await startApp({
            imports: [
                VerdeectAuthModule.forRootAsync({
                    imports: [IssuersModule],
                    inject: [TEST_ISSUERS],
                    useFactory: (issuers: TrustedIssuer[]) => ({
                        issuers,
                        resource: TEST_RESOURCE,
                    }),
                }),
            ],
            controllers: [RoutesController],
        });
        try {
            const response = await asyncApp.inject({
                method: 'GET',
                url: '/routes/user',
                headers: { authorization: `Bearer ${await identity.userToken()}` },
            });

            expect(response.statusCode).toBe(200);
        } finally {
            await asyncApp.close();
        }
    });

    it('UC-14: @RequireScope() без областей → ошибка при объявлении', () => {
        expect(() => RequireScope()).toThrow(/at least one scope/);
    });
});

describe('UC-14: VerdeectAuthModule глобальный по умолчанию', () => {
    it('UC-14: forRoot только в корне, @UseGuards в функциональных модулях → приложение стартует, guard работает, verifier и кэш JWKS одни на приложение', async () => {
        const signer = await createTestSigner();
        seenVerifiers.length = 0;
        const app = await startApp({
            imports: [
                VerdeectAuthModule.forRoot({ issuers: [signer.issuer], resource: TEST_RESOURCE }),
                FeatureAModule,
                FeatureBModule,
            ],
        });
        try {
            const authorization = `Bearer ${await signer.userToken()}`;
            const a = await app.inject({
                method: 'GET',
                url: '/feature-a',
                headers: { authorization },
            });
            const b = await app.inject({
                method: 'GET',
                url: '/feature-b',
                headers: { authorization },
            });
            const anonymous = await app.inject({ method: 'GET', url: '/feature-b' });

            expect([a.statusCode, b.statusCode, anonymous.statusCode]).toEqual([200, 200, 401]);
            expect(seenVerifiers).toHaveLength(2);
            expect(seenVerifiers[0]).toBe(seenVerifiers[1]);
            expect(seenVerifiers[0]).toBe(app.get(VERDEECT_VERIFIER));
            // V-3 по приложению: оба модуля делят один кэш JWKS.
            expect(signer.jwksRequests()).toBe(1);
        } finally {
            await app.close();
            await signer.close();
        }
    });
});

describe('UC-14: логи VerdeectAuthGuard', () => {
    it('UC-14: iss и kid неподписанного токена в WARN обрезаются до 256 символов, токена в логе нет', async () => {
        const signer = await createTestSigner();
        const warnings: unknown[][] = [];
        const capture: LoggerService = {
            log: () => undefined,
            error: () => undefined,
            debug: () => undefined,
            verbose: () => undefined,
            warn: (...args: unknown[]) => warnings.push(args),
        };
        const app = await startApp(
            {
                imports: [
                    VerdeectAuthModule.forRoot({
                        issuers: [signer.issuer],
                        resource: TEST_RESOURCE,
                    }),
                ],
                controllers: [RoutesController],
            },
            capture,
        );
        try {
            const iss = `https://evil.example/${'a'.repeat(5000)}`;
            const kid = 'k'.repeat(5000);
            const token = signer.forge(
                { typ: 'at+jwt', alg: 'EdDSA', kid },
                { iss, aud: TEST_RESOURCE },
            );

            const response = await app.inject({
                method: 'GET',
                url: '/routes/open',
                headers: { authorization: `Bearer ${token}` },
            });

            expect(response.statusCode).toBe(401);
            expect(warnings).toHaveLength(1);
            expect(warnings[0]?.[0]).toEqual({
                rule: 'V-2',
                reason: 'issuer_unknown',
                iss: iss.slice(0, 256),
                kid: kid.slice(0, 256),
            });
            expect(JSON.stringify(warnings)).not.toContain(token);
        } finally {
            await app.close();
            await signer.close();
        }
    });
});
