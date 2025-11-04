import * as vscode from "vscode"
import { BaseFixProvider } from "./base.ts"

/**
 * Reusable base class for fixes that add import statements
 */
export abstract class ImportFixProviderBase extends BaseFixProvider {
    protected createImportFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        importStatement: string,
        actionTitle?: string,
    ): vscode.CodeAction {
        // Ensure import statement ends with semicolon and newline
        let finalImportStatement = importStatement
        if (!finalImportStatement.endsWith(";")) {
            finalImportStatement += ";"
        }
        finalImportStatement += "\n"

        const title = actionTitle || `Add ${importStatement}`
        const action = this.createAction(title)
        const edit = new vscode.WorkspaceEdit()

        // Find the best position to insert the import
        const insertPosition = this.findImportInsertPosition(document)

        // Check if we need to add a blank line after the import section
        const needsBlankLine = this.needsBlankLineAfterImports(document, insertPosition)
        if (needsBlankLine) {
            finalImportStatement += "\n"
        }

        edit.insert(document.uri, insertPosition, finalImportStatement)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    protected findImportInsertPosition(document: vscode.TextDocument): vscode.Position {
        let insertLine = 0
        let inBlockComment = false

        // Find the first line that's not a leading comment or empty line
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i)
            const trimmedText = line.text.trim()

            // Handle block comments
            if (!inBlockComment && trimmedText.includes("/*")) {
                inBlockComment = true
            }
            if (inBlockComment) {
                if (trimmedText.includes("*/")) {
                    inBlockComment = false
                }
                continue
            }

            // Skip empty lines, single-line comments, and shebang lines at the beginning
            if (
                trimmedText === "" || trimmedText.startsWith("//") || trimmedText.startsWith("#!")
            ) {
                continue
            }

            // This is the first line that's not a leading comment, shebang, or empty
            insertLine = i
            break
        }

        return new vscode.Position(insertLine, 0)
    }

    /**
     * Checks if we need to add a blank line after the imports section
     */
    protected needsBlankLineAfterImports(
        document: vscode.TextDocument,
        insertPosition: vscode.Position,
    ): boolean {
        const insertLine = insertPosition.line

        // If we're inserting at the very end of the file, no blank line needed
        if (insertLine >= document.lineCount) {
            return false
        }

        // Check the line at the insertion position (this will be the first non-comment line)
        const lineAtInsert = document.lineAt(insertLine)
        const trimmedText = lineAtInsert.text.trim()

        // If the line at insertion position is empty, we don't need a blank line
        if (trimmedText === "") {
            return false
        }

        // If the line at insertion is already an import, we don't need a blank line
        if (
            trimmedText.startsWith("import ") ||
            (trimmedText.startsWith("export ") &&
                (trimmedText.includes(" from ") || trimmedText.startsWith("export {") ||
                    trimmedText.startsWith("export *")))
        ) {
            return false
        }

        // If we reach here, the line at insertion is actual code, so we need a blank line
        return true
    }
}
