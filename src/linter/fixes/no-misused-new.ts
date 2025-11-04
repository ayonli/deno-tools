import * as vscode from "vscode"
import { BaseFixProvider } from "./bases/base.ts"

/**
 * Fix provider for no-misused-new rule
 * Fixes incorrect usage of new() and constructor() in classes and interfaces
 * Examples:
 * - Class: new() -> constructor()
 * - Interface: constructor() -> new()
 */
export class NoMisusedNewFixProvider extends BaseFixProvider {
    readonly ruleCodes = ["no-misused-new"]

    createFixes(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = []

        const fixNewConstructorFix = this.createFixNewConstructorFix(diagnostic, document)
        if (fixNewConstructorFix) {
            actions.push(fixNewConstructorFix)
        }

        return actions
    }

    private createFixNewConstructorFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument,
    ): vscode.CodeAction | null {
        const line = diagnostic.range.start.line
        const lineText = document.lineAt(line).text

        // Determine the context (class or interface) by looking at surrounding lines
        const context = this.determineContext(document, line)

        let updatedLine: string
        let actionTitle: string

        if (context === "class" && lineText.includes("new(")) {
            // In class: new() -> constructor()
            updatedLine = lineText.replace(/\bnew\s*\(/g, "constructor(")
            actionTitle = "Change to constructor()"
        } else if (context === "interface" && lineText.includes("constructor(")) {
            // In interface: constructor() -> new()
            updatedLine = lineText.replace(/\bconstructor\s*\(/g, "new(")
            actionTitle = "Change to new()"
        } else {
            return null
        }

        if (updatedLine !== lineText) {
            const action = this.createAction(actionTitle)
            const edit = new vscode.WorkspaceEdit()

            // Replace the entire line
            const lineRange = new vscode.Range(
                new vscode.Position(line, 0),
                new vscode.Position(line, lineText.length),
            )
            edit.replace(document.uri, lineRange, updatedLine)
            action.edit = edit
            action.diagnostics = [diagnostic]

            return action
        }

        return null
    }

    private determineContext(
        document: vscode.TextDocument,
        currentLine: number,
    ): "class" | "interface" | "unknown" {
        // Look backwards from the current line to find class or interface declaration
        for (let i = currentLine; i >= 0; i--) {
            const lineText = document.lineAt(i).text.trim()

            // Skip empty lines and comments
            if (!lineText || lineText.startsWith("//") || lineText.startsWith("*")) {
                continue
            }

            // Check for class or interface keywords
            if (/^(export\s+)?(abstract\s+)?class\s+/.test(lineText)) {
                return "class"
            }
            if (/^(export\s+)?interface\s+/.test(lineText)) {
                return "interface"
            }

            // If we hit another declaration or block end, stop looking
            if (lineText.includes("}") && !lineText.includes("{")) {
                break
            }
        }

        return "unknown"
    }
}
