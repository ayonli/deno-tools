import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-sloppy-imports rule
 * Adds .ts extension to imports identified by the linter as sloppy
 * Examples:
 * - './module' -> './module.ts'
 * - '../utils' -> '../utils.ts'
 * - '@/components/Button' -> '@/components/Button.ts'
 */
export class NoSloppyImportsFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-sloppy-imports"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const addExtensionFix = this.createAddExtensionFix(diagnostic, document)
        if (addExtensionFix) {
            actions.push(addExtensionFix)
        }

        return actions
    }

    private createAddExtensionFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        // Get the import path with quotes from the diagnostic range
        const importPathWithQuotes = document.getText(diagnostic.range)

        // Find the closing quote and insert .ts before it
        const lastChar = importPathWithQuotes.slice(-1)
        if (lastChar === '"' || lastChar === "'" || lastChar === "`") {
            const pathWithoutClosingQuote = importPathWithQuotes.slice(0, -1)
            const updatedImportPath = `${pathWithoutClosingQuote}.ts${lastChar}`

            const action = this.createAction("Add .ts extension to import")
            const edit = new vscode.WorkspaceEdit()

            // Replace the diagnostic range with the updated path
            edit.replace(document.uri, diagnostic.range, updatedImportPath)
            action.edit = edit
            action.diagnostics = [diagnostic]

            return action
        }

        return null
    }
}
