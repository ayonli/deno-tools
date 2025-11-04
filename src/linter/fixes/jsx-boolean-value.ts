import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for jsx-boolean-value rule
 * Simplifies JSX boolean attributes by removing unnecessary {true} values
 * Example: isFoo={true} -> isFoo
 */
export class JsxBooleanValueFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["jsx-boolean-value"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // The diagnostic range should cover {true}, we need to also remove the = before it
        const fix = this.createSimplifyBooleanAttributeAction(diagnostic, document)
        if (fix) {
            actions.push(fix)
        }

        return actions
    }

    /**
     * Create action to simplify JSX boolean attribute
     */
    private createSimplifyBooleanAttributeAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const action = this.createAction("Simplify JSX boolean attribute")

        const diagnosticRange = diagnostic.range
        const line = document.lineAt(diagnosticRange.start.line)
        const lineText = line.text

        // Look backwards from the diagnostic range to find the = sign
        const beforeDiagnostic = lineText.substring(0, diagnosticRange.start.character)
        const equalSignStart = beforeDiagnostic.lastIndexOf("=")

        if (equalSignStart === -1) {
            return null
        }

        const edit = new vscode.WorkspaceEdit()

        // Remove from the = sign (including spaces) to the end of the diagnostic range
        const removeRange = new vscode.Range(
            new vscode.Position(diagnosticRange.start.line, equalSignStart),
            diagnosticRange.end,
        )

        edit.delete(document.uri, removeRange)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }
}
