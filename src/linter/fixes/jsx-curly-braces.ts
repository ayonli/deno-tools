import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for jsx-curly-braces rule
 * Ensures consistent use of curly braces around JSX expressions
 * Examples:
 * - Add braces: foo=<div /> -> foo={<div />}
 * - Remove braces in attributes: str={"foo"} -> str="foo"
 * - Remove braces in content: <div>{"foo"}</div> -> <div>foo</div>
 */
export class JsxCurlyBracesFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["jsx-curly-braces"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const diagnosticText = document.getText(diagnostic.range)

        // Determine the type of fix needed based on the diagnostic content
        if (this.needsAddBraces(diagnosticText)) {
            const addBracesAction = this.createAddBracesAction(diagnostic, document)
            if (addBracesAction) {
                actions.push(addBracesAction)
            }
        } else if (this.needsRemoveBraces(diagnosticText)) {
            const removeBracesAction = this.createRemoveBracesAction(diagnostic, document)
            if (removeBracesAction) {
                actions.push(removeBracesAction)
            }
        }

        return actions
    }

    /**
     * Check if the expression needs curly braces added
     */
    private needsAddBraces(diagnosticText: string): boolean {
        // If it starts with < it's likely a JSX element that needs braces
        return diagnosticText.trim().startsWith("<")
    }

    /**
     * Check if the expression needs curly braces removed
     */
    private needsRemoveBraces(diagnosticText: string): boolean {
        const trimmed = diagnosticText.trim()
        return trimmed.startsWith("{") && trimmed.endsWith("}")
    }

    /**
     * Create action to add curly braces around JSX expression
     */
    private createAddBracesAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const action = this.createAction("Add curly braces around the JSX expression")

        const edit = new vscode.WorkspaceEdit()
        const diagnosticRange = diagnostic.range
        const diagnosticText = document.getText(diagnosticRange)

        // Wrap the content with curly braces
        const newText = `{${diagnosticText}}`
        edit.replace(document.uri, diagnosticRange, newText)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    /**
     * Create action to remove unnecessary curly braces
     */
    private createRemoveBracesAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const action = this.createAction("Remove unnecessary curly braces")

        const edit = new vscode.WorkspaceEdit()
        const diagnosticRange = diagnostic.range
        const diagnosticText = document.getText(diagnosticRange)

        // Check if this expression is in JSX content (after >) vs attribute (after =)
        const isInJsxContent = this.isInJsxContent(document, diagnosticRange)

        let newText = diagnosticText.slice(1, -1).trim() // Remove {}

        if (isInJsxContent) {
            // For JSX content, also remove quotes from string literals
            if (
                (newText.startsWith('"') && newText.endsWith('"')) ||
                (newText.startsWith("'") && newText.endsWith("'")) ||
                (newText.startsWith("`") && newText.endsWith("`"))
            ) {
                newText = newText.slice(1, -1) // Remove quotes
            }
        }
        // For attributes, keep the quotes

        edit.replace(document.uri, diagnosticRange, newText)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    /**
     * Check if the diagnostic range is within JSX content (after >) rather than an attribute
     */
    private isInJsxContent(document: vscode.TextDocument, range: vscode.Range): boolean {
        // Look backward from the diagnostic position across multiple lines
        let currentLine = range.start.line
        let currentChar = range.start.character

        // Search backward through the text to find the context
        while (currentLine >= 0) {
            const line = document.lineAt(currentLine)
            const searchText = currentLine === range.start.line
                ? line.text.substring(0, currentChar)
                : line.text

            // Look for the last occurrence of either '>' or '='
            const lastGreater = searchText.lastIndexOf(">")
            const lastEquals = searchText.lastIndexOf("=")

            if (lastGreater !== -1 || lastEquals !== -1) {
                // If we find '>' and it's after any '=', we're in JSX content
                return lastGreater > lastEquals
            }

            // Move to previous line
            currentLine--
            if (currentLine >= 0) {
                currentChar = document.lineAt(currentLine).text.length
            }

            // Don't search too far back (limit to 10 lines for performance)
            if (range.start.line - currentLine > 10) {
                break
            }
        }

        // Default to attribute context if we can't determine
        return false
    }
}
