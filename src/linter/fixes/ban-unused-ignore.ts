import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for ban-unused-ignore rule
 * Removes unused rule codes from deno-lint-ignore and deno-lint-ignore-file comments
 */
export class BanUnusedIgnoreFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["ban-unused-ignore"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Extract the unused rule name from the diagnostic message or hint
        const unusedRule = this.extractUnusedRuleFromDiagnostic(diagnostic)
        if (!unusedRule) {
            return actions
        }

        // Find the ignore comment that contains this unused rule
        const ignoreCommentLine = this.findIgnoreCommentWithRule(
            document,
            diagnostic.range,
            unusedRule,
        )
        if (ignoreCommentLine === null) {
            return actions
        }

        // Create action to remove the unused rule
        const removeAction = this.createRemoveUnusedRuleAction(
            diagnostic,
            document,
            ignoreCommentLine,
            unusedRule,
        )
        actions.push(removeAction)

        return actions
    }

    /**
     * Extract the unused rule name from the diagnostic message or hint
     */
    private extractUnusedRuleFromDiagnostic(diagnostic: vscode.Diagnostic): string | null {
        // First try to extract from the main message
        let unusedRule = this.extractUnusedRuleFromMessage(diagnostic.message)

        // If not found in main message, try the hint from related information
        if (!unusedRule) {
            const hint = this.extractHint(diagnostic)
            if (hint) {
                unusedRule = this.extractUnusedRuleFromMessage(hint)
            }
        }

        return unusedRule
    }

    /**
     * Extract the unused rule name from a message string
     */
    private extractUnusedRuleFromMessage(message: string): string | null {
        const match = message.match(/["'`]([^"'`]+)["'`]/)
        return match?.[1] ?? null
    }

    /**
     * Find the line containing the ignore comment with the unused rule
     */
    private findIgnoreCommentWithRule(
        document: vscode.TextDocument,
        diagnosticRange: vscode.Range,
        unusedRule: string,
    ): number | null {
        const startLine = Math.max(0, diagnosticRange.start.line - 10)
        const endLine = Math.min(document.lineCount - 1, diagnosticRange.end.line + 3)

        for (let i = startLine; i <= endLine; i++) {
            const line = document.lineAt(i)
            const text = line.text

            // Check if this line contains a deno-lint-ignore comment with the unused rule
            if (this.isIgnoreCommentWithRule(text, unusedRule)) {
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
     * Create action to remove the unused rule from the ignore comment
     */
    private createRemoveUnusedRuleAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        lineNumber: number,
        unusedRule: string,
    ): vscode.CodeAction {
        const action = this.createAction(`Remove unused ignore rule '${unusedRule}'`)

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
            rule !== unusedRule && rule.trim() !== ""
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
