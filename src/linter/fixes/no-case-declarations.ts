import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider specifically for no-case-declarations rule
 * Automatically adds { and } to case branches with variable declarations
 */
export class NoCaseDeclarationsFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-case-declarations"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Create a fix to wrap the case content in braces
        const fix = this.createCaseBraceFix(diagnostic, document)
        if (fix) {
            actions.push(fix)
        }

        return actions
    }

    private createCaseBraceFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const action = this.createAction("Add braces to case clause")
        const edit = new vscode.WorkspaceEdit()

        const result = this.findCaseClause(diagnostic, document)
        if (!result) {
            return null
        }

        const { caseStartLine, caseEndLine, indentation } = result

        // Insert opening brace after the case label
        const caseLineText = document.lineAt(caseStartLine).text
        const openBraceInsert = new vscode.Position(caseStartLine, caseLineText.length)
        edit.insert(document.uri, openBraceInsert, " {")

        // Insert closing brace before the next case/default or end of switch
        const closeBracePosition = new vscode.Position(caseEndLine + 1, 0)
        edit.insert(document.uri, closeBracePosition, `${indentation}}\n`)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    private findCaseClause(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): { caseStartLine: number; caseEndLine: number; indentation: string } | null {
        const diagnosticLine = diagnostic.range.start.line
        let caseStartLine = -1
        let caseEndLine = -1
        let indentation = ""

        // Find the case/default line by searching backwards from the diagnostic
        for (let i = diagnosticLine; i >= 0; i--) {
            const lineText = document.lineAt(i).text.trim()
            if (lineText.startsWith("case ") || lineText.startsWith("default")) {
                caseStartLine = i
                indentation = document.lineAt(i).text.match(/^(\s*)/)?.[1] || ""
                break
            }
        }

        if (caseStartLine === -1) {
            return null
        }

        // Find the end of this case clause (next case/default or end of switch)
        for (let i = caseStartLine + 1; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text.trim()

            // Check for next case, default, or closing brace of switch
            if (
                lineText.startsWith("case ") ||
                lineText.startsWith("default") ||
                (lineText === "}" && this.isAtSwitchLevel(document, i, caseStartLine))
            ) {
                caseEndLine = i - 1
                break
            }

            // If we reach the end of the document
            if (i === document.lineCount - 1) {
                caseEndLine = i
                break
            }
        }

        if (caseEndLine === -1) {
            return null
        }

        return { caseStartLine, caseEndLine, indentation }
    }

    private isAtSwitchLevel(
        document: vscode.TextDocument,
        closeBraceLine: number,
        caseStartLine: number,
    ): boolean {
        // Simple heuristic: check if the closing brace has the same or less indentation
        // than the case statement, indicating it's likely the switch's closing brace
        const caseIndentation = document.lineAt(caseStartLine).text.match(/^(\s*)/)?.[1] || ""
        const braceIndentation = document.lineAt(closeBraceLine).text.match(/^(\s*)/)?.[1] || ""

        return braceIndentation.length <= caseIndentation.length
    }
}
