import * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider for ban-types rule that converts banned types to their recommended alternatives
 */
export class BanTypesFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["ban-types"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const hint = this.extractHint(diagnostic)
        const bannedText = document.getText(diagnostic.range)

        // Determine replacement based on the banned type and hint
        const replacement = this.getReplacement(bannedText, hint)

        if (!replacement) {
            return []
        }

        const action = this.createReplacementFix(
            diagnostic,
            document,
            replacement,
            `Use \`${replacement}\` instead`,
            false,
        )

        return [action]
    }

    private getReplacement(bannedText: string, hint: string | null): string | null {
        if (!hint) {
            return null
        }

        const useTypeMatch = hint.match(/[Us]se\s+`([^`]+)`\s+instead/)

        if (useTypeMatch) {
            return useTypeMatch[1]
        } else if (bannedText === "Function") {
            return "(...args: unknown[]) => unknown"
        } else if (bannedText === "{}") {
            return "Record<PropertyKey, never>"
        }

        return null
    }
}
