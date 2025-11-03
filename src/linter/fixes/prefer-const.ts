import type * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider specifically for prefer-const rule
 */
export class PreferConstFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["prefer-const"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []
        const hint = this.extractHint(diagnostic)

        if (hint && hint.includes("Use `const` instead")) {
            const constFix = this.createConstReplacementFix(diagnostic, document)
            if (constFix) {
                actions.push(constFix)
            }
        }

        return actions
    }

    private createConstReplacementFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Replace 'let' with 'const' in the line
        const constLine = lineText.replace(/\blet\b/, "const")

        if (constLine === lineText) {
            // No 'let' found to replace
            return null
        }

        return this.createReplacementFix(
            diagnostic,
            document,
            constLine,
            "Use `const` instead",
            true, // replace full line
        )
    }
}
