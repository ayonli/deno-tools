import * as vscode from "vscode"
import process from "node:process"

import { type FixProvider, getAllFixProviders, getDisableRuleProvider } from "./fixes/index.ts"

import { BaseProvider } from "../base.ts"

interface DenoConfig {
    fmt?: {
        include?: string[]
        exclude?: string[]
    }
    lint?: {
        include?: string[]
        exclude?: string[]
    }
}

// Supported languages for Deno Linter
export const LINTING_SUPPORTED_LANGUAGES = [
    { scheme: "file", language: "typescript" },
    { scheme: "file", language: "typescriptreact" },
    { scheme: "file", language: "javascript" },
    { scheme: "file", language: "javascriptreact" },
    { scheme: "file", language: "ts" },
    { scheme: "file", language: "tsx" },
    { scheme: "file", language: "js" },
    { scheme: "file", language: "jsx" },
] as const

interface LintMessage {
    range: {
        start: { line: number; col: number }
        end: { line: number; col: number }
    }
    filename: string
    message: string
    code: string
    hint?: string
    docs?: string
}

interface LintError {
    file_path: string
    message: string
}

export class LintingProvider extends BaseProvider implements vscode.CodeActionProvider {
    private diagnosticsCollection: vscode.DiagnosticCollection
    private fixProviders: FixProvider[]
    private disableRuleProvider: FixProvider
    private lintingTimers: Map<string, NodeJS.Timeout> = new Map()
    private documentChangeListener?: vscode.Disposable
    private documentOpenListener?: vscode.Disposable
    private documentSaveListener?: vscode.Disposable
    private documentCloseListener?: vscode.Disposable
    private linterConfigChangeListener?: vscode.Disposable

    constructor() {
        super()
        this.diagnosticsCollection = vscode.languages.createDiagnosticCollection(
            "deno-tools-linter",
        )
        this.fixProviders = getAllFixProviders()
        this.disableRuleProvider = getDisableRuleProvider()
    }

    public getSupportedLanguages(): vscode.DocumentFilter[] {
        return [...LINTING_SUPPORTED_LANGUAGES]
    }

    public getConfigurationSection(): string {
        return "linter"
    }

    private isDebugEnabled(): boolean {
        const config = vscode.workspace.getConfiguration("deno-tools.linter")
        return config.get<boolean>("debug", false)
    }

    protected getCommandArgs(document: vscode.TextDocument): string[] {
        const args = ["lint", "--json"]

        this.addConfigIfFound(args, document)

        const ext = this.getExtension(document)
        args.push(`--ext=${ext}`, "-")

        return args
    }

    protected onEnable(): void {
        this.setupFileWatchers()
        // Re-lint all open documents
        vscode.workspace.textDocuments.forEach((document) => {
            if (this.isSupportedDocument(document)) {
                this.lintDocument(document)
            }
        })
    }

    protected onDisable(): void {
        this.diagnosticsCollection.clear()
        // Clear any pending timers when linting is disabled
        this.lintingTimers.forEach((timer) => clearTimeout(timer))
        this.lintingTimers.clear()
    }

    protected onDispose(): void {
        this.disposeFileWatchers()
        this.lintingTimers.forEach((timer) => clearTimeout(timer))
        this.lintingTimers.clear()
        this.diagnosticsCollection.dispose()
    }

    public getDiagnosticsForDocument(document: vscode.TextDocument): readonly vscode.Diagnostic[] {
        return this.diagnosticsCollection.get(document.uri) || []
    }

    public getFileWatcherDisposables(): vscode.Disposable[] {
        const disposables: vscode.Disposable[] = []
        if (this.documentChangeListener) { disposables.push(this.documentChangeListener) }
        if (this.documentOpenListener) { disposables.push(this.documentOpenListener) }
        if (this.documentSaveListener) { disposables.push(this.documentSaveListener) }
        if (this.documentCloseListener) { disposables.push(this.documentCloseListener) }
        if (this.linterConfigChangeListener) { disposables.push(this.linterConfigChangeListener) }
        return disposables
    }

    protected override isSupportedDocument(document: vscode.TextDocument): boolean {
        const isLanguageSupported = document.uri.scheme === "file" &&
            this.getSupportedLanguages().some((filter) =>
                filter.language === document.languageId &&
                (!filter.scheme || filter.scheme === document.uri.scheme)
            )

        if (!isLanguageSupported) {
            return false
        }

        return this.shouldProcessFile(document)
    }

    /**
     * Check if a file should be processed based on Deno configuration include/exclude patterns
     */
    private shouldProcessFile(document: vscode.TextDocument): boolean {
        const configPath = this.findDenoConfig(document.uri)
        if (!configPath) {
            return true // If no config found, process the file
        }

        try {
            const config = this.parseDenoConfig(configPath)
            return this.matchesIncludeExclude(document.uri, config)
        } catch {
            return true
        }
    }

    public async lintDocument(document: vscode.TextDocument, fix = false): Promise<void> {
        if (!this.enabled || !this.isSupportedDocument(document)) {
            return
        }

        try {
            const diagnostics = await this.runLint(document, fix)
            this.diagnosticsCollection.set(document.uri, diagnostics)
        } catch (error) {
            this.outputChannel.appendLine(`Deno Linter failed: ${error}`)
            this.diagnosticsCollection.clear()
        }
    }

    private async runLint(
        document: vscode.TextDocument,
        fix = false,
    ): Promise<vscode.Diagnostic[]> {
        // Get the workspace folder for proper working directory
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
        const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd()
        const args = this.getCommandArgs(document)
        if (fix) {
            args.pop()
            args.push("--fix")
            args.push(document.fileName)
        }

        const { stdout, stderr } = await this.executeCommand(document, { args, cwd })

        if (stderr && !stdout) {
            throw new Error(stderr)
        } else if (this.isDebugEnabled()) {
            this.outputChannel.appendLine(stdout)
        }

        return this.parseLintOutput(stdout, document, fix)
    }

    private addConfigIfFound(
        args: string[],
        document: vscode.TextDocument,
    ): void {
        const configPath = this.findDenoConfig(document.uri)
        if (configPath) {
            args.push("--config", configPath)
        }
    }

    private parseLintOutput(
        output: string,
        document: vscode.TextDocument,
        showErrorPopup = false,
    ): vscode.Diagnostic[] {
        if (!output.trim()) {
            return []
        }

        try {
            const result = JSON.parse(output)
            const diagnostics: LintMessage[] = result.diagnostics || []
            const errors = result.errors || []

            // Handle linter errors and report them to the user
            if (errors.length > 0) {
                for (const error of errors) {
                    const errorMessage = `Deno Linter error in ${error.file_path}: ${error.message}`
                    this.outputChannel.appendLine(errorMessage)

                    if (showErrorPopup) {
                        vscode.window.showErrorMessage(
                            `Deno Linter failed: ${error.message}`,
                            "Show Output",
                        ).then((selection) => {
                            if (selection === "Show Output") {
                                this.outputChannel.show()
                            }
                        })
                    }
                }
            }

            return diagnostics.map((msg) => {
                msg.docs ??= "https://docs.deno.com/lint/rules/" + msg.code
                return msg
            }).map((msg) => this.convertToDiagnostic(msg, document))
        } catch (error) {
            this.outputChannel.appendLine(`Failed to parse Deno lint output: ${error}`)
            throw new Error(`Failed to parse Deno lint output: ${error}`)
        }
    }

    private convertToDiagnostic(
        msg: LintMessage,
        document: vscode.TextDocument,
    ): vscode.Diagnostic {
        // Convert Deno positions to VS Code positions
        // Deno uses: 1-based line numbers, 0-based column numbers
        // VS Code uses: 0-based line numbers, 0-based column numbers
        let startLine = Math.max(0, msg.range.start.line - 1)
        let startCol = Math.max(0, msg.range.start.col)
        let endLine = Math.max(0, msg.range.end.line - 1)
        let endCol = Math.max(0, msg.range.end.col)

        // Validate and clamp positions to document bounds
        const maxLine = document.lineCount - 1
        startLine = Math.min(startLine, maxLine)
        endLine = Math.min(endLine, maxLine)

        // Validate column positions against line length
        if (startLine < document.lineCount) {
            const startLineLength = document.lineAt(startLine).text.length
            startCol = Math.min(startCol, startLineLength)
        }
        if (endLine < document.lineCount) {
            const endLineLength = document.lineAt(endLine).text.length
            endCol = Math.min(endCol, endLineLength)
        }

        const startPos = new vscode.Position(startLine, startCol)
        const endPos = new vscode.Position(endLine, endCol)

        // Ensure end position is not before start position
        const range = new vscode.Range(startPos, startPos.isAfter(endPos) ? startPos : endPos)

        const diagnostic = new vscode.Diagnostic(
            range,
            msg.message,
            this.getSeverity(msg.code),
        )

        diagnostic.code = msg.code
        diagnostic.source = "deno-lint"

        // Add hint and documentation link as related information
        if (msg.hint || msg.docs) {
            const relatedInfo: vscode.DiagnosticRelatedInformation[] = []

            // Add hint if available
            if (msg.hint) {
                relatedInfo.push(
                    new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(document.uri, range),
                        `💡 ${msg.hint}`,
                    ),
                )
            }

            // Add documentation link if available
            if (msg.docs) {
                relatedInfo.push(
                    new vscode.DiagnosticRelatedInformation(
                        new vscode.Location(document.uri, range),
                        `📖 ${msg.docs}`,
                    ),
                )
            }

            diagnostic.relatedInformation = relatedInfo
        }

        return diagnostic
    }

    private getSeverity(_code: string): vscode.DiagnosticSeverity {
        const config = vscode.workspace.getConfiguration("deno-tools.linter")
        const severityConfig = config.get<string>("severity", "error")

        switch (severityConfig) {
            case "warning":
                return vscode.DiagnosticSeverity.Warning
            case "info":
                return vscode.DiagnosticSeverity.Information
            case "error":
            default:
                return vscode.DiagnosticSeverity.Error
        }
    }

    // Code Actions Provider implementation
    public provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken,
    ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        const regularActions: vscode.CodeAction[] = []
        const disableActions: vscode.CodeAction[] = []

        // Filter and prioritize diagnostics based on relevance to the current range
        const relevantDiagnostics = this.filterAndPrioritizeDiagnostics(
            context.diagnostics,
            range,
        )

        // Process each relevant diagnostic
        for (const diagnostic of relevantDiagnostics) {
            // Get fixes from specific providers
            for (const provider of this.fixProviders) {
                if (provider.canHandle(diagnostic)) {
                    const fixes = provider.createFixes(diagnostic, document)
                    if (fixes.length > 0) {
                        regularActions.push(...fixes)
                        break // Use first matching provider that actually provides fixes
                    }
                }
            }

            // Only provide disable rule fixes when severity is set to "error"
            const config = vscode.workspace.getConfiguration("deno-tools.linter")
            const severityConfig = config.get<string>("severity", "error")

            if (severityConfig === "error") {
                const disableFixes = this.disableRuleProvider.createFixes(diagnostic, document)
                disableActions.push(...disableFixes)
            }
        }

        // Return regular actions first, then disable actions at the bottom
        return [...regularActions, ...disableActions]
    }

    private filterAndPrioritizeDiagnostics(
        diagnostics: readonly vscode.Diagnostic[],
        range: vscode.Range | vscode.Selection,
    ): vscode.Diagnostic[] {
        // First filter to only deno-lint diagnostics that intersect with the range
        const intersectingDiagnostics = diagnostics.filter((diagnostic) => {
            if (diagnostic.source !== "deno-lint") { return false }
            return diagnostic.range.intersection(range) !== undefined
        })

        if (intersectingDiagnostics.length <= 1) {
            return intersectingDiagnostics
        }

        // For cursor positions (zero-width ranges), be more selective
        if (range.isEmpty) {
            const cursorLine = range.start.line
            const cursorChar = range.start.character

            // Find diagnostics that contain the cursor position
            const containingDiagnostics = intersectingDiagnostics.filter((diagnostic) => {
                return diagnostic.range.contains(range.start)
            })

            if (containingDiagnostics.length === 0) {
                return intersectingDiagnostics
            }

            // Sort by range size (smallest first) and position relevance
            const scoredDiagnostics = containingDiagnostics.map((diagnostic) => {
                const rangeSize = this.calculateRangeSize(diagnostic.range)

                // Calculate distance from cursor to diagnostic start
                let distanceScore = 0
                if (diagnostic.range.start.line === cursorLine) {
                    distanceScore = Math.abs(diagnostic.range.start.character - cursorChar)
                } else {
                    distanceScore = Math.abs(diagnostic.range.start.line - cursorLine) * 1000
                }

                return {
                    diagnostic,
                    rangeSize,
                    distanceScore,
                }
            })

            // Sort by distance (closer first), then by size (smaller first)
            scoredDiagnostics.sort((a, b) => {
                if (a.distanceScore !== b.distanceScore) {
                    return a.distanceScore - b.distanceScore
                }
                return a.rangeSize - b.rangeSize
            })

            // Return only the most relevant diagnostic for cursor positions
            return [scoredDiagnostics[0].diagnostic]
        }

        // For selections, return all intersecting diagnostics
        return intersectingDiagnostics
    }

    private calculateRangeSize(range: vscode.Range): number {
        const lines = range.end.line - range.start.line + 1
        if (lines === 1) {
            return range.end.character - range.start.character
        }
        // For multi-line ranges, approximate size
        return lines * 100 + (range.end.character - range.start.character)
    }

    private setupFileWatchers(): void {
        this.disposeFileWatchers()

        const config = vscode.workspace.getConfiguration("deno-tools")
        const debounceMs = config.get<number>("linter.debounceMs", 1500)

        // Set up document change listeners for real-time linting
        this.documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
            // Only process actual files, not output channels or internal VS Code documents
            if (this.isSupportedDocument(event.document)) {
                const documentKey = event.document.uri.toString()

                if (
                    event.document &&
                    this.enabled &&
                    config.get<boolean>("linter.lintOnChange", true)
                ) {
                    // Clear any existing timer for this document
                    const existingTimer = this.lintingTimers.get(documentKey)
                    if (existingTimer) {
                        clearTimeout(existingTimer)
                    }

                    // Set up new debounced linting timer
                    const timer = setTimeout(() => {
                        this.lintDocument(event.document)
                        this.lintingTimers.delete(documentKey)
                    }, debounceMs)

                    this.lintingTimers.set(documentKey, timer)
                }
            }
        })

        // Lint document when opened
        this.documentOpenListener = vscode.workspace.onDidOpenTextDocument((document) => {
            if (this.isSupportedDocument(document) && this.enabled) {
                this.lintDocument(document)
            }
        })

        // Lint document when saved (immediate, no debounce)
        this.documentSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
            if (this.enabled && this.isSupportedDocument(document)) {
                // Clear any pending timer since we're linting immediately on save
                const documentKey = document.uri.toString()
                const existingTimer = this.lintingTimers.get(documentKey)
                if (existingTimer) {
                    clearTimeout(existingTimer)
                    this.lintingTimers.delete(documentKey)
                }

                this.lintDocument(document)
            }
        })

        // Clean up timers and diagnostics when documents are closed
        this.documentCloseListener = vscode.workspace.onDidCloseTextDocument((document) => {
            const documentKey = document.uri.toString()
            const existingTimer = this.lintingTimers.get(documentKey)
            if (existingTimer) {
                clearTimeout(existingTimer)
                this.lintingTimers.delete(documentKey)
            }

            // Clear diagnostics for the closed document
            this.diagnosticsCollection.delete(document.uri)
        })

        // Listen for linter-specific configuration changes
        this.linterConfigChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
            if (
                event.affectsConfiguration("deno-tools.linter.lintOnChange") ||
                event.affectsConfiguration("deno-tools.linter.debounceMs")
            ) {
                // Refresh file watchers with new configuration
                this.setupFileWatchers()
            }
        })
    }

    private disposeFileWatchers(): void {
        this.documentChangeListener?.dispose()
        this.documentOpenListener?.dispose()
        this.documentSaveListener?.dispose()
        this.documentCloseListener?.dispose()
        this.linterConfigChangeListener?.dispose()
    }
}
