import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * General fix provider for rules that don't have specific implementations
 */
export class GeneralFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["*"] // Handles any rule not covered by specific providers

    canHandle(_diagnostic: vscode.Diagnostic): boolean {
        // This is a fallback provider, so it can handle anything
        return true
    }

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []
        const hint = this.extractHint(diagnostic)

        if (hint) {
            // Try to create a hint-based fix
            const hintFix = this.createHintBasedFix(diagnostic, document, hint)
            if (hintFix) {
                actions.push(hintFix)
            }
        }

        // Always add a general "learn more" action
        const learnMoreAction = this.createLearnMoreAction(diagnostic)
        actions.push(learnMoreAction)

        return actions
    }

    private createHintBasedFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        hint: string,
    ): vscode.CodeAction | null {
        // Try to extract simple replacement suggestions from hints
        const replaceMatch = hint.match(/Use `([^`]+)` instead/)
        if (replaceMatch) {
            const replacement = replaceMatch[1]
            const action = this.createAction(`Use ${replacement}`)
            const edit = new vscode.WorkspaceEdit()
            edit.replace(document.uri, diagnostic.range, replacement)

            action.edit = edit
            action.diagnostics = [diagnostic]
            return action
        }

        return null
    }

    private createLearnMoreAction(diagnostic: vscode.Diagnostic): vscode.CodeAction {
        const code = diagnostic.code as string
        const action = this.createAction(
            `Learn more about this rule`,
            vscode.CodeActionKind.Empty,
        )

        // Create a command that opens documentation
        action.command = {
            command: "vscode.open",
            title: "Learn more",
            arguments: [`https://lint.deno.land/rules/${code}`],
        }

        return action
    }
}
