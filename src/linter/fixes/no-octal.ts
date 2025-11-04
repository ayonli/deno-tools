import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-octal rule
 * Converts legacy octal literals to modern 0o prefix format
 * Examples:
 * - 0755 -> 0o755
 * - 0644 -> 0o644
 * - 010 -> 0o10
 */
export class NoOctalFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-octal"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const convertToModernOctalFix = this.createConvertToModernOctalFix(diagnostic, document)
        if (convertToModernOctalFix) {
            actions.push(convertToModernOctalFix)
        }

        return actions
    }

    private createConvertToModernOctalFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        // Get the octal literal from the diagnostic range
        const octalLiteral = document.getText(diagnostic.range)

        // Convert legacy octal (0755) to modern octal (0o755)
        const modernOctal = this.prefixWith0oInstead(octalLiteral)

        if (modernOctal !== octalLiteral) {
            const action = this.createAction("Use `0o` prefix for the octal number")
            const edit = new vscode.WorkspaceEdit()

            // Replace the diagnostic range with the modern octal format
            edit.replace(document.uri, diagnostic.range, modernOctal)
            action.edit = edit
            action.diagnostics = [diagnostic]

            return action
        }

        return null
    }

    private prefixWith0oInstead(octalLiteral: string): string {
        // Legacy octal literals start with 0 followed by octal digits (0-7)
        // Convert 0755 to 0o755, 0644 to 0o644, etc.
        const legacyOctalPattern = /^0([0-7]+)$/
        const match = octalLiteral.match(legacyOctalPattern)

        if (match) {
            const octalDigits = match[1]
            return `0o${octalDigits}`
        }

        return octalLiteral
    }
}
