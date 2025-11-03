import * as vscode from "vscode"
import { DocumentFormattingEditProvider } from "./formatter.ts"
import { LINTING_SUPPORTED_LANGUAGES, LintingProvider } from "./linter/index.ts"
import { BaseProvider } from "./base.ts"

export function activate(context: vscode.ExtensionContext) {
    console.log("Deno Rules extension is activating...")

    // Initialize providers - they will handle their own configuration and registration
    const formattingProvider = new DocumentFormattingEditProvider()
    const lintingProvider = new LintingProvider()

    // Register code action provider for lint fixes
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        LINTING_SUPPORTED_LANGUAGES,
        lintingProvider,
        {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
        },
    )

    const fixCurrentFileCommand = vscode.commands.registerCommand(
        "deno-tools.fixCurrentFile",
        async () => {
            const activeEditor = vscode.window.activeTextEditor
            if (!activeEditor) {
                vscode.window.showWarningMessage("No active file to fix")
                return
            }

            console.log(
                `🔧 EXTENSION: Fix command for ${activeEditor.document.fileName} (${activeEditor.document.languageId})`,
            )

            // First lint the document to get fresh diagnostics
            await lintingProvider.lintDocument(activeEditor.document)

            // Get all available code actions (fixes) for the current file
            const codeActions = await lintingProvider.provideCodeActions(
                activeEditor.document,
                new vscode.Range(0, 0, activeEditor.document.lineCount - 1, 0),
                {
                    diagnostics: lintingProvider.getDiagnosticsForDocument(activeEditor.document),
                    only: vscode.CodeActionKind.QuickFix,
                    triggerKind: vscode.CodeActionTriggerKind.Invoke,
                },
                new vscode.CancellationTokenSource().token,
            )

            if (!codeActions || codeActions.length === 0) {
                vscode.window.showInformationMessage("No auto-fixes available for this file")
                return
            }

            let fixesApplied = 0
            for (const codeAction of codeActions) {
                if (codeAction instanceof vscode.CodeAction && codeAction.edit) {
                    try {
                        await vscode.workspace.applyEdit(codeAction.edit)
                        fixesApplied++
                    } catch (error) {
                        console.error(`Failed to apply fix "${codeAction.title}":`, error)
                    }
                }
            }

            if (fixesApplied > 0) {
                vscode.window.showInformationMessage(
                    `✅ Applied ${fixesApplied} auto-fix(es) to current file`,
                )
                // Re-lint after applying fixes to update diagnostics
                setTimeout(() => lintingProvider.lintDocument(activeEditor.document), 100)
            } else {
                vscode.window.showInformationMessage("No fixes could be applied automatically")
            }
        },
    )

    // Register all providers and listeners
    const subscriptions = [
        formattingProvider,
        lintingProvider,
        codeActionProvider,
        fixCurrentFileCommand,
        ...lintingProvider.getFileWatcherDisposables(),
    ]

    context.subscriptions.push(...subscriptions)

    console.log("✅ DENO TOOLS EXTENSION: Successfully activated with formatting and linting!")
    vscode.window.showInformationMessage(
        "✅ Deno Tools extension activated! " +
            `Formatter: ${formattingProvider.isEnabled() ? "enabled" : "disabled"}, ` +
            `Linter: ${lintingProvider.isEnabled() ? "enabled" : "disabled"}`,
    )
}

export function deactivate() {
    // Cleanup shared resources
    BaseProvider.disposeSharedResources()
}
