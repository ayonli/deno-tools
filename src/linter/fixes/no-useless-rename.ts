import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-useless-rename rule
 * Removes unnecessary renames in import statements and object destructuring
 * Examples:
 * - import { foo as foo } from './module' -> import { foo } from './module'
 * - const { bar: bar } = obj -> const { bar } = obj
 */
export class NoUselessRenameFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-useless-rename"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const removeUselessRenameFix = this.createRemoveUselessRenameFix(diagnostic, document)
        if (removeUselessRenameFix) {
            actions.push(removeUselessRenameFix)
        }

        return actions
    }

    private createRemoveUselessRenameFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Try to fix useless renames in the line
        const updatedLine = this.removeUselessRenames(lineText)

        if (updatedLine !== lineText) {
            const action = this.createAction("Remove useless rename")
            const edit = new vscode.WorkspaceEdit()

            // Replace the entire line
            const lineRange = new vscode.Range(
                new vscode.Position(line, 0),
                new vscode.Position(line, lineText.length),
            )
            edit.replace(document.uri, lineRange, updatedLine)
            action.edit = edit
            action.diagnostics = [diagnostic]

            return action
        }

        return null
    }

    private removeUselessRenames(lineText: string): string {
        let updatedLine = lineText

        // Handle import statements with useless renames
        // Pattern: import { foo as foo } -> import { foo }
        updatedLine = updatedLine.replace(
            /\b(\w+)\s+as\s+\1\b/g,
            "$1",
        )

        // Handle object destructuring with useless renames
        // Pattern: { bar: bar } -> { bar }
        updatedLine = updatedLine.replace(
            /\b(\w+):\s*\1\b/g,
            "$1",
        )

        return updatedLine
    }
}
