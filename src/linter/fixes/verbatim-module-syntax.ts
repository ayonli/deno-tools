import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for verbatim-module-syntax rule
 * Handles two types of fixes:
 * 1. Add 'type' keyword before identifier
 * 2. Change 'import' to 'import type'
 */
export class VerbatimModuleSyntaxFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["verbatim-module-syntax"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []
        const hint = this.extractHint(diagnostic)

        if (!hint) {
            return actions
        }

        if (/[Aa]dd\s+(a\s+)?`type`\s+keyword/.test(hint)) {
            const addTypeAction = this.createAddTypeKeywordFix(
                diagnostic,
                document,
                "Add `type` keyword",
            )
            if (addTypeAction) {
                actions.push(addTypeAction)
            }
        }

        if (/`import`\s+to\s+`import\s+type`/.test(hint)) {
            const changeImportAction = this.createChangeImportToImportTypeFix(
                diagnostic,
                document,
                "Change `import` to `import type`",
            )
            if (changeImportAction) {
                actions.push(changeImportAction)
            }
        }

        return actions
    }

    private createAddTypeKeywordFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        title: string,
    ): vscode.CodeAction | null {
        const action = this.createAction(title)
        const edit = new vscode.WorkspaceEdit()

        // Insert 'type ' before the diagnostic range (the highlighted identifier)
        const insertPosition = diagnostic.range.start
        edit.insert(document.uri, insertPosition, "type ")

        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    private createChangeImportToImportTypeFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        title: string,
    ): vscode.CodeAction | null {
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Replace 'import' with 'import type' at the beginning of import statements
        const updatedLine = this.replaceImportWithImportType(lineText)

        if (updatedLine !== lineText) {
            const action = this.createAction(title)
            const edit = new vscode.WorkspaceEdit()

            // Replace the entire line
            const fullLineRange = new vscode.Range(
                new vscode.Position(line, 0),
                new vscode.Position(line, lineText.length),
            )
            edit.replace(document.uri, fullLineRange, updatedLine)

            action.edit = edit
            action.diagnostics = [diagnostic]
            return action
        }

        return null
    }

    private replaceImportWithImportType(lineText: string): string {
        // Pattern to match import statements and replace with import type
        // Examples:
        // import { Foo } from './module' -> import type { Foo } from './module'
        // import * as foo from './module' -> import type * as foo from './module'
        // import foo from './module' -> import type foo from './module'

        // Look for 'import' at the beginning of the statement (with optional whitespace)
        return lineText.replace(/^(\s*)import(\s+)/, "$1import type$2")
    }
}
