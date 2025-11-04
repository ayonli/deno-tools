import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-invalid-triple-slash-reference rule
 * Converts invalid triple-slash directives to valid ones
 * Examples:
 * - /// <reference src="..." /> -> /// <reference path="..." />
 * - /// <reference name="..." /> -> /// <reference types="..." />
 * - /// <reference library="..." /> -> /// <reference lib="..." />
 * - /// <reference default-lib="false" /> -> /// <reference no-default-lib="true" />
 */
export class NoInvalidTripleSlashReferenceFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-invalid-triple-slash-reference"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Get the entire directive text from the diagnostic range
        const directiveText = document.getText(diagnostic.range)

        // Extract the invalid attribute name and its position
        const attributeMatch = directiveText.match(/<reference\s+([a-zA-Z-]+)\s*=/)
        if (!attributeMatch || attributeMatch.index === undefined) {
            return actions
        }

        const invalidAttr = attributeMatch[1]
        const attrStart = attributeMatch.index +
            attributeMatch[0].indexOf(invalidAttr)
        const attrEnd = attrStart + invalidAttr.length
        const validAttributes = ["types", "path", "lib", "no-default-lib"]

        // Provide fixes to replace with each valid attribute
        for (const validAttr of validAttributes) {
            if (validAttr !== invalidAttr) {
                const action = this.createAction(`Change to \`<reference ${validAttr}="..." />\``)
                const edit = new vscode.WorkspaceEdit()

                // Use slicing to replace the invalid attribute with the valid one
                const fixedDirective = directiveText.substring(0, attrStart) +
                    validAttr +
                    directiveText.substring(attrEnd)

                edit.replace(document.uri, diagnostic.range, fixedDirective)
                action.edit = edit
                action.diagnostics = [diagnostic]

                actions.push(action)
            }
        }

        return actions
    }
}
