import type * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider for no-var rule
 * Replaces 'var' with 'let' since var variables are typically reassigned
 */
export class NoVarFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["no-var"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const letFix = this.createLetReplacementFix(diagnostic, document)
        if (letFix) {
            actions.push(letFix)
        }

        return actions
    }

    private createLetReplacementFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Replace 'var' with 'let' in the line
        const letLine = lineText.replace(/\bvar\b/, "let")

        if (letLine === lineText) {
            // No 'var' found to replace
            return null
        }

        // Extract hint from diagnostic, fallback to default message
        const hint = this.extractHint(diagnostic)
        const actionTitle = hint || "Use `let` instead"

        return this.createReplacementFix(
            diagnostic,
            document,
            letLine,
            actionTitle,
            true, // replace full line
        )
    }
}
