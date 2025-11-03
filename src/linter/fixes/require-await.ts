import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for require-await rule
 * Removes 'async' keyword from functions that don't contain await statements
 */
export class RequireAwaitFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["require-await"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const removeAsyncFix = this.createRemoveAsyncFix(diagnostic, document)
        if (removeAsyncFix) {
            actions.push(removeAsyncFix)
        }

        return actions
    }

    private createRemoveAsyncFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        // Get the line containing the async keyword based on diagnostic position
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Find and remove 'async' keyword from the line
        const asyncMatch = lineText.match(/(\s*)async(\s+)/)
        if (!asyncMatch) {
            return null
        }

        // Remove 'async' and normalize spacing
        const updatedLine = lineText.replace(/\basync\s+/, "")

        if (updatedLine === lineText) {
            return null
        }

        const action = this.createAction("Remove `async` keyword")
        const edit = new vscode.WorkspaceEdit()

        // Replace just the line containing the async keyword
        const lineRange = new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line, lineText.length),
        )
        edit.replace(document.uri, lineRange, updatedLine)
        action.edit = edit

        return action
    }
}
