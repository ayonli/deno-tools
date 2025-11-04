import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-inferrable-types rule
 * Removes unnecessary type annotations that can be inferred
 * Examples:
 * - const a: number = 10 -> const a = 10
 * - const b: string = "hello" -> const b = "hello"
 * - const c: bigint = 10n -> const c = 10n
 * - const d: boolean = true -> const d = true
 */
export class NoInferrableTypesFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-inferrable-types"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const action = this.createAction("Remove unnecessary type annotation")
        const edit = new vscode.WorkspaceEdit()

        // The diagnostic range contains: "variableName: type = value"
        // We need to transform it to: "variableName = value"
        const declarationText = document.getText(diagnostic.range)

        // Find the colon and equals sign positions
        const colonIndex = declarationText.indexOf(":")
        const equalsIndex = declarationText.indexOf("=")

        if (colonIndex === -1 || equalsIndex === -1 || colonIndex >= equalsIndex) {
            // Invalid format, skip
            return []
        }

        // Extract variable name and value parts
        const variableName = declarationText.substring(0, colonIndex).trim()
        const valueExpression = declarationText.substring(equalsIndex + 1).trim()

        // Reconstruct without type annotation
        const fixedDeclaration = `${variableName} = ${valueExpression}`

        edit.replace(document.uri, diagnostic.range, fixedDeclaration)
        action.edit = edit
        action.diagnostics = [diagnostic]

        return [action]
    }
}
