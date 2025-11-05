import * as vscode from "vscode"

import { BaseProvider } from "./base.ts"

// Supported languages for Deno Formatter
export const SUPPORTED_LANGUAGES = [
    // TypeScript variants
    { scheme: "file", language: "typescript" },
    { scheme: "file", language: "typescriptreact" },
    // JavaScript variants
    { scheme: "file", language: "javascript" },
    { scheme: "file", language: "javascriptreact" },
    // JSON variants
    { scheme: "file", language: "json" },
    { scheme: "file", language: "jsonc" },
    // YAML
    { scheme: "file", language: "yaml" },
    // Markdown
    { scheme: "file", language: "markdown" },
    // Web technologies
    { scheme: "file", language: "html" },
    { scheme: "file", language: "css" },
    { scheme: "file", language: "scss" },
    { scheme: "file", language: "sass" },
    { scheme: "file", language: "less" },
    // Vue
    { scheme: "file", language: "vue" },
    // Svelte
    { scheme: "file", language: "svelte" },
    // Astro
    { scheme: "file", language: "astro" },
    // SQL
    { scheme: "file", language: "sql" },
] as const

const UNSTABLE_EXTENSIONS = ["html", "svelte", "vue", "astro"]

export class DocumentFormattingEditProvider extends BaseProvider
    implements vscode.DocumentFormattingEditProvider {
    private formattingProvider?: vscode.Disposable

    constructor() {
        super()
    }

    public getSupportedLanguages(): vscode.DocumentFilter[] {
        return [...SUPPORTED_LANGUAGES]
    }

    public getConfigurationSection(): string {
        return "formatter"
    }

    protected getCommandArgs(document: vscode.TextDocument): string[] {
        const args = ["fmt"]
        const ext = this.getExtension(document)

        this.addConfigIfFound(args, document)

        if (UNSTABLE_EXTENSIONS.includes(ext)) {
            args.push("--unstable-component")
        }

        args.push(`--ext=${ext}`, "-")

        return args
    }

    protected onEnable(): void {
        // Register the formatting provider when enabled
        if (!this.formattingProvider) {
            this.formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
                SUPPORTED_LANGUAGES,
                this,
            )
            console.log("🎨 FORMATTER: Formatting provider registered")
        }
    }

    protected onDisable(): void {
        // Unregister the formatting provider when disabled
        if (this.formattingProvider) {
            this.formattingProvider.dispose()
            this.formattingProvider = undefined
            console.log("🎨 FORMATTER: Formatting provider unregistered")
        }
    }

    protected onDispose(): void {
        if (this.formattingProvider) {
            this.formattingProvider.dispose()
            this.formattingProvider = undefined
        }
    }
    async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _options: vscode.FormattingOptions,
        token: vscode.CancellationToken,
    ): Promise<vscode.TextEdit[]> {
        if (!this.isSupportedDocument(document)) {
            return []
        }

        // Check if the file is excluded by fmt.exclude patterns
        const isExcluded = await this.checkIfFileExcluded(document.uri)
        if (isExcluded) {
            return []
        }

        try {
            const formattedText = await this.runFormat(document, token)
            return this.createTextEdit(document, formattedText)
        } catch (error) {
            console.error(`Deno Formatter error: ${error}`)
            throw error
        }
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

    private async runFormat(
        document: vscode.TextDocument,
        token: vscode.CancellationToken,
    ): Promise<string> {
        const { stdout, stderr } = await this.executeCommand(document, {
            cancellationToken: token,
            throwOnError: true,
        })

        if (stderr) {
            this.outputChannel.appendLine(`Deno Formatter failed: ${stderr}`)
            this.outputChannel.show()
        } else {
            this.outputChannel.appendLine(`Formatted ${document.fileName}`)
        }

        return stdout
    }

    private createTextEdit(
        document: vscode.TextDocument,
        formattedText: string,
    ): vscode.TextEdit[] {
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length),
        )

        return [vscode.TextEdit.replace(fullRange, formattedText)]
    }

    private getRelativePath(fileUri: vscode.Uri): string {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri)
        if (workspaceFolder) {
            return vscode.workspace.asRelativePath(fileUri, false)
        }
        return fileUri.fsPath
    }

    private async checkIfFileExcluded(documentUri: vscode.Uri): Promise<boolean> {
        const shouldProcess = this.shouldProcessFile(documentUri)

        if (shouldProcess) {
            return false
        }

        await this.showExclusionWarning(documentUri)
        return true
    }

    private async showExclusionWarning(documentUri: vscode.Uri): Promise<void> {
        const configuration = vscode.workspace.getConfiguration("deno-tools")
        const warnOnExclude = configuration.get<boolean>("formatter.warnOnExclude", true)

        if (!warnOnExclude) {
            return
        }

        const relativePath = this.getRelativePath(documentUri)
        const action = await vscode.window.showWarningMessage(
            `File "${relativePath}" is excluded from formatting by the deno.json/deno.jsonc configuration.`,
            "Don't show again",
            "OK",
        )

        if (action === "Don't show again") {
            await configuration.update(
                "formatter.warnOnExclude",
                false,
                vscode.ConfigurationTarget.Workspace,
            )
        }
    }
}
