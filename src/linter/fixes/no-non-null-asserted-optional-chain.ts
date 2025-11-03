import type * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider for no-non-null-asserted-optional-chain rule
 * Removes non-null assertion operator '!' after optional chaining
 */
export class NoNonNullAssertedOptionalChainFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["no-non-null-asserted-optional-chain"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Remove the '!' character from the end of the diagnostic text
        const diagnosticText = document.getText(diagnostic.range)

        if (diagnosticText.includes("!")) {
            // Extract hint from diagnostic, fallback to default message
            const hint = this.extractHint(diagnostic)
            const actionTitle = hint || "Remove non-null assertion"

            const fix = this.createReplacementFix(
                diagnostic,
                document,
                diagnosticText.slice(0, -1), // Remove the last character (!)
                actionTitle,
                false, // don't replace full line, just the diagnostic range
            )
            actions.push(fix)
        }

        return actions
    }
}
