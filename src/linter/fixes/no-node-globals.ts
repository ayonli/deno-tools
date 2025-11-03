import * as vscode from "vscode"
import { ImportFixProviderBase } from "./bases/import-fix-base.ts"

/**
 * Fix provider specifically for no-node-globals rule
 * This rule can suggest both imports and replacements
 */
export class NoNodeGlobalsFixProvider extends ImportFixProviderBase {
    readonly ruleCodes = ["no-node-globals"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []
        const hint = this.extractHint(diagnostic)

        if (hint) {
            // Check for import suggestions
            const importMatch = hint.match(/Add `([^`]+)`/)
            if (importMatch) {
                const importStatement = importMatch[1]
                const importFix = this.createImportFix(diagnostic, document, importStatement, hint)
                actions.push(importFix)
            }

            // Check for replacement suggestions (like "Use globalThis instead")
            const replaceMatch = hint.match(/Use `([^`]+)` instead/)
            if (replaceMatch) {
                const replacement = replaceMatch[1]
                const replaceFix = this.createReplacementFix(diagnostic, document, replacement)
                actions.push(replaceFix)
            }
        }

        return actions
    }

    private createReplacementFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        replacement: string,
    ): vscode.CodeAction {
        const action = this.createAction(`Use ${replacement} instead`)
        const edit = new vscode.WorkspaceEdit()
        edit.replace(document.uri, diagnostic.range, replacement)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }
}
