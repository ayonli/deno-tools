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
        let lastImportLine = -1
        let firstNonCommentLine = 0

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i)
            const trimmedText = line.text.trim()

            // Skip empty lines and comments at the beginning
            if (
                trimmedText === "" || trimmedText.startsWith("//") || trimmedText.startsWith("/*")
            ) {
                continue
            }

            // Check if this is an import statement or re-export statement (not a regular export)
            if (
                trimmedText.startsWith("import ") ||
                (trimmedText.startsWith("export ") &&
                    (trimmedText.includes(" from ") || trimmedText.startsWith("export {") ||
                        trimmedText.startsWith("export *")))
            ) {
                lastImportLine = i
            } else if (firstNonCommentLine === 0) {
                firstNonCommentLine = i
                break
            }
        }

        // Insert after the last import, or at the beginning if no imports found
        const insertLine = lastImportLine >= 0 ? lastImportLine + 1 : firstNonCommentLine
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

        // Check the line at the insertion position (this will be the first line after imports)
        const lineAtInsert = document.lineAt(insertLine)
        const trimmedText = lineAtInsert.text.trim()

        // If the line after insertion position is empty, we don't need another blank line
        if (trimmedText === "") {
            return false
        }

        // If the line after insertion is a comment, we don't need a blank line
        if (trimmedText.startsWith("//") || trimmedText.startsWith("/*")) {
            return false
        }

        // If the line after insertion is another import, we don't need a blank line
        if (
            trimmedText.startsWith("import ") ||
            (trimmedText.startsWith("export ") &&
                (trimmedText.includes(" from ") || trimmedText.startsWith("export {") ||
                    trimmedText.startsWith("export *")))
        ) {
            return false
        }

        // If we reach here, the line after insertion is actual code, so we need a blank line
        // This applies whether we're inserting the first import or after existing imports
        return true
    }
}
