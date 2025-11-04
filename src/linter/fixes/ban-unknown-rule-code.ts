import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for ban-unknown-rule-code rule
 * Removes unknown rule codes from deno-lint-ignore and deno-lint-ignore-file comments
 */
export class BanUnknownRuleCodeFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["ban-unknown-rule-code"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Extract the unknown rule name from the diagnostic message
        const unknownRule = this.extractUnknownRuleFromMessage(diagnostic.message)
        if (!unknownRule) {
            return actions
        }

        // Find the ignore comment that contains this unknown rule
        const ignoreCommentLine = this.findIgnoreCommentWithRule(
            document,
            diagnostic.range,
            unknownRule,
        )
        if (ignoreCommentLine === null) {
            return actions
        }

        // Create action to remove the unknown rule
        const removeAction = this.createRemoveUnknownRuleAction(
            diagnostic,
            document,
            ignoreCommentLine,
            unknownRule,
        )
        actions.push(removeAction)

        return actions
    }

    /**
     * Extract the unknown rule name from the diagnostic message
     */
    private extractUnknownRuleFromMessage(message: string): string | null {
        const match = message.match(/[Uu]nknown rule (for code )?['"`]([^'"`]+)['"`]/)
        if (match) {
            return match[2]
        }

        return null
    }

    /**
     * Find the line containing the ignore comment with the unknown rule
     */
    private findIgnoreCommentWithRule(
        document: vscode.TextDocument,
        diagnosticRange: vscode.Range,
        unknownRule: string,
    ): number | null {
        const startLine = Math.max(0, diagnosticRange.start.line - 10)
        const endLine = Math.min(document.lineCount - 1, diagnosticRange.end.line + 3)

        for (let i = startLine; i <= endLine; i++) {
            const line = document.lineAt(i)
            const text = line.text

            // Check if this line contains a deno-lint-ignore comment with the unknown rule
            if (this.isIgnoreCommentWithRule(text, unknownRule)) {
                return i
            }
        }

        return null
    }

    /**
     * Check if a line contains a deno-lint-ignore comment with the specified rule
     */
    private isIgnoreCommentWithRule(text: string, rule: string): boolean {
        const trimmed = text.trim()

        // Must contain deno-lint-ignore (but not necessarily at start due to indentation)
        if (!trimmed.includes("deno-lint-ignore")) {
            return false
        }

        // Extract rules from the comment
        const match = trimmed.match(/deno-lint-ignore(?:-file)?\s+(.*)/)
        if (!match || !match[1]) {
            return false
        }

        const rulesText = match[1].trim()
        const rules = rulesText.split(/\s+/)

        return rules.includes(rule)
    }

    /**
     * Create action to remove the unknown rule from the ignore comment
     */
    private createRemoveUnknownRuleAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        lineNumber: number,
        unknownRule: string,
    ): vscode.CodeAction {
        const action = this.createAction(`Remove unknown rule '${unknownRule}'`)

        const line = document.lineAt(lineNumber)
        const originalText = line.text
        const trimmed = originalText.trim()

        // Extract the comment prefix and rules
        const match = trimmed.match(/^(\s*\/\/\s*deno-lint-ignore(?:-file)?)\s+(.*)/)
        if (!match) {
            // Fallback - this shouldn't happen if we found the rule correctly
            return action
        }

        const commentPrefix = match[1]
        const rulesText = match[2].trim()
        const rules = rulesText.split(/\s+/).filter((rule) =>
            rule !== unknownRule && rule.trim() !== ""
        )

        const edit = new vscode.WorkspaceEdit()
        const range = new vscode.Range(
            new vscode.Position(lineNumber, 0),
            new vscode.Position(lineNumber, originalText.length),
        )

        if (rules.length === 0) {
            // No rules left, remove the entire comment line
            const fullRange = new vscode.Range(
                new vscode.Position(lineNumber, 0),
                new vscode.Position(lineNumber + 1, 0), // Include the newline
            )
            edit.delete(document.uri, fullRange)
        } else {
            // Reconstruct the comment with remaining rules
            const indent = originalText.match(/^(\s*)/)?.[1] || ""
            const newText = `${indent}${commentPrefix} ${rules.join(" ")}`
            edit.replace(document.uri, range, newText)
        }

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }
}
