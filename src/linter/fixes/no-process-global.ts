import type * as vscode from "vscode"
import { ImportFixProviderBase } from "./bases/import-fix-base.ts"

/**
 * Fix provider specifically for no-process-global rule
 */
export class NoProcessGlobalFixProvider extends ImportFixProviderBase {
    readonly ruleCodes = ["no-process-global"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []
        const hint = this.extractHint(diagnostic)

        if (hint) {
            const match = hint.match(/Add `([^`]+)`/)
            if (match) {
                const importStatement = match[1]
                const importFix = this.createImportFix(diagnostic, document, importStatement, hint)
                actions.push(importFix)
            }
        }

        return actions
    }
}
