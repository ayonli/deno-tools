import * as vscode from "vscode"
import { BaseFixProvider } from "./base.ts"

/**
 * Reusable base class for fixes that replace text in the document
 */
export abstract class TextReplacementFixProvider extends BaseFixProvider {
    protected createReplacementFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        replacement: string,
        actionTitle: string,
        replaceFullLine: boolean = false,
    ): vscode.CodeAction {
        const action = this.createAction(actionTitle)
        const edit = new vscode.WorkspaceEdit()

        if (replaceFullLine) {
            const line = diagnostic.range.start.line
            const lineText = document.lineAt(line).text
            const fullLineRange = new vscode.Range(
                new vscode.Position(line, 0),
                new vscode.Position(line, lineText.length),
            )
            edit.replace(document.uri, fullLineRange, replacement)
        } else {
            edit.replace(document.uri, diagnostic.range, replacement)
        }

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }
}
