// Все экспорты трёх подпутей (prd.md §8; AC-3, EC-1): файл только компилируется tsc при NodeNext и bundler.
import { createVerifier, VerifyError } from '@verdeect/auth';
import type {
    AgentPrincipal,
    Principal,
    ServicePrincipal,
    TokenKind,
    TrustedIssuer,
    UserPrincipal,
    Verifier,
    VerifierOptions,
    VerifyReason,
    VerifyRule,
} from '@verdeect/auth';
import {
    principalOf,
    RequireScope,
    RequireService,
    RequireTenant,
    RequireUser,
    VERDEECT_VERIFIER,
    VerdeectAuthGuard,
    VerdeectAuthModule,
} from '@verdeect/auth/nest';
import type {
    PrincipalCarrier,
    VerdeectAuthAsyncOptions,
    VerdeectAuthModuleOptions,
} from '@verdeect/auth/nest';
import {
    createTestSigner,
    TEST_IDENTITY_ISS,
    TEST_ORCHESTRATOR_ISS,
    TEST_RESOURCE,
    tokenVectors,
} from '@verdeect/auth/testing';
import type {
    Claims,
    Header,
    TestSigner,
    TestSignerOptions,
    TokenVector,
    VectorExpectation,
    VectorSigners,
} from '@verdeect/auth/testing';

export type CoreTypes = [
    TokenKind,
    TrustedIssuer,
    VerifierOptions,
    UserPrincipal,
    ServicePrincipal,
    AgentPrincipal,
    Principal,
    Verifier,
    VerifyReason,
    VerifyRule,
];

export type NestTypes = [PrincipalCarrier, VerdeectAuthModuleOptions, VerdeectAuthAsyncOptions];

export type TestingTypes = [
    Claims,
    Header,
    TestSigner,
    TestSignerOptions,
    TokenVector,
    VectorExpectation,
    VectorSigners,
];

export function allValues(): readonly unknown[] {
    return [
        createVerifier,
        VerifyError,
        VerdeectAuthModule,
        VerdeectAuthGuard,
        VERDEECT_VERIFIER,
        RequireTenant,
        RequireScope,
        RequireUser,
        RequireService,
        principalOf,
        createTestSigner,
        tokenVectors,
        TEST_IDENTITY_ISS,
        TEST_ORCHESTRATOR_ISS,
        TEST_RESOURCE,
    ];
}
