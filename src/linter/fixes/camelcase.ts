import type * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider for camelcase rule
 * Handles converting snake_case identifiers to camelCase
 */
export class CamelcaseFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["camelcase"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Extract the suggested name from the diagnostic message
        const camelCaseFix = this.createCamelCaseReplacementFix(diagnostic, document)
        if (camelCaseFix) {
            actions.push(camelCaseFix)
        }

        return actions
    }

    private createCamelCaseReplacementFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        // Parse the diagnostic message to extract the suggested camelCase name
        // Expected format: "Consider renaming `foo_bar` to `fooBar`"
        const hint = this.extractHint(diagnostic)
        console.log("Diagnostic text:", hint)
        const match = hint?.match(/[Rr]enam(e|ing) `([^`]+)` to `([^`]+)`/)

        if (!match) {
            return null
        }

        const [_0, _1, originalName, suggestedName] = match

        // Verify that the diagnostic range contains the original name
        const diagnosticText = document.getText(diagnostic.range)
        if (diagnosticText !== originalName) {
            return null
        }

        return this.createReplacementFix(
            diagnostic,
            document,
            suggestedName,
            `Rename \`${originalName}\` to \`${suggestedName}\``,
            false, // replace only the specific range
        )
    }
}
