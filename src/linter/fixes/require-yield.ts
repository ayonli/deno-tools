import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for require-yield rule
 * Removes '*' from generator functions that don't contain yield statements
 */
export class RequireYieldFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["require-yield"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const removeGeneratorFix = this.createRemoveGeneratorFix(diagnostic, document)
        if (removeGeneratorFix) {
            actions.push(removeGeneratorFix)
        }

        return actions
    }

    private createRemoveGeneratorFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        // Get the line containing the generator asterisk based on diagnostic position
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Find and remove '*' from function declarations
        // Handle various patterns like:
        // function* name() {}
        // function *name() {}
        // async function* name() {}
        // async function *name() {}
        const generatorMatch = lineText.match(/function\s*\*/)
        if (!generatorMatch) {
            return null
        }

        // Remove the '*' while preserving spacing
        const updatedLine = lineText.replace(/function\s*\*\s*/, (match) => {
            // If there's a space after function and before *, keep one space
            // If there's a space after *, keep it
            if (match.includes(" *")) {
                return "function "
            } else if (match.endsWith("* ")) {
                return "function "
            } else {
                return "function"
            }
        })

        if (updatedLine === lineText) {
            return null
        }

        const action = this.createAction("Remove `*` from the function")
        const edit = new vscode.WorkspaceEdit()

        // Replace the line containing the generator function
        const lineRange = new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line, lineText.length),
        )
        edit.replace(document.uri, lineRange, updatedLine)
        action.edit = edit
        action.diagnostics = [diagnostic]

        return action
    }
}
