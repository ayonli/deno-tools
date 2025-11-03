import type * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider for no-import-assertions rule
 * Replaces deprecated 'assert' keyword with 'with' in import statements
 */
export class NoImportAssertionsFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["no-import-assertions"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Get the line containing the diagnostic
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Replace 'assert' with 'with' in import statements
        const updatedLine = this.replaceAssertWithWith(lineText)

        if (updatedLine !== lineText) {
            // Extract hint from diagnostic, fallback to default message
            const hint = this.extractHint(diagnostic)
            const actionTitle = hint || 'Replace "assert" with "with" in import'

            const fix = this.createReplacementFix(
                diagnostic,
                document,
                updatedLine,
                actionTitle,
                true, // replace full line
            )
            actions.push(fix)
        }

        return actions
    }

    private replaceAssertWithWith(lineText: string): string {
        // Pattern to match import statements with 'assert' keyword
        // Examples:
        // import data from './data.json' assert { type: 'json' };
        // import * as config from './config.json' assert { type: 'json' };
        // import { data } from './data.json' assert { type: 'json' };

        // Look for 'assert' keyword that appears after import statement and before {
        return lineText.replace(/(\bimport\s+[^;]+?)\s+assert(\s*\{[^}]*\})/g, "$1 with$2")
    }
}
