import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for ban-untagged-ignore rule
 * Removes bare deno-lint-ignore comments without any specific rules
 * Note: deno-lint-ignore-file without rules is legal and not handled by this provider
 */
export class BanUntaggedIgnoreFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["ban-untagged-ignore"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Find the bare ignore comment line
        const ignoreCommentLine = this.findBareIgnoreComment(document, diagnostic.range)
        if (ignoreCommentLine === null) {
            return actions
        }

        // Create action to remove the bare ignore comment
        const removeAction = this.createRemoveBareIgnoreAction(
            diagnostic,
            document,
            ignoreCommentLine,
        )
        actions.push(removeAction)

        return actions
    }

    /**
     * Find the line containing the bare ignore comment
     */
    private findBareIgnoreComment(
        document: vscode.TextDocument,
        diagnosticRange: vscode.Range,
    ): number | null {
        const startLine = Math.max(0, diagnosticRange.start.line - 5)
        const endLine = Math.min(document.lineCount - 1, diagnosticRange.end.line + 2)

        for (let i = startLine; i <= endLine; i++) {
            const line = document.lineAt(i)
            const text = line.text.trim()

            // Check if this line contains a bare deno-lint-ignore comment
            if (/^\/\/\s*deno-lint-ignore\s*$/.test(text)) {
                return i
            }
        }

        return null
    }

    /**
     * Create action to remove the bare ignore comment
     */
    private createRemoveBareIgnoreAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        lineNumber: number,
    ): vscode.CodeAction {
        const action = this.createAction("Remove bare 'deno-lint-ignore' comment")

        const edit = new vscode.WorkspaceEdit()

        // Remove the entire line including the newline
        const range = new vscode.Range(
            new vscode.Position(lineNumber, 0),
            new vscode.Position(lineNumber + 1, 0),
        )

        edit.delete(document.uri, range)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }
}
