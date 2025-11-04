import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-prototype-builtins rule
 * Replaces Object.prototype builtin method calls with Object static methods
 * Examples:
 * - foo.hasOwnProperty("bar") -> Object.hasOwn(foo, "bar")
 * - obj.hasOwnProperty(key) -> Object.hasOwn(obj, key)
 */
export class NoPrototypeBuiltinsFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-prototype-builtins"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const replaceWithObjectHasOwnFix = this.createReplaceWithObjectHasOwnFix(
            diagnostic,
            document,
        )
        if (replaceWithObjectHasOwnFix) {
            actions.push(replaceWithObjectHasOwnFix)
        }

        return actions
    }

    private createReplaceWithObjectHasOwnFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Try to replace hasOwnProperty calls with Object.hasOwn
        const updatedLine = this.replaceHasOwnProperty(lineText)

        if (updatedLine !== lineText) {
            const action = this.createAction("Use `Object.hasOwn()` instead")
            const edit = new vscode.WorkspaceEdit()

            // Replace the entire line
            const lineRange = new vscode.Range(
                new vscode.Position(line, 0),
                new vscode.Position(line, lineText.length),
            )
            edit.replace(document.uri, lineRange, updatedLine)
            action.edit = edit
            action.diagnostics = [diagnostic]

            return action
        }

        return null
    }

    private replaceHasOwnProperty(lineText: string): string {
        // Pattern to match: obj.hasOwnProperty(arg) -> Object.hasOwn(obj, arg)
        // This regex captures:
        // - Group 1: The object/expression before .hasOwnProperty
        // - Group 2: The argument(s) inside the parentheses
        return lineText.replace(
            /([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*|\[[^\]]+\]|[a-zA-Z_$][a-zA-Z0-9_$]*(?:\[[^\]]+\])*)\s*\.\s*hasOwnProperty\s*\(\s*([^)]+)\s*\)/g,
            "Object.hasOwn($1, $2)",
        )
    }
}
