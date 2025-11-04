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
            await lintingProvider.lintDocument(activeEditor.document, true)
            setTimeout(() => lintingProvider.lintDocument(activeEditor.document), 100)
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
