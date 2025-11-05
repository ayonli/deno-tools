import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-explicit-any rule
 * Replaces `any` type with `unknown` type
 * Example: let value: any -> let value: unknown
 * For type coercion (as any), offers to remove the cast
 * Example: value as any -> value
 */
export class NoExplicitAnyFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-explicit-any"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Check if this is a type coercion/assertion pattern
        const removeCoercionAction = this.createRemoveTypeCoercionAction(diagnostic, document)
        if (removeCoercionAction) {
            actions.push(removeCoercionAction)
        }

        // Always offer to replace with unknown as an alternative
        const replaceWithUnknownAction = this.createReplaceWithUnknownAction(diagnostic, document)
        actions.push(replaceWithUnknownAction)

        return actions
    }

    private createRemoveTypeCoercionAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text
        const diagnosticText = document.getText(diagnostic.range)

        // Only proceed if the diagnostic is for 'any' keyword
        if (diagnosticText !== "any") {
            return null
        }

        // Get text before and after the 'any' keyword on the same line
        const beforeAny = lineText.substring(0, diagnostic.range.start.character)
        const afterAny = lineText.substring(diagnostic.range.end.character)

        // Pattern 1: Check for "as any" pattern (TypeScript type assertion)
        // Example: value as any -> value
        if (/\s+as\s*$/.test(beforeAny)) {
            const action = this.createAction("Remove type assertion")
            const edit = new vscode.WorkspaceEdit()

            // Find the start of " as any" pattern
            const asMatch = beforeAny.match(/\s+as\s*$/)
            if (asMatch) {
                const asStartChar = diagnostic.range.start.character - asMatch[0].length
                const removeRange = new vscode.Range(
                    new vscode.Position(line, asStartChar),
                    diagnostic.range.end,
                )
                edit.delete(document.uri, removeRange)
                action.edit = edit
                action.diagnostics = [diagnostic]
                return action
            }
        }

        // Pattern 2: Check for "<any>" pattern (angle bracket type assertion)
        // Example: <any>value -> value
        if (/\<\s*$/.test(beforeAny) && /^\s*\>/.test(afterAny)) {
            const action = this.createAction("Remove type assertion")
            const edit = new vscode.WorkspaceEdit()

            // Find the '<' before 'any'
            const openBracketMatch = beforeAny.match(/\<\s*$/)
            if (openBracketMatch) {
                const openBracketChar = diagnostic.range.start.character -
                    openBracketMatch[0].length

                // Find the '>' after 'any'
                const closeBracketMatch = afterAny.match(/^\s*\>/)
                if (closeBracketMatch) {
                    const closeBracketEnd = diagnostic.range.end.character +
                        closeBracketMatch[0].length

                    const removeRange = new vscode.Range(
                        new vscode.Position(line, openBracketChar),
                        new vscode.Position(line, closeBracketEnd),
                    )
                    edit.delete(document.uri, removeRange)
                    action.edit = edit
                    action.diagnostics = [diagnostic]
                    return action
                }
            }
        }

        return null
    }

    private createReplaceWithUnknownAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction {
        const action = this.createAction("Use `unknown` instead")
        const edit = new vscode.WorkspaceEdit()

        // Since the diagnostic range only includes 'any' itself, we can replace it directly
        edit.replace(document.uri, diagnostic.range, "unknown")

        action.edit = edit
        return action
    }
}
