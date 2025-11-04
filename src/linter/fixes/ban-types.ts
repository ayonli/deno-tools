import * as vscode from "vscode"
import { UseInsteadFixProviderBase } from "./bases/use-instead-base.ts"

/**
 * Fix provider for ban-types rule that converts banned types to their recommended alternatives
 */
export class BanTypesFixProvider extends UseInsteadFixProviderBase {
    readonly ruleCodes = ["ban-types"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        // First try the standardized "use instead" pattern from hint
        const useInsteadFix = this.createUseInsteadFix(diagnostic, document)
        if (useInsteadFix) {
            return [useInsteadFix]
        }

        // Fallback to custom logic for specific banned types
        const hint = this.extractHint(diagnostic)
        const bannedText = document.getText(diagnostic.range)
        const replacement = this.getCustomReplacement(bannedText, hint)

        if (!replacement) {
            return []
        }

        const action = this.createReplacementAction(diagnostic, document, replacement)
        return [action]
    }

    private getCustomReplacement(bannedText: string, hint: string | null): string | null {
        if (!hint) {
            return null
        }

        // Handle special cases that don't follow the standard "Use X instead" pattern
        if (bannedText === "Function") {
            return "(...args: unknown[]) => unknown"
        } else if (bannedText === "{}") {
            return "Record<PropertyKey, never>"
        }

        return null
    }
}
