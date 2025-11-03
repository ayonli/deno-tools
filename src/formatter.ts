import * as vscode from "vscode"
import { spawn } from "node:child_process"
import { promises as fs } from "node:fs"
import * as path from "node:path"
import { Buffer } from "node:buffer"

// Supported languages for Deno formatting
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
    // SQL
    { scheme: "file", language: "sql" },
] as const

export class DenoDocumentFormattingEditProvider implements vscode.DocumentFormattingEditProvider {
    async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _options: vscode.FormattingOptions,
        token: vscode.CancellationToken,
    ): Promise<vscode.TextEdit[]> {
        try {
            const text = document.getText()
            const args = await this.buildDenoFormatArgs(document)
            const formattedText = await this.runDenoFormat(args, text, token)

            return this.createTextEdit(document, formattedText)
        } catch (error) {
            console.error(`Error running deno fmt: ${error}`)
            throw error
        }
    }

    private getDenoExtension(document: vscode.TextDocument): string {
        const fileExtension = this.extractFileExtension(document.fileName)

        if (this.isDirectlySupportedExtension(fileExtension)) {
            return fileExtension
        }

        return this.mapLanguageIdToExtension(document.languageId)
    }

    private extractFileExtension(fileName: string): string {
        return fileName.split(".").pop()?.toLowerCase() || ""
    }

    private isDirectlySupportedExtension(extension: string): boolean {
        const supportedExtensions = [
            "ts",
            "tsx",
            "js",
            "jsx",
            "mts",
            "mjs",
            "cts",
            "cjs",
            "json",
            "jsonc",
            "md",
            "css",
            "scss",
            "sass",
            "less",
            "html",
            "yml",
            "yaml",
            "sql",
            "vto",
            "njk",
            // Note: ipynb (Jupyter notebooks) also supported
        ]

        return supportedExtensions.includes(extension) || extension === "ipynb"
    }

    private mapLanguageIdToExtension(languageId: string): string {
        const languageMap: Record<string, string> = {
            typescript: "ts",
            typescriptreact: "tsx",
            javascript: "js",
            javascriptreact: "jsx",
            json: "json",
            jsonc: "jsonc",
            yaml: "yaml",
            markdown: "md",
            html: "html",
            css: "css",
            scss: "scss",
            sass: "sass",
            less: "less",
            sql: "sql",
        }

        return languageMap[languageId] || "ts"
    }

    private needsUnstableFlag(document: vscode.TextDocument): boolean {
        const extension = this.getDenoExtension(document)
        const unstableExtensions = ["html", "svelte", "vue", "astro"]
        return unstableExtensions.includes(extension)
    }

    private addUnstableFlagsIfNeeded(
        args: string[],
        document: vscode.TextDocument,
    ): void {
        if (!this.needsUnstableFlag(document)) {
            return
        }

        const extension = this.getDenoExtension(document)
        const componentExtensions = ["html", "svelte", "vue", "astro"]

        if (componentExtensions.includes(extension)) {
            args.push("--unstable-component")
        }
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

    private async buildDenoFormatArgs(
        document: vscode.TextDocument,
    ): Promise<string[]> {
        const args = ["fmt"]

        await this.addConfigIfFound(args, document)
        this.addUnstableFlagsIfNeeded(args, document)

        const extension = this.getDenoExtension(document)
        args.push(`--ext=${extension}`, "-")

        return args
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

    private async runDenoFormat(
        args: string[],
        text: string,
        token: vscode.CancellationToken,
    ): Promise<string> {
        const denoProcess = spawn("deno", args)

        const { stdout, stderr } = await this.executeProcess(
            denoProcess,
            text,
            token,
        )

        if (stderr) {
            console.warn(`Deno fmt warning: ${stderr}`)
        }

        return stdout
    }

    private executeProcess(
        process: ReturnType<typeof spawn>,
        input: string,
        token: vscode.CancellationToken,
    ): Promise<{ stdout: string; stderr: string }> {
        let stdout = ""
        let stderr = ""

        process.stdout?.on("data", (data: Buffer) => {
            stdout += data.toString()
        })

        process.stderr?.on("data", (data: Buffer) => {
            stderr += data.toString()
        })

        process.stdin?.write(input)
        process.stdin?.end()

        return new Promise<{ stdout: string; stderr: string }>(
            (resolve, reject) => {
                process.on("close", (code: number) => {
                    if (code !== 0) {
                        reject(
                            new Error(
                                `Deno fmt exited with code ${code}: ${stderr}`,
                            ),
                        )
                    } else {
                        resolve({ stdout, stderr })
                    }
                })

                process.on("error", reject)

                token.onCancellationRequested(() => {
                    process.kill()
                    reject(new Error("Formatting cancelled"))
                })
            },
        )
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
}
