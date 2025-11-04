import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"
import { UseInsteadHelper } from "./bases/use-instead-base.ts"

/**
 * General fix provider for rules that don't have specific implementations
 */
export class GeneralFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["*"] // Handles any rule not covered by specific providers

    canHandle(_diagnostic: vscode.Diagnostic): boolean {
        // This is a fallback provider, so it can handle anything
        return true
    }

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []
        const hint = this.extractHint(diagnostic)

        if (hint) {
            // Try to create a hint-based fix
            const hintFix = this.createHintBasedFix(diagnostic, document, hint)
            if (hintFix) {
                actions.push(hintFix)
            }
        }

        return actions
    }

    private createHintBasedFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        hint: string,
    ): vscode.CodeAction | null {
        // Use the standardized helper for "Use X instead" patterns
        const replacement = UseInsteadHelper.extractReplacementFromHint(hint)
        if (replacement) {
            return UseInsteadHelper.createReplacementAction(this, diagnostic, document, replacement)
        }

        return null
    }
}
