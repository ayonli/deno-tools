import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for constructor-super rule
 * Handles adding or removing super() calls in constructors
 */
export class ConstructorSuperFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["constructor-super"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Check if we need to remove super()
        const removeFix = this.createRemoveSuperFix(diagnostic, document)
        if (removeFix) {
            actions.push(removeFix)
        }

        return actions
    }

    private createRemoveSuperFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const hint = this.extractHint(diagnostic)
        // Check if the diagnostic message suggests removing super()
        if (!hint?.includes("Remove call to super()")) {
            return null
        }

        const action = this.createAction("Remove super()")
        const edit = new vscode.WorkspaceEdit()

        // The diagnostic range contains the super() call, just delete it
        edit.delete(document.uri, diagnostic.range)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }
}
