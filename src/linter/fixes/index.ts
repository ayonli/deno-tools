// Export base classes
export { BaseFixProvider } from "./bases/base.ts"
export type { FixProvider } from "./bases/base.ts"
export { UnderscorePrefixFixProvider } from "./bases/underscore-prefix-base.ts"
export { ImportFixProviderBase } from "./bases/import-fix-base.ts"
export { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"
export { UseInsteadFixProviderBase, UseInsteadHelper } from "./bases/use-instead-base.ts"

// Export rule-specific fix providers
export { NoUnusedVarsFixProvider } from "./no-unused-vars.ts"
export { PreferConstFixProvider } from "./prefer-const.ts"
export { NoProcessGlobalFixProvider } from "./no-process-global.ts"
export { NoNodeGlobalsFixProvider } from "./no-node-globals.ts"
export { NoPrototypeBuiltinsFixProvider } from "./no-prototype-builtins.ts"
export { NoSetterReturnFixProvider } from "./no-setter-return.ts"
export { NoSloppyImportsFixProvider } from "./no-sloppy-imports.ts"
export { NoSparseArraysFixProvider } from "./no-sparse-arrays.ts"
export { NoThrowLiteralFixProvider } from "./no-throw-literal.ts"
export { EqeqeqFixProvider } from "./eqeqeq.ts"
export { NoCaseDeclarationsFixProvider } from "./no-case-declarations.ts"
export { NoImportAssertionsFixProvider } from "./no-import-assertions.ts"
export { NoFallthroughFixProvider } from "./no-fallthrough.ts"
export { NoInferrableTypesFixProvider } from "./no-inferrable-types.ts"
export { NoInvalidTripleSlashReferenceFixProvider } from "./no-invalid-triple-slash-reference.ts"
export { NoMisusedNewFixProvider } from "./no-misused-new.ts"
export { NoNewSymbolFixProvider } from "./no-new-symbol.ts"
export { NoNonNullAssertedOptionalChainFixProvider } from "./no-non-null-asserted-optional-chain.ts"
export { NoOctalFixProvider } from "./no-octal.ts"
export { NoVarFixProvider } from "./no-var.ts"
export { NoUselessRenameFixProvider } from "./no-useless-rename.ts"
export { RequireAwaitFixProvider } from "./require-await.ts"
export { RequireYieldFixProvider } from "./require-yield.ts"
export { VerbatimModuleSyntaxFixProvider } from "./verbatim-module-syntax.ts"
export { BanTypesFixProvider } from "./ban-types.ts"
export { BanUnknownRuleCodeFixProvider } from "./ban-unknown-rule-code.ts"
export { GeneralFixProvider } from "./general.ts"
export { DisableRuleFixProvider } from "./disable-rule.ts"

// Import for convenience function
import type { FixProvider } from "./bases/base.ts"
import { NoUnusedVarsFixProvider } from "./no-unused-vars.ts"
import { PreferConstFixProvider } from "./prefer-const.ts"
import { NoProcessGlobalFixProvider } from "./no-process-global.ts"
import { NoNodeGlobalsFixProvider } from "./no-node-globals.ts"
import { NoPrototypeBuiltinsFixProvider } from "./no-prototype-builtins.ts"
import { NoSetterReturnFixProvider } from "./no-setter-return.ts"
import { NoSloppyImportsFixProvider } from "./no-sloppy-imports.ts"
import { NoSparseArraysFixProvider } from "./no-sparse-arrays.ts"
import { NoThrowLiteralFixProvider } from "./no-throw-literal.ts"
import { EqeqeqFixProvider } from "./eqeqeq.ts"
import { NoCaseDeclarationsFixProvider } from "./no-case-declarations.ts"
import { NoImportAssertionsFixProvider } from "./no-import-assertions.ts"
import { NoFallthroughFixProvider } from "./no-fallthrough.ts"
import { NoInferrableTypesFixProvider } from "./no-inferrable-types.ts"
import { NoInvalidTripleSlashReferenceFixProvider } from "./no-invalid-triple-slash-reference.ts"
import { NoMisusedNewFixProvider } from "./no-misused-new.ts"
import { NoNewSymbolFixProvider } from "./no-new-symbol.ts"
import { NoNonNullAssertedOptionalChainFixProvider } from "./no-non-null-asserted-optional-chain.ts"
import { NoOctalFixProvider } from "./no-octal.ts"
import { NoVarFixProvider } from "./no-var.ts"
import { NoUselessRenameFixProvider } from "./no-useless-rename.ts"
import { RequireAwaitFixProvider } from "./require-await.ts"
import { RequireYieldFixProvider } from "./require-yield.ts"
import { VerbatimModuleSyntaxFixProvider } from "./verbatim-module-syntax.ts"
import { BanTypesFixProvider } from "./ban-types.ts"
import { BanUnknownRuleCodeFixProvider } from "./ban-unknown-rule-code.ts"
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
        new NoPrototypeBuiltinsFixProvider(),
        new NoSetterReturnFixProvider(),
        new NoSloppyImportsFixProvider(),
        new NoSparseArraysFixProvider(),
        new NoThrowLiteralFixProvider(),
        new EqeqeqFixProvider(),
        new NoCaseDeclarationsFixProvider(),
        new NoImportAssertionsFixProvider(),
        new NoFallthroughFixProvider(),
        new NoInferrableTypesFixProvider(),
        new NoInvalidTripleSlashReferenceFixProvider(),
        new NoMisusedNewFixProvider(),
        new NoNewSymbolFixProvider(),
        new NoNonNullAssertedOptionalChainFixProvider(),
        new NoOctalFixProvider(),
        new NoVarFixProvider(),
        new NoUselessRenameFixProvider(),
        new RequireAwaitFixProvider(),
        new RequireYieldFixProvider(),
        new VerbatimModuleSyntaxFixProvider(),
        new BanTypesFixProvider(),
        new BanUnknownRuleCodeFixProvider(),
        new GeneralFixProvider(), // Should be last as it's a fallback
    ]
}

/**
 * Get the disable rule fix provider separately since it applies to all rules
 */
export function getDisableRuleProvider(): DisableRuleFixProvider {
    return new DisableRuleFixProvider()
}
