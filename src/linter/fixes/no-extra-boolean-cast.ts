import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-extra-boolean-cast rule
 * Removes unnecessary boolean casts (!! operator and Boolean() constructor)
 * Examples:
 *   if (!!value) -> if (value)
 *   if (Boolean(value)) -> if (value)
 */
export class NoExtraBooleanCastFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-extra-boolean-cast"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const removeBooleanCastAction = this.createRemoveBooleanCastAction(diagnostic, document)
        if (removeBooleanCastAction) {
            actions.push(removeBooleanCastAction)
        }

        return actions
    }

    private createRemoveBooleanCastAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const action = this.createAction("Remove unnecessary boolean cast")
        const edit = new vscode.WorkspaceEdit()
        const diagnosticText = document.getText(diagnostic.range)

        // Check if this is a !! pattern
        if (diagnosticText.startsWith("!!")) {
            // Remove the leading !!
            const newContent = diagnosticText.slice(2).trimStart()
            edit.replace(document.uri, diagnostic.range, newContent)
        } else if (diagnosticText.startsWith("Boolean(") && diagnosticText.endsWith(")")) {
            // Extract the content inside Boolean(...)
            const innerContent = diagnosticText.slice(8, -1).trim()
            edit.replace(document.uri, diagnostic.range, innerContent)
        }

        action.edit = edit
        return action
    }
}
