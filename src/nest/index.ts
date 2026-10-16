// Точка входа verdeect-auth/nest: модуль, guard и декораторы (prd.md §7.5; 01 §5.3).
export {
    principalOf,
    RequireScope,
    RequireService,
    RequireTenant,
    RequireUser,
    type PrincipalCarrier,
} from './decorators.js';
export { VERDEECT_VERIFIER, VerdeectAuthGuard } from './verdeect-auth.guard.js';
export {
    VerdeectAuthModule,
    type VerdeectAuthAsyncOptions,
    type VerdeectAuthModuleOptions,
} from './verdeect-auth.module.js';
