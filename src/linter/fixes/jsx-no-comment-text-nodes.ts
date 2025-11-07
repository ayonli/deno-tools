import type * as vscode from "vscode"
import { TextReplacementFixProvider } from "./bases/text-replacement-base.ts"

/**
 * Fix provider for jsx-no-comment-text-nodes rule
 * Handles wrapping JSX comment text nodes in curly braces
 */
export class JsxNoCommentTextNodesFixProvider extends TextReplacementFixProvider {
    readonly ruleCodes = ["jsx-no-comment-text-nodes"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        // Create fix for block comments /* ... */
        const blockCommentFix = this.createBlockCommentFix(diagnostic, document)
        if (blockCommentFix) {
            actions.push(blockCommentFix)
        }

        return actions
    }

    private createBlockCommentFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const commentText = document.getText(diagnostic.range)

        // Only handle block comments /* ... */
        if (!commentText.startsWith("/*") || !commentText.endsWith("*/")) {
            return null
        }

        // Wrap the comment in curly braces
        const replacement = `{${commentText}}`

        return this.createReplacementFix(
            diagnostic,
            document,
            replacement,
            "Wrap comment in curly braces",
            false, // replace only the specific range
        )
    }
}
