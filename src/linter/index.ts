import * as vscode from "vscode"
import { spawn } from "node:child_process"
import { promises as fs } from "node:fs"
import * as path from "node:path"
import { Buffer } from "node:buffer"
import process from "node:process"

// Import fix providers
import { type FixProvider, getAllFixProviders, getDisableRuleProvider } from "./fixes/index.ts"

// Supported languages for Deno linter
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

interface DenoLintMessage {
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

export class DenoLintingProvider implements vscode.CodeActionProvider {
    private diagnosticsCollection: vscode.DiagnosticCollection
    private outputChannel: vscode.OutputChannel
    private lintingEnabled: boolean = true
    private fixProviders: FixProvider[]
    private disableRuleProvider: FixProvider

    constructor() {
        this.diagnosticsCollection = vscode.languages.createDiagnosticCollection(
            "deno-tools-linter",
        )
        this.outputChannel = vscode.window.createOutputChannel("Deno Tools")
        this.fixProviders = getAllFixProviders()
        this.disableRuleProvider = getDisableRuleProvider()
    }

    public enable(): void {
        this.lintingEnabled = true
    }

    public disable(): void {
        this.lintingEnabled = false
        this.diagnosticsCollection.clear()
    }

    public getDiagnosticsForDocument(document: vscode.TextDocument): readonly vscode.Diagnostic[] {
        return this.diagnosticsCollection.get(document.uri) || []
    }

    public dispose(): void {
        this.diagnosticsCollection.dispose()
        this.outputChannel.dispose()
    }

    public async lintDocument(document: vscode.TextDocument): Promise<void> {
        // Skip non-file documents
        if (document.uri.scheme !== "file") {
            return
        }

        // Skip VS Code internal files and output channels
        if (
            document.fileName.includes("extension-output") ||
            document.fileName.includes("vscode-") ||
            document.languageId === "Log" ||
            document.languageId === "log" ||
            document.fileName.includes("#")
        ) {
            return
        }

        if (!this.lintingEnabled) {
            return
        }

        if (!this.isLintingSupported(document)) {
            return
        }

        try {
            const diagnostics = await this.runDenoLint(document)
            this.diagnosticsCollection.set(document.uri, diagnostics)

            if (diagnostics.length > 0) {
                this.outputChannel.appendLine(
                    `Found ${diagnostics.length} lint issues in ${document.fileName}`,
                )
            }
        } catch (error) {
            this.outputChannel.appendLine(`Deno linter failed: ${error}`)
            this.outputChannel.show()
            vscode.window.showErrorMessage(`Deno linter failed: ${error}`)
            this.diagnosticsCollection.clear()
        }
    }

    private isLintingSupported(document: vscode.TextDocument): boolean {
        return LINTING_SUPPORTED_LANGUAGES.some(
            (lang) => lang.language === document.languageId,
        )
    }

    private async runDenoLint(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        const text = document.getText()
        const args = await this.buildDenoLintArgs(document)

        // Get the workspace folder for proper working directory
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)
        const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd()

        const denoProcess = spawn("deno", args, { cwd })
        const { stdout, stderr } = await this.executeProcess(denoProcess, text)

        if (stderr && !stdout) {
            throw new Error(`Deno lint error: ${stderr}`)
        }

        return this.parseLintOutput(stdout, document)
    }

    private async buildDenoLintArgs(document: vscode.TextDocument): Promise<string[]> {
        const args = ["lint", "--json"]

        await this.addConfigIfFound(args, document)

        args.push("-")
        return args
    }

    private async findDenoConfig(
        documentUri: vscode.Uri,
    ): Promise<string | null> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri)
        if (!workspaceFolder) {
            return null
        }

        const currentDir = path.dirname(documentUri.fsPath)
        const workspaceRoot = workspaceFolder.uri.fsPath

        return await this.searchConfigInDirectories(currentDir, workspaceRoot)
    }

    private async searchConfigInDirectories(
        startDir: string,
        rootDir: string,
    ): Promise<string | null> {
        let currentDir = startDir

        while (currentDir.startsWith(rootDir)) {
            const configPath = await this.findConfigInDirectory(currentDir)
            if (configPath) {
                return configPath
            }

            const parentDir = path.dirname(currentDir)
            if (parentDir === currentDir) {
                break // Reached filesystem root
            }
            currentDir = parentDir
        }

        return null
    }

    private async findConfigInDirectory(
        directory: string,
    ): Promise<string | null> {
        const configNames = ["deno.json", "deno.jsonc"]

        for (const configName of configNames) {
            const configPath = path.join(directory, configName)
            if (await this.fileExists(configPath)) {
                return configPath
            }
        }

        return null
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath)
            return true
        } catch {
            return false
        }
    }

    private async addConfigIfFound(
        args: string[],
        document: vscode.TextDocument,
    ): Promise<void> {
        const configPath = await this.findDenoConfig(document.uri)
        if (configPath) {
            args.push("--config", configPath)
        }
    }

    private executeProcess(
        denoProcess: ReturnType<typeof spawn>,
        input: string,
    ): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            const stdoutChunks: Buffer[] = []
            const stderrChunks: Buffer[] = []

            denoProcess.stdout?.on("data", (data) => {
                stdoutChunks.push(Buffer.from(data))
            })

            denoProcess.stderr?.on("data", (data) => {
                stderrChunks.push(Buffer.from(data))
            })

            denoProcess.on("error", (error) => {
                reject(error)
            })

            denoProcess.on("close", (_code) => {
                const stdout = Buffer.concat(stdoutChunks).toString()
                const stderr = Buffer.concat(stderrChunks).toString()
                resolve({ stdout, stderr })
            })

            if (denoProcess.stdin) {
                denoProcess.stdin.write(input)
                denoProcess.stdin.end()
            }
        })
    }

    private parseLintOutput(output: string, document: vscode.TextDocument): vscode.Diagnostic[] {
        if (!output.trim()) {
            return []
        }

        try {
            const result = JSON.parse(output)
            const diagnostics = result.diagnostics || []

            return diagnostics.map((msg: DenoLintMessage) =>
                this.convertToDiagnostic(msg, document)
            )
        } catch (error) {
            this.outputChannel.appendLine(`Failed to parse Deno lint output: ${error}`)
            throw new Error(`Failed to parse Deno lint output: ${error}`)
        }
    }

    private convertToDiagnostic(
        msg: DenoLintMessage,
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

        // Add hint as related information
        if (msg.hint) {
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(
                    new vscode.Location(document.uri, range),
                    `Hint: ${msg.hint}`,
                ),
            ]
        }

        return diagnostic
    }

    private getSeverity(code: string): vscode.DiagnosticSeverity {
        // Most Deno lint rules are errors, but some could be warnings
        const warningCodes = ["prefer-const", "no-unused-vars"]
        return warningCodes.includes(code)
            ? vscode.DiagnosticSeverity.Warning
            : vscode.DiagnosticSeverity.Error
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

        // Debug logging (remove in production)
        console.log(
            `🎯 CODE ACTIONS: Range: ${range.start.line}:${range.start.character}-${range.end.line}:${range.end.character}, isEmpty: ${range.isEmpty}`,
        )
        console.log(`📋 CODE ACTIONS: ${context.diagnostics.length} diagnostics in context:`)
        context.diagnostics.forEach((d) => {
            console.log(
                `  - ${d.code}: ${d.range.start.line}:${d.range.start.character}-${d.range.end.line}:${d.range.end.character} "${d.message}"`,
            )
        })

        // Filter and prioritize diagnostics based on relevance to the current range
        const relevantDiagnostics = this.filterAndPrioritizeDiagnostics(
            context.diagnostics,
            range,
        )

        console.log(
            `✅ CODE ACTIONS: ${relevantDiagnostics.length} relevant diagnostics after filtering:`,
        )
        relevantDiagnostics.forEach((d) => {
            console.log(
                `  - Selected: ${d.code} (${d.range.start.line}:${d.range.start.character}-${d.range.end.line}:${d.range.end.character}) "${d.message}"`,
            )
        })

        if (
            relevantDiagnostics.length !==
                context.diagnostics.filter((d) => d.source === "deno-lint").length
        ) {
            console.log(
                `🔄 CODE ACTIONS: Filtered from ${
                    context.diagnostics.filter((d) => d.source === "deno-lint").length
                } to ${relevantDiagnostics.length} diagnostics`,
            )
        }

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

            // Collect disable rule options separately
            const disableFixes = this.disableRuleProvider.createFixes(diagnostic, document)
            disableActions.push(...disableFixes)
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
}
