import type * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider for no-new-symbol rule
 * Removes the 'new' keyword from 'new Symbol()' calls
 */
export class NoNewSymbolFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["no-new-symbol"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Get the line containing the diagnostic
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Remove 'new' keyword from 'new Symbol()' calls
        const updatedLine = this.removeNewFromSymbol(lineText)

        if (updatedLine !== lineText) {
            const fix = this.createReplacementFix(
                diagnostic,
                document,
                updatedLine,
                "Remove `new` keyword",
                true, // replace full line
            )
            actions.push(fix)
        }

        return actions
    }

    private removeNewFromSymbol(lineText: string): string {
        // Pattern to match 'new Symbol()' calls and remove the 'new' keyword
        // Examples:
        // new Symbol() -> Symbol()
        // new Symbol('description') -> Symbol('description')
        // const sym = new Symbol(); -> const sym = Symbol();

        // Look for 'new Symbol' followed by optional whitespace and parentheses
        return lineText.replace(/\bnew\s+(Symbol\s*\()/g, "$1")
    }
}
