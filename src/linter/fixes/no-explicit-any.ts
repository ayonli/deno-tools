import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-explicit-any rule
 * Replaces `any` type with `unknown` type
 * Example: let value: any -> let value: unknown
 */
export class NoExplicitAnyFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-explicit-any"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const replaceWithUnknownAction = this.createReplaceWithUnknownAction(diagnostic, document)
        if (replaceWithUnknownAction) {
            actions.push(replaceWithUnknownAction)
        }

        return actions
    }

    private createReplaceWithUnknownAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const action = this.createAction("Use `unknown` instead")
        const edit = new vscode.WorkspaceEdit()

        // Since the diagnostic range only includes 'any' itself, we can replace it directly
        edit.replace(document.uri, diagnostic.range, "unknown")

        action.edit = edit
        return action
    }
}
