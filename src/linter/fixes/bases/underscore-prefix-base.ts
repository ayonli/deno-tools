import * as vscode from "vscode"
import { BaseFixProvider } from "./base.ts"

/**
 * Reusable base class for fixes that add underscore prefix to identifiers
 */
export abstract class UnderscorePrefixFixProvider extends BaseFixProvider {
    protected createUnderscorePrefixFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        actionTitle?: string,
    ): vscode.CodeAction {
        const currentText = document.getText(diagnostic.range)
        const newName = `_${currentText}`
        const title = actionTitle || `Prefix '${currentText}' with underscore: ${newName}`

        const action = this.createAction(title)
        const edit = new vscode.WorkspaceEdit()
        edit.replace(document.uri, diagnostic.range, newName)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }
}
