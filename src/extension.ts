// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"
import { DenoDocumentFormattingEditProvider, SUPPORTED_LANGUAGES } from "./formatter.ts"
import { DenoLintingProvider, LINTING_SUPPORTED_LANGUAGES } from "./linter/index.ts"

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log("Deno Rules extension is activating...")

    // Get configuration
    const config = vscode.workspace.getConfiguration("deno-tools")

    // Conditionally register the document formatting provider for supported languages
    let formattingProvider: vscode.Disposable | undefined
    if (config.get<boolean>("formatter.enabled", true)) {
        formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
            SUPPORTED_LANGUAGES,
            new DenoDocumentFormattingEditProvider(),
        )
    }

    // Initialize linting provider
    const lintingProvider = new DenoLintingProvider()

    // Register code action provider for lint fixes
    const codeActionProvider = vscode.languages.registerCodeActionsProvider(
        LINTING_SUPPORTED_LANGUAGES,
        lintingProvider,
        {
            providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
        },
    )
    const debounceMs = config.get<number>("linter.debounceMs", 1500) // Increased default to 1.5 seconds

    // Debounce timer tracking for each document
    const lintingTimers = new Map<string, NodeJS.Timeout>()

    // Set up document change listeners for real-time linting
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        // Only process actual files, not output channels or internal VS Code documents
        if (
            event.document.uri.scheme === "file" &&
            !event.document.fileName.includes("extension-output") &&
            !event.document.fileName.includes("#") &&
            event.document.languageId !== "Log" &&
            event.document.languageId !== "log"
        ) {
            const documentKey = event.document.uri.toString()

            if (
                event.document &&
                config.get<boolean>("linter.enabled", true) &&
                config.get<boolean>("linter.lintOnChange", true)
            ) {
                // Clear any existing timer for this document
                const existingTimer = lintingTimers.get(documentKey)
                if (existingTimer) {
                    clearTimeout(existingTimer)
                }

                // Set up new debounced linting timer
                const timer = setTimeout(() => {
                    lintingProvider.lintDocument(event.document)
                    lintingTimers.delete(documentKey)
                }, debounceMs)

                lintingTimers.set(documentKey, timer)
            }
        }
    })

    // Lint document when opened
    const documentOpenListener = vscode.workspace.onDidOpenTextDocument((document) => {
        // Only process actual files, not output channels or internal VS Code documents
        if (
            document.uri.scheme === "file" &&
            !document.fileName.includes("extension-output") &&
            !document.fileName.includes("#") &&
            document.languageId !== "Log" &&
            document.languageId !== "log"
        ) {
            lintingProvider.lintDocument(document)
        }
    })

    // Lint document when saved (immediate, no debounce)
    const documentSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
        if (config.get<boolean>("linter.enabled", true)) {
            // Clear any pending timer since we're linting immediately on save
            const documentKey = document.uri.toString()
            const existingTimer = lintingTimers.get(documentKey)
            if (existingTimer) {
                clearTimeout(existingTimer)
                lintingTimers.delete(documentKey)
            }

            lintingProvider.lintDocument(document)
        }
    })

    // Clean up timers when documents are closed
    const documentCloseListener = vscode.workspace.onDidCloseTextDocument((document) => {
        const documentKey = document.uri.toString()
        const existingTimer = lintingTimers.get(documentKey)
        if (existingTimer) {
            clearTimeout(existingTimer)
            lintingTimers.delete(documentKey)
        }
    })

    // Register commands
    const toggleLintingCommand = vscode.commands.registerCommand("deno-tools.toggleLinting", () => {
        const currentConfig = vscode.workspace.getConfiguration("deno-tools")
        const currentEnabled = currentConfig.get<boolean>("linter.enabled", true)

        currentConfig.update(
            "linter.enabled",
            !currentEnabled,
            vscode.ConfigurationTarget.Workspace,
        )

        if (!currentEnabled) {
            lintingProvider.enable()
            // Lint all open documents
            vscode.workspace.textDocuments.forEach((document) => {
                lintingProvider.lintDocument(document)
            })
        } else {
            lintingProvider.disable()
        }
    })

    const toggleFormatterCommand = vscode.commands.registerCommand(
        "deno-tools.toggleFormatter",
        () => {
            const currentConfig = vscode.workspace.getConfiguration("deno-tools")
            const currentEnabled = currentConfig.get<boolean>("formatter.enabled", true)

            currentConfig.update(
                "formatter.enabled",
                !currentEnabled,
                vscode.ConfigurationTarget.Workspace,
            )

            if (!currentEnabled) {
                // Silently enable formatter - requires reload to take effect
                vscode.commands.executeCommand("workbench.action.reloadWindow")
            }
            // Silently disable formatter
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

    // Listen for configuration changes
    const configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
        if (
            event.affectsConfiguration("deno-tools.linter.enabled") ||
            event.affectsConfiguration("deno-tools.linter.lintOnChange")
        ) {
            const newConfig = vscode.workspace.getConfiguration("deno-tools")
            const isEnabled = newConfig.get<boolean>("linter.enabled", true)
            const lintOnChange = newConfig.get<boolean>("linter.lintOnChange", true)

            console.log(
                `⚙️ EXTENSION: Linting config changed - enabled: ${isEnabled}, lintOnChange: ${lintOnChange}`,
            )

            if (isEnabled) {
                lintingProvider.enable()
                // Re-lint all open documents
                vscode.workspace.textDocuments.forEach((document) => {
                    lintingProvider.lintDocument(document)
                })
            } else {
                lintingProvider.disable()
                // Clear any pending timers when linting is disabled
                lintingTimers.forEach((timer) => clearTimeout(timer))
                lintingTimers.clear()
            }
        }

        if (event.affectsConfiguration("deno-tools.formatter.enabled")) {
            const newConfig = vscode.workspace.getConfiguration("deno-tools")
            const formatterEnabled = newConfig.get<boolean>("formatter.enabled", true)

            console.log(`⚙️ EXTENSION: Formatter config changed - enabled: ${formatterEnabled}`)

            // Silently reload window if formatter was enabled to register the provider
            if (formatterEnabled) {
                vscode.commands.executeCommand("workbench.action.reloadWindow")
            }
        }
    })

    // Register all providers and listeners
    const subscriptions = [
        lintingProvider,
        codeActionProvider,
        documentChangeListener,
        documentOpenListener,
        documentSaveListener,
        documentCloseListener,
        toggleFormatterCommand,
        toggleLintingCommand,
        fixCurrentFileCommand,
        configChangeListener,
    ]

    if (formattingProvider) {
        subscriptions.push(formattingProvider)
    }

    context.subscriptions.push(...subscriptions)

    // Lint all currently open documents if linting is enabled
    console.log(`📋 EXTENSION: Found ${vscode.workspace.textDocuments.length} open documents`)
    if (config.get<boolean>("linter.enabled", true)) {
        vscode.workspace.textDocuments.forEach((document) => {
            // Only lint actual files
            if (
                document.uri.scheme === "file" &&
                !document.fileName.includes("extension-output") &&
                !document.fileName.includes("#") &&
                document.languageId !== "Log" &&
                document.languageId !== "log"
            ) {
                console.log(
                    `🔄 EXTENSION: Linting existing document: ${document.fileName} (${document.languageId})`,
                )
                lintingProvider.lintDocument(document)
            }
        })
    }

    console.log("✅ DENO TOOLS EXTENSION: Successfully activated with formatting and linting!")
    vscode.window.showInformationMessage(
        "✅ Deno Tools extension activated! " +
            `Formatter: ${
                config.get<boolean>("formatter.enabled", true) ? "enabled" : "disabled"
            }, ` +
            `Linter: ${config.get<boolean>("linter.enabled", true) ? "enabled" : "disabled"}`,
    )
}

// This method is called when your extension is deactivated
export function deactivate() {
    // Clean up any remaining timers
    // Note: In practice, VS Code should handle this cleanup automatically when the extension is deactivated
}
