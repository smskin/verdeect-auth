// VerdeectAuthModule (prd.md §7.5; 01 §5.3). generic: динамический модуль библиотеки, не модуль домена сервиса.
// Регистрирует Verifier под VERDEECT_VERIFIER и VerdeectAuthGuard; как подключать guard — решает потребитель.
// По умолчанию глобальный: один verifier и один кэш JWKS на приложение, иначе окно V-3 (≤ раз в 60 с)
// действует по модулю, а не по приложению, и @UseGuards в функциональном модуле не находит verifier.
import {
    Logger,
    Module,
    type DynamicModule,
    type FactoryProvider,
    type ModuleMetadata,
    type Provider,
} from '@nestjs/common';
import { createVerifier } from '../verifier.js';
import { VERDEECT_VERIFIER, VerdeectAuthGuard } from './verdeect-auth.guard.js';
import type { Verifier, VerifierOptions } from '../index.js';

export interface VerdeectAuthModuleOptions {
    /** По умолчанию true; false — только для изоляции (свой verifier в отдельном модуле). */
    readonly isGlobal?: boolean;
}

export interface VerdeectAuthAsyncOptions extends VerdeectAuthModuleOptions {
    readonly imports?: ModuleMetadata['imports'];
    readonly inject?: FactoryProvider['inject'];
    /** Аргументы фабрики — провайдеры из inject (например, ConfigService потребителя). */
    readonly useFactory: (...args: never[]) => VerifierOptions | Promise<VerifierOptions>;
}

const logger = new Logger('VerdeectAuthModule');

function buildVerifier(options: VerifierOptions): Verifier {
    logger.debug(
        {
            issuers: options.issuers.map((issuer) => ({
                iss: issuer.iss,
                kinds: issuer.kinds ?? ['user', 'service'],
            })),
            resource: options.resource,
        },
        '[VerdeectAuthModule.buildVerifier] verifier created',
    );

    return createVerifier(options);
}

@Module({})
export class VerdeectAuthModule {
    static forRoot(
        options: VerifierOptions,
        moduleOptions: VerdeectAuthModuleOptions = {},
    ): DynamicModule {
        return VerdeectAuthModule.build(moduleOptions.isGlobal ?? true, [], {
            provide: VERDEECT_VERIFIER,
            useFactory: () => buildVerifier(options),
        });
    }

    static forRootAsync(options: VerdeectAuthAsyncOptions): DynamicModule {
        return VerdeectAuthModule.build(options.isGlobal ?? true, options.imports ?? [], {
            provide: VERDEECT_VERIFIER,
            inject: options.inject ?? [],
            useFactory: async (...args: unknown[]) =>
                buildVerifier(await options.useFactory(...(args as never[]))),
        });
    }

    private static build(
        global: boolean,
        imports: NonNullable<ModuleMetadata['imports']>,
        verifier: Provider,
    ): DynamicModule {
        return {
            module: VerdeectAuthModule,
            global,
            imports,
            providers: [verifier, VerdeectAuthGuard],
            exports: [VERDEECT_VERIFIER, VerdeectAuthGuard],
        };
    }
}
