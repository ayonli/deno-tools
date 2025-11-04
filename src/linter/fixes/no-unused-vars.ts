import * as vscode from "vscode"
import { UnderscorePrefixFixProvider } from "./bases/underscore-prefix-base.ts"

/**
 * Fix provider specifically for no-unused-vars rule
 */
export class NoUnusedVarsFixProvider extends UnderscorePrefixFixProvider {
    readonly ruleCodes = ["no-unused-vars"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Add underscore prefix fix
        const underscoreFix = this.createUnderscorePrefixFix(diagnostic, document)
        actions.push(underscoreFix)

        // Add remove variable fix
        const removeFix = this.createRemoveVariableFix(diagnostic, document)
        if (removeFix) {
            actions.push(removeFix)
        }

        return actions
    }

    private createRemoveVariableFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Try to detect different variable declaration patterns and remove them
        const variableName = document.getText(diagnostic.range)

        // Check if this is a standalone variable declaration that can be safely removed
        if (this.canRemoveVariable(lineText, variableName)) {
            const action = this.createAction(`Remove unused variable '${variableName}'`)
            const edit = new vscode.WorkspaceEdit()

            // Remove the entire line if it's a standalone declaration
            if (this.isStandaloneDeclaration(lineText, variableName)) {
                const fullLineRange = new vscode.Range(
                    new vscode.Position(line, 0),
                    new vscode.Position(line + 1, 0), // Include the newline
                )
                edit.delete(document.uri, fullLineRange)
            } else {
                // Remove just the variable from multi-variable declarations
                const updatedLine = this.removeVariableFromLine(lineText, variableName)
                if (updatedLine !== lineText) {
                    const lineRange = new vscode.Range(
                        new vscode.Position(line, 0),
                        new vscode.Position(line, lineText.length),
                    )
                    edit.replace(document.uri, lineRange, updatedLine)
                }
            }

            action.edit = edit
            action.diagnostics = [diagnostic]
            return action
        }

        return null
    }

    private canRemoveVariable(lineText: string, variableName: string): boolean {
        // Check if this appears to be a variable declaration
        const declarationPattern = new RegExp(
            `\\b(const|let|var)\\s+.*\\b${this.escapeRegex(variableName)}\\b`,
        )
        return declarationPattern.test(lineText)
    }

    private isStandaloneDeclaration(lineText: string, variableName: string): boolean {
        // Check if the variable is the only one declared on this line
        const trimmed = lineText.trim()

        // Patterns for standalone declarations:
        // const varName = ...;
        // let varName;
        // var varName = ...;
        const standalonePatterns = [
            new RegExp(`^(const|let|var)\\s+${this.escapeRegex(variableName)}\\s*(=.*)?;?\\s*$`),
            new RegExp(`^(const|let|var)\\s+${this.escapeRegex(variableName)}\\s*;\\s*$`),
        ]

        return standalonePatterns.some((pattern) => pattern.test(trimmed))
    }

    private removeVariableFromLine(lineText: string, variableName: string): string {
        const escapedName = this.escapeRegex(variableName)

        // Remove variable from multi-variable declarations
        // Handle patterns like: const a, b, c = 1;
        let result = lineText

        // Remove ", varName" or "varName, "
        result = result.replace(new RegExp(`,\\s*${escapedName}\\b[^,]*`), "")
        result = result.replace(new RegExp(`\\b${escapedName}\\b[^,]*,\\s*`), "")

        // If it's the only variable left, remove the whole declaration
        const remainingVars = result.match(/\b(const|let|var)\s*([^=;]+)/)?.[2]?.trim()
        if (!remainingVars || remainingVars.length === 0) {
            return "" // Remove entire line if no variables left
        }

        return result
    }

    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    }
}
