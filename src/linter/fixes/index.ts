// Export base classes
export { BaseFixProvider } from "./bases/base.ts"
export type { FixProvider } from "./bases/base.ts"
export { UnderscorePrefixFixProvider } from "./bases/underscore-prefix-base.ts"
export { ImportFixProviderBase } from "./bases/import-fix-base.ts"
export { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

// Export rule-specific fix providers
export { NoUnusedVarsFixProvider } from "./no-unused-vars.ts"
export { PreferConstFixProvider } from "./prefer-const.ts"
export { NoProcessGlobalFixProvider } from "./no-process-global.ts"
export { NoNodeGlobalsFixProvider } from "./no-node-globals.ts"
export { EqeqeqFixProvider } from "./eqeqeq.ts"
export { NoCaseDeclarationsFixProvider } from "./no-case-declarations.ts"
export { NoImportAssertionsFixProvider } from "./no-import-assertions.ts"
export { NoFallthroughFixProvider } from "./no-fallthrough.ts"
export { NoNewSymbolFixProvider } from "./no-new-symbol.ts"
export { NoNonNullAssertedOptionalChainFixProvider } from "./no-non-null-asserted-optional-chain.ts"
export { NoVarFixProvider } from "./no-var.ts"
export { RequireAwaitFixProvider } from "./require-await.ts"
export { GeneralFixProvider } from "./general.ts"
export { DisableRuleFixProvider } from "./disable-rule.ts"

// Import for convenience function
import type { FixProvider } from "./bases/base.ts"
import { NoUnusedVarsFixProvider } from "./no-unused-vars.ts"
import { PreferConstFixProvider } from "./prefer-const.ts"
import { NoProcessGlobalFixProvider } from "./no-process-global.ts"
import { NoNodeGlobalsFixProvider } from "./no-node-globals.ts"
import { EqeqeqFixProvider } from "./eqeqeq.ts"
import { NoCaseDeclarationsFixProvider } from "./no-case-declarations.ts"
import { NoImportAssertionsFixProvider } from "./no-import-assertions.ts"
import { NoFallthroughFixProvider } from "./no-fallthrough.ts"
import { NoNewSymbolFixProvider } from "./no-new-symbol.ts"
import { NoNonNullAssertedOptionalChainFixProvider } from "./no-non-null-asserted-optional-chain.ts"
import { NoVarFixProvider } from "./no-var.ts"
import { RequireAwaitFixProvider } from "./require-await.ts"
import { GeneralFixProvider } from "./general.ts"
import { DisableRuleFixProvider } from "./disable-rule.ts"

/**
 * Get all available fix providers in order of preference
 */
export function getAllFixProviders(): FixProvider[] {
    return [
        new NoUnusedVarsFixProvider(),
        new PreferConstFixProvider(),
        new NoProcessGlobalFixProvider(),
        new NoNodeGlobalsFixProvider(),
        new EqeqeqFixProvider(),
        new NoCaseDeclarationsFixProvider(),
        new NoImportAssertionsFixProvider(),
        new NoFallthroughFixProvider(),
        new NoNewSymbolFixProvider(),
        new NoNonNullAssertedOptionalChainFixProvider(),
        new NoVarFixProvider(),
        new RequireAwaitFixProvider(),
        new GeneralFixProvider(), // Should be last as it's a fallback
    ]
}

/**
 * Get the disable rule fix provider separately since it applies to all rules
 */
export function getDisableRuleProvider(): DisableRuleFixProvider {
    return new DisableRuleFixProvider()
}
