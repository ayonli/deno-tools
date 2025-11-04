import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Provides fixes to disable lint rules
 */
export class DisableRuleFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["*"] // Can handle any rule for disabling

    canHandle(_diagnostic: vscode.Diagnostic): boolean {
        // This provider can handle any diagnostic for rule disabling
        return true
    }

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []
        const code = diagnostic.code as string

        if (!code) { return actions }

        // Create action to disable rule for this line
        const disableLineAction = this.createDisableLineAction(diagnostic, document, code)
        actions.push(disableLineAction)

        // Create action to disable rule for entire file
        const disableFileAction = this.createDisableFileAction(diagnostic, document, code)
        actions.push(disableFileAction)

        return actions
    }

    private createDisableLineAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        code: string,
    ): vscode.CodeAction {
        const action = this.createAction(`Disable '${code}' for this line`)

        const line = diagnostic.range.start.line
        const edit = new vscode.WorkspaceEdit()

        // Check if there's already a deno-lint-ignore comment above this line
        const existingIgnoreLine = this.findExistingIgnoreComment(document, line)

        if (existingIgnoreLine !== null) {
            // Append to existing ignore comment
            const existingLine = document.lineAt(existingIgnoreLine)
            const existingText = existingLine.text

            // Check if the rule is already in the ignore list
            if (!this.isRuleInIgnoreComment(existingText, code)) {
                const newText = existingText + ` ${code}`
                const range = new vscode.Range(
                    new vscode.Position(existingIgnoreLine, 0),
                    new vscode.Position(existingIgnoreLine, existingText.length),
                )
                edit.replace(document.uri, range, newText)
            }
        } else {
            // Create new ignore comment
            const lineText = document.lineAt(line).text
            const indent = lineText.match(/^(\s*)/)?.[1] || ""
            const commentLine = `${indent}// deno-lint-ignore ${code}\n`
            edit.insert(document.uri, new vscode.Position(line, 0), commentLine)
        }

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    private createDisableFileAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        code: string,
    ): vscode.CodeAction {
        const action = this.createAction(`Disable '${code}' for the entire file`)

        const edit = new vscode.WorkspaceEdit()

        // Check if there's already a deno-lint-ignore-file comment
        const existingFileIgnoreLine = this.findExistingFileIgnoreComment(document)

        if (existingFileIgnoreLine !== null) {
            // Append to existing file ignore comment
            const existingLine = document.lineAt(existingFileIgnoreLine)
            const existingText = existingLine.text

            // Check if the rule is already in the ignore list
            if (!this.isRuleInIgnoreComment(existingText, code)) {
                const newText = existingText + ` ${code}`
                const range = new vscode.Range(
                    new vscode.Position(existingFileIgnoreLine, 0),
                    new vscode.Position(existingFileIgnoreLine, existingText.length),
                )
                edit.replace(document.uri, range, newText)
            }
        } else {
            // Create new file ignore comment
            const insertPosition = this.findFileDisablePosition(document)
            const fileComment = `// deno-lint-ignore-file ${code}\n`
            edit.insert(document.uri, insertPosition, fileComment)
        }

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    private findFileDisablePosition(document: vscode.TextDocument): vscode.Position {
        // Look for existing file-level comments at the top
        let insertLine = 0

        for (let i = 0; i < Math.min(10, document.lineCount); i++) {
            const line = document.lineAt(i)
            const trimmedText = line.text.trim()

            // Skip empty lines and existing comments
            if (
                trimmedText === "" ||
                trimmedText.startsWith("//") ||
                trimmedText.startsWith("/*")
            ) {
                insertLine = i + 1
                continue
            }

            // Stop at the first non-comment line
            break
        }

        return new vscode.Position(insertLine, 0)
    }

    /**
     * Find existing deno-lint-ignore comment above the specified line
     */
    private findExistingIgnoreComment(
        document: vscode.TextDocument,
        targetLine: number,
    ): number | null {
        // Look for deno-lint-ignore comment in the line immediately above or on previous lines
        for (let i = targetLine - 1; i >= Math.max(0, targetLine - 3); i--) {
            const line = document.lineAt(i)
            const trimmedText = line.text.trim()

            if (
                trimmedText.includes("deno-lint-ignore") &&
                !trimmedText.includes("deno-lint-ignore-file")
            ) {
                return i
            }

            // Stop searching if we hit a non-empty, non-comment line
            if (
                trimmedText !== "" && !trimmedText.startsWith("//") && !trimmedText.startsWith("/*")
            ) {
                break
            }
        }

        return null
    }

    /**
     * Find existing deno-lint-ignore-file comment in the document
     */
    private findExistingFileIgnoreComment(document: vscode.TextDocument): number | null {
        // Look for deno-lint-ignore-file comment at the top of the file
        for (let i = 0; i < Math.min(10, document.lineCount); i++) {
            const line = document.lineAt(i)
            const trimmedText = line.text.trim()

            if (trimmedText.includes("deno-lint-ignore-file")) {
                return i
            }

            // Stop at the first non-comment line
            if (
                trimmedText !== "" && !trimmedText.startsWith("//") && !trimmedText.startsWith("/*")
            ) {
                break
            }
        }

        return null
    }

    /**
     * Check if a specific rule is already present in an ignore comment
     */
    private isRuleInIgnoreComment(commentText: string, rule: string): boolean {
        // Extract the rules part after deno-lint-ignore or deno-lint-ignore-file
        const match = commentText.match(/deno-lint-ignore(?:-file)?\s+(.*)/)
        if (!match) { return false }

        const rulesText = match[1].trim()
        const rules = rulesText.split(/\s+/)

        return rules.includes(rule)
    }
}
