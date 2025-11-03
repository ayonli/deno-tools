import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-fallthrough rule
 * Adds missing 'break' statements to switch case branches
 */
export class NoFallthroughFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-fallthrough"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Get the range of the case block that needs a break statement
        const caseRange = this.findCaseBlockRange(diagnostic, document)

        if (caseRange) {
            const fix = this.createBreakStatementFix(
                diagnostic,
                document,
                caseRange,
                "Add `break`",
            )
            actions.push(fix)
        }

        return actions
    }

    private findCaseBlockRange(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.Range | null {
        // Start from the diagnostic line and find the case block
        const startLine = diagnostic.range.start.line

        // Look backward to find the case statement
        let caseStartLine = startLine
        for (let line = startLine; line >= 0; line--) {
            const lineText = document.lineAt(line).text
            if (lineText.trim().match(/^case\s+.+:|^default\s*:/)) {
                caseStartLine = line
                break
            }
        }

        // Look forward to find the end of the case block (next case/default or closing brace)
        let caseEndLine = startLine
        const totalLines = document.lineCount

        for (let line = caseStartLine + 1; line < totalLines; line++) {
            const lineText = document.lineAt(line).text.trim()

            // Stop at next case, default, or closing brace
            if (lineText.match(/^case\s+.+:|^default\s*:|^\}/)) {
                caseEndLine = line - 1
                break
            }

            // If we find a break/return/throw, this case doesn't need a fix
            if (lineText.match(/^(break|return|throw)\s*[^;]*;?\s*$/)) {
                return null
            }

            caseEndLine = line
        }

        // Find the last non-empty line in the case block to insert break before next case
        while (
            caseEndLine > caseStartLine &&
            document.lineAt(caseEndLine).text.trim() === ""
        ) {
            caseEndLine--
        }

        return new vscode.Range(
            caseStartLine,
            0,
            caseEndLine,
            document.lineAt(caseEndLine).text.length,
        )
    }

    private createBreakStatementFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        caseRange: vscode.Range,
        actionTitle: string,
    ): vscode.CodeAction {
        const action = this.createAction(actionTitle)
        const edit = new vscode.WorkspaceEdit()

        // Insert break statement at the end of the case block
        const endLine = caseRange.end.line

        // Determine indentation from the case block
        const indentation = this.getIndentation(document, caseRange.start.line)

        // Insert break statement with proper indentation
        const insertPosition = new vscode.Position(endLine + 1, 0)
        const breakStatement = `${indentation}    break;\n`

        edit.insert(document.uri, insertPosition, breakStatement)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    private getIndentation(document: vscode.TextDocument, lineNumber: number): string {
        const lineText = document.lineAt(lineNumber).text
        const match = lineText.match(/^(\s*)/)
        return match ? match[1] : ""
    }
}
