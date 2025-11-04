import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-setter-return rule
 * Removes return statements from setter methods
 * Examples:
 * - return value; -> (removed)
 * - return; -> (removed)
 */
export class NoSetterReturnFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-setter-return"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const removeReturnFix = this.createRemoveReturnFix(diagnostic, document)
        if (removeReturnFix) {
            actions.push(removeReturnFix)
        }

        return actions
    }

    private createRemoveReturnFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const action = this.createAction("Remove the return statement")
        const edit = new vscode.WorkspaceEdit()

        // Remove everything within the diagnostic range
        edit.delete(document.uri, diagnostic.range)
        action.edit = edit
        action.diagnostics = [diagnostic]

        return action
    }
}
