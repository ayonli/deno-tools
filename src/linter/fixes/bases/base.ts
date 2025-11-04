import * as vscode from "vscode"

/**
 * Common interface for all lint fix providers
 */
export interface FixProvider {
    /**
     * The lint rule codes this provider handles
     */
    readonly ruleCodes: string[]

    /**
     * Check if this provider can handle the given diagnostic
     */
    canHandle(diagnostic: vscode.Diagnostic): boolean

    /**
     * Create quick fix actions for the diagnostic
     */
    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[]
}

const HINT_PREFIX = /^(Hint:|💡) /

/**
 * Base class for fix providers that implements common functionality
 */
export abstract class BaseFixProvider implements FixProvider {
    abstract readonly ruleCodes: string[]

    canHandle(diagnostic: vscode.Diagnostic): boolean {
        const code = diagnostic.code as string
        return this.ruleCodes.includes(code)
    }

    abstract createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[]

    /**
     * Extract hint from diagnostic related information
     */
    extractHint(diagnostic: vscode.Diagnostic): string | null {
        if (diagnostic.relatedInformation && diagnostic.relatedInformation.length > 0) {
            const hintInfo = diagnostic.relatedInformation.find((info) =>
                HINT_PREFIX.test(info.message)
            )
            if (hintInfo) {
                return hintInfo.message.replace(HINT_PREFIX, "")
            }
        }
        return null
    }

    /**
     * Create a quick fix action with common properties
     */
    createAction(
        title: string,
        kind: vscode.CodeActionKind = vscode.CodeActionKind.QuickFix,
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(title, kind)
        action.isPreferred = true
        return action
    }
}
