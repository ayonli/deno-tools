import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-debugger rule
 * Removes debugger statements from the code
 * Example: debugger; -> (removed)
 */
export class NoDebuggerFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-debugger"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const removeDebuggerAction = this.createRemoveDebuggerAction(diagnostic, document)
        actions.push(removeDebuggerAction)

        return actions
    }

    /**
     * Create action to remove debugger statement
     */
    private createRemoveDebuggerAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction {
        const action = this.createAction("Remove `debugger` statement")

        const edit = new vscode.WorkspaceEdit()
        const diagnosticRange = diagnostic.range

        // Get the line containing the debugger statement
        const line = document.lineAt(diagnosticRange.start.line)
        const lineText = line.text

        // Check if the entire line is just the debugger statement (with possible whitespace)
        const trimmedLine = lineText.trim()
        if (trimmedLine === "debugger" || trimmedLine === "debugger;") {
            // Remove the entire line including the newline
            const fullLineRange = new vscode.Range(
                new vscode.Position(diagnosticRange.start.line, 0),
                new vscode.Position(diagnosticRange.start.line + 1, 0),
            )
            edit.delete(document.uri, fullLineRange)
        } else {
            // Just remove the debugger statement from within the line
            // Find the exact position of "debugger" in the line
            const debuggerStart = lineText.indexOf("debugger")
            if (debuggerStart !== -1) {
                let debuggerEnd = debuggerStart + 8 // length of "debugger"

                // Check if there's a semicolon after debugger
                if (lineText[debuggerEnd] === ";") {
                    debuggerEnd += 1
                }

                // Include any trailing whitespace
                while (debuggerEnd < lineText.length && /\s/.test(lineText[debuggerEnd])) {
                    debuggerEnd += 1
                }

                const removeRange = new vscode.Range(
                    new vscode.Position(diagnosticRange.start.line, debuggerStart),
                    new vscode.Position(diagnosticRange.start.line, debuggerEnd),
                )
                edit.delete(document.uri, removeRange)
            } else {
                // Fallback: use the diagnostic range
                edit.delete(document.uri, diagnosticRange)
            }
        }

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }
}
