import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-sparse-arrays rule
 * Removes empty slots from sparse arrays
 * Examples:
 * - [1, , 2] -> [1, 2]
 * - [, , 3] -> [3]
 * - [1, , , 4] -> [1, 4]
 */
export class NoSparseArraysFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-sparse-arrays"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const removeEmptySlotsFix = this.createRemoveEmptySlotsFix(diagnostic, document)
        if (removeEmptySlotsFix) {
            actions.push(removeEmptySlotsFix)
        }

        return actions
    }

    private createRemoveEmptySlotsFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        // Extract the sparse array from the diagnostic range
        const arrayText = document.getText(diagnostic.range)

        // Remove empty slots from the array
        const fixedArray = this.removeEmptySlots(arrayText)

        if (fixedArray !== arrayText) {
            const action = this.createAction("Remove empty slots from the array")
            const edit = new vscode.WorkspaceEdit()

            edit.replace(document.uri, diagnostic.range, fixedArray)
            action.edit = edit
            action.diagnostics = [diagnostic]

            return action
        }

        return null
    }

    private removeEmptySlots(arrayText: string): string {
        // Match array literal pattern
        const arrayMatch = arrayText.match(/^\s*\[(.*)\]\s*$/)
        if (!arrayMatch) {
            return arrayText
        }

        const arrayContent = arrayMatch[1]

        // Split by commas and filter out empty slots
        const elements = arrayContent.split(",").map((element) => element.trim()).filter(
            (element) => {
                // Keep elements that are not empty (empty slots are just whitespace or empty)
                return element.length > 0
            },
        )

        // Reconstruct the array
        return `[${elements.join(", ")}]`
    }
}
