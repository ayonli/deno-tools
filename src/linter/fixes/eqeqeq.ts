import type * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider specifically for eqeqeq rule
 * Replaces == with === and != with !==
 */
export class EqeqeqFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["eqeqeq"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Get the text that triggered the diagnostic
        const diagnosticText = document.getText(diagnostic.range)

        // Check if it's == or !=
        if (diagnosticText === "==") {
            const fix = this.createReplacementFix(
                diagnostic,
                document,
                "===",
                "Replace == with ===",
            )
            actions.push(fix)
        } else if (diagnosticText === "!=") {
            const fix = this.createReplacementFix(
                diagnostic,
                document,
                "!==",
                "Replace != with !==",
            )
            actions.push(fix)
        } else {
            // Handle cases where the diagnostic range might include more context
            const line = diagnostic.range.start.line
            const lineText = document.lineAt(line).text

            // Try to find == or != in the diagnostic range or nearby
            const startChar = diagnostic.range.start.character
            const endChar = diagnostic.range.end.character
            const contextText = lineText.substring(startChar, endChar)

            if (contextText.includes("==") && !contextText.includes("===")) {
                const updatedLine = lineText.replace(/(?<!!)(?<!=)==(?!=)/g, "===")
                if (updatedLine !== lineText) {
                    const fix = this.createReplacementFix(
                        diagnostic,
                        document,
                        updatedLine,
                        "Replace == with ===",
                        true, // replace full line
                    )
                    actions.push(fix)
                }
            }

            if (contextText.includes("!=") && !contextText.includes("!==")) {
                const updatedLine = lineText.replace(/!=(?!=)/g, "!==")
                if (updatedLine !== lineText) {
                    const fix = this.createReplacementFix(
                        diagnostic,
                        document,
                        updatedLine,
                        "Replace != with !==",
                        true, // replace full line
                    )
                    actions.push(fix)
                }
            }
        }

        return actions
    }
}
