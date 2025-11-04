import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for jsx-no-useless-fragment rule
 * Removes unnecessary React fragments that don't serve a purpose
 * Examples:
 * - Remove empty fragments: <></> -> (remove entirely)
 * - Remove single-child fragments: <><div /></> -> <div />
 * - Remove fragments in JSX content: <p>foo <>bar</></p> -> <p>foo bar</p>
 */
export class JsxNoUselessFragmentFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["jsx-no-useless-fragment"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const removeFragmentAction = this.createRemoveFragmentAction(diagnostic, document)
        if (removeFragmentAction) {
            actions.push(removeFragmentAction)
        }

        return actions
    }

    /**
     * Create action to remove useless fragment
     */
    private createRemoveFragmentAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const action = this.createAction("Remove this Fragment")

        const edit = new vscode.WorkspaceEdit()
        const diagnosticRange = diagnostic.range
        const diagnosticText = document.getText(diagnosticRange)

        // Determine what type of useless fragment this is
        const fragmentContent = this.extractFragmentContent(diagnosticText)

        if (fragmentContent === null) {
            return null
        }

        let newText: string

        if (fragmentContent.trim() === "") {
            // Empty fragment - remove entirely
            newText = ""
        } else {
            // Fragment with content - just keep the content
            newText = fragmentContent
        }

        edit.replace(document.uri, diagnosticRange, newText)

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    /**
     * Extract the content inside a fragment, returning null if not a valid fragment
     */
    private extractFragmentContent(text: string): string | null {
        const trimmed = text.trim()

        // Handle React.Fragment syntax
        if (trimmed.startsWith("<React.Fragment") || trimmed.startsWith("<Fragment")) {
            return this.extractFromLongFormFragment(trimmed)
        }

        // Handle short fragment syntax <>...</>
        if (trimmed.startsWith("<>") && trimmed.endsWith("</>")) {
            return trimmed.slice(2, -3) // Remove <> and </>
        }

        return null
    }

    /**
     * Extract content from long-form fragment like <React.Fragment>...</React.Fragment>
     */
    private extractFromLongFormFragment(text: string): string | null {
        // Find the closing tag of the opening fragment
        const openingTagEnd = text.indexOf(">")
        if (openingTagEnd === -1) {
            return null
        }

        // Find the matching closing tag
        let closingTagStart = -1
        if (text.includes("</React.Fragment>")) {
            closingTagStart = text.lastIndexOf("</React.Fragment>")
        } else if (text.includes("</Fragment>")) {
            closingTagStart = text.lastIndexOf("</Fragment>")
        }

        if (closingTagStart === -1) {
            return null
        }

        // Extract content between opening and closing tags
        return text.slice(openingTagEnd + 1, closingTagStart)
    }
}
