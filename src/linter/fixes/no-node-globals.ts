import * as vscode from "vscode"
import { ImportFixProviderBase } from "./bases/import-fix-base.ts"
import { UseInsteadHelper } from "./bases/use-instead-base.ts"

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
            const importMatch = hint.match(/add\s+`([^`]+)`/i)
            if (importMatch) {
                const importStatement = importMatch[1]
                const importFix = this.createImportFix(diagnostic, document, importStatement, hint)
                actions.push(importFix)
            }

            // Check for replacement suggestions (like "Use globalThis instead")
            const useInsteadFix = UseInsteadHelper.createUseInsteadFix(this, diagnostic, document)
            if (useInsteadFix) {
                actions.push(useInsteadFix)
            }
        }

        return actions
    }
}
