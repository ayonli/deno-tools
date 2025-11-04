import * as vscode from "vscode"
import { BaseFixProvider } from "./base.ts"

/**
 * Utility class for handling "Use X instead" pattern from diagnostic hints
 * This provides consistent behavior for extracting replacement suggestions
 * from diagnostic hints and creating replacement fixes.
 */
export class UseInsteadHelper {
    /**
     * Extracts the replacement text from a hint containing "Use X instead" pattern
     * Handles both uppercase and lowercase variations of "use"
     * @param hint The hint text to parse
     * @returns The replacement text or null if pattern not found
     */
    static extractReplacementFromHint(hint: string): string | null {
        // Match both "Use" and "use" at the start, with optional backticks around the replacement
        const replaceMatch = hint.match(/[Uu]se\s+`?([^`\s]+)`?\s+instead/i)
        if (replaceMatch) {
            return replaceMatch[1]
        }
        return null
    }

    /**
     * Creates a replacement code action with consistent formatting
     * @param provider The fix provider creating the action
     * @param diagnostic The diagnostic to fix
     * @param document The document to modify
     * @param replacement The replacement text
     * @returns A code action that replaces the diagnostic range with the replacement
     */
    static createReplacementAction(
        provider: BaseFixProvider,
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        replacement: string,
    ): vscode.CodeAction {
        // Access protected method through any cast
        const action = (provider as any).createAction(`Use \`${replacement}\` instead`)
        const edit = new vscode.WorkspaceEdit()
        edit.replace(document.uri, diagnostic.range, replacement)
        
        action.edit = edit
        action.diagnostics = [diagnostic]
        return action
    }

    /**
     * Creates a fix based on "Use X instead" pattern found in the diagnostic hint
     * @param provider The fix provider creating the fix
     * @param diagnostic The diagnostic containing the hint
     * @param document The document to fix
     * @returns A code action if a "use instead" pattern is found, null otherwise
     */
    static createUseInsteadFix(
        provider: BaseFixProvider,
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        // Access protected method through any cast
        const hint = (provider as any).extractHint(diagnostic)
        if (!hint) {
            return null
        }

        const replacement = UseInsteadHelper.extractReplacementFromHint(hint)
        if (!replacement) {
            return null
        }

        return UseInsteadHelper.createReplacementAction(provider, diagnostic, document, replacement)
    }
}

/**
 * Base class for fix providers that handle "Use X instead" pattern from hints
 * This provides consistent behavior for extracting replacement suggestions
 * from diagnostic hints and creating replacement fixes.
 */
export abstract class UseInsteadFixProviderBase extends BaseFixProvider {
    /**
     * Creates a fix based on "Use X instead" pattern found in the diagnostic hint
     * @param diagnostic The diagnostic containing the hint
     * @param document The document to fix
     * @returns A code action if a "use instead" pattern is found, null otherwise
     */
    protected createUseInsteadFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        return UseInsteadHelper.createUseInsteadFix(this, diagnostic, document)
    }

    /**
     * Extracts the replacement text from a hint containing "Use X instead" pattern
     * Handles both uppercase and lowercase variations of "use"
     * @param hint The hint text to parse
     * @returns The replacement text or null if pattern not found
     */
    protected extractReplacementFromHint(hint: string): string | null {
        return UseInsteadHelper.extractReplacementFromHint(hint)
    }

    /**
     * Creates a replacement code action with consistent formatting
     * @param diagnostic The diagnostic to fix
     * @param document The document to modify
     * @param replacement The replacement text
     * @returns A code action that replaces the diagnostic range with the replacement
     */
    protected createReplacementAction(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
        replacement: string,
    ): vscode.CodeAction {
        return UseInsteadHelper.createReplacementAction(this, diagnostic, document, replacement)
    }
}
