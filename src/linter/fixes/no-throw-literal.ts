import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-throw-literal rule
 * Wraps plain string literals in Error constructor when thrown
 * Examples:
 * - throw "error message" -> throw new Error("error message")
 * - throw 'error message' -> throw new Error('error message')
 * - throw `error message` -> throw new Error(`error message`)
 */
export class NoThrowLiteralFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-throw-literal"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const wrapInErrorFix = this.createWrapInErrorFix(diagnostic, document)
        if (wrapInErrorFix) {
            actions.push(wrapInErrorFix)
        }

        return actions
    }

    private createWrapInErrorFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        // Extract the entire throw statement from the diagnostic range
        const throwStatement = document.getText(diagnostic.range)

        // Extract just the thrown value (after "throw ")
        const throwMatch = throwStatement.match(/^throw\s+(.+)$/)
        if (!throwMatch) {
            return null
        }

        const thrownValue = throwMatch[1].replace(/;?\s*$/, "") // Remove trailing semicolon and whitespace

        // Check if the thrown value is a string literal
        if (!this.isStringLiteral(thrownValue)) {
            return null
        }

        // Create the updated throw statement
        const updatedThrowStatement = `throw new Error(${thrownValue})`

        // Replace just the diagnostic range with the new throw statement
        const action = this.createAction("Wrap the string in `new Error()`")
        const edit = new vscode.WorkspaceEdit()

        edit.replace(document.uri, diagnostic.range, updatedThrowStatement)
        action.edit = edit
        action.diagnostics = [diagnostic]

        return action
    }

    private isStringLiteral(literal: string): boolean {
        const trimmed = literal.trim()
        // Check for string literals: "...", '...', or `...`
        return (
            (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
            (trimmed.startsWith("`") && trimmed.endsWith("`"))
        )
    }
}
