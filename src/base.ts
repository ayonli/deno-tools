import * as vscode from "vscode"
import * as path from "node:path"
import * as fs from "node:fs"
import * as os from "node:os"
import { spawn } from "node:child_process"
import { Buffer } from "node:buffer"
import { parse as parseJsonc } from "@std/jsonc"
import { minimatch } from "minimatch"
import { contains } from "@ayonli/jsext/path"

export interface ToolConfiguration {
    enabled: boolean
    supportedLanguages: vscode.DocumentFilter[]
}

export interface CommandOptions {
    args?: string[]
    cwd?: string
    cancellationToken?: vscode.CancellationToken
    throwOnError?: boolean
}

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

interface ConfigCache {
    config: DenoConfig
    lastModified: number
    filePath: string
}

/**
 * Shared resources manager for all tools
 */
class ToolsSharedResources {
    private static instance: ToolsSharedResources | undefined
    private outputChannel: vscode.OutputChannel
    private configChangeListener?: vscode.Disposable
    private fileWatcher?: vscode.FileSystemWatcher
    private providers: Set<BaseProvider> = new Set()
    private configCache = new Map<string, ConfigCache>()
    private configPathCache = new Map<string, string | null>()

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel("Deno Tools")
        this.setupConfigurationWatcher()
        this.setupFileWatcher()
    }

    public static getInstance(): ToolsSharedResources {
        if (!ToolsSharedResources.instance) {
            ToolsSharedResources.instance = new ToolsSharedResources()
        }
        return ToolsSharedResources.instance
    }

    public getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel
    }

    public registerProvider(provider: BaseProvider): void {
        this.providers.add(provider)
    }

    public unregisterProvider(provider: BaseProvider): void {
        this.providers.delete(provider)
    }

    public dispose(): void {
        this.configChangeListener?.dispose()
        this.fileWatcher?.dispose()
        this.outputChannel.dispose()
        this.providers.clear()
        this.configCache.clear()
        this.configPathCache.clear()
    }

    public static disposeSharedResources(): void {
        if (ToolsSharedResources.instance) {
            ToolsSharedResources.instance.dispose()
            ToolsSharedResources.instance = undefined
        }
    }

    private setupConfigurationWatcher(): void {
        this.configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration("deno-tools.enable")) {
                const newConfig = vscode.workspace.getConfiguration("deno-tools")

                // Notify all registered providers about configuration changes
                for (const provider of this.providers) {
                    const shouldBeEnabled = provider.checkIfEnabled(newConfig)

                    console.log(
                        `⚙️ ${provider.getConfigurationSection().toUpperCase()}: Config changed - should be enabled: ${shouldBeEnabled}`,
                    )

                    if (shouldBeEnabled && !provider.isEnabled()) {
                        provider.enable()
                    } else if (!shouldBeEnabled && provider.isEnabled()) {
                        provider.disable()
                    }
                }
            }
        })
    }

    private setupFileWatcher(): void {
        // Watch for changes to deno.json and deno.jsonc files
        this.fileWatcher = vscode.workspace.createFileSystemWatcher("**/deno.{json,jsonc}")

        // Clear cache when config files are created, changed, or deleted
        this.fileWatcher.onDidCreate((uri) => this.invalidateConfigCache(uri.fsPath))
        this.fileWatcher.onDidChange((uri) => this.invalidateConfigCache(uri.fsPath))
        this.fileWatcher.onDidDelete((uri) => this.invalidateConfigCache(uri.fsPath))
    }

    private invalidateConfigCache(filePath: string): void {
        // Remove the specific config from cache
        this.configCache.delete(filePath)

        // Also clear any cached configs that might depend on this one
        // (e.g., if a parent directory config was deleted, child directories might need to use a different config)
        this.configCache.clear()

        // Clear config path cache as well since file structure changed
        this.configPathCache.clear()

        console.log(`🔄 CACHE: Invalidated config cache due to changes in ${filePath}`)
    }
    public getCachedConfig(configPath: string): DenoConfig | null {
        const cached = this.configCache.get(configPath)
        if (!cached) {
            return null
        }

        try {
            const stats = fs.statSync(configPath)
            if (stats.mtimeMs === cached.lastModified) {
                console.log(`⚡ CACHE: Using cached config for ${configPath}`)
                return cached.config
            }

            // File was modified, remove from cache
            this.configCache.delete(configPath)
            return null
        } catch {
            // File doesn't exist anymore, remove from cache
            this.configCache.delete(configPath)
            return null
        }
    }

    public setCachedConfig(configPath: string, config: DenoConfig): void {
        try {
            const stats = fs.statSync(configPath)
            this.configCache.set(configPath, {
                config,
                lastModified: stats.mtimeMs,
                filePath: configPath,
            })
        } catch {
            // If we can't stat the file, don't cache it
            console.error(`Failed to cache config for ${configPath}`)
        }
    }

    public getCachedConfigPath(documentUri: string): string | null | undefined {
        return this.configPathCache.get(documentUri)
    }

    public setCachedConfigPath(documentUri: string, configPath: string | null): void {
        this.configPathCache.set(documentUri, configPath)
    }
}

export abstract class BaseProvider implements vscode.Disposable {
    public static disposeSharedResources(): void {
        ToolsSharedResources.disposeSharedResources()
    }
    protected outputChannel: vscode.OutputChannel
    protected enabled: boolean = false
    private sharedResources: ToolsSharedResources

    constructor() {
        this.sharedResources = ToolsSharedResources.getInstance()
        this.outputChannel = this.sharedResources.getOutputChannel()
        this.sharedResources.registerProvider(this)

        // Initialize enabled state based on current configuration
        const shouldBeEnabled = this.checkIfEnabled()
        if (shouldBeEnabled) {
            this.enable()
        }
    }

    public abstract getSupportedLanguages(): vscode.DocumentFilter[]

    public isEnabled(): boolean {
        return this.enabled
    }

    public enable(): void {
        if (this.enabled) { return }
        this.enabled = true
        this.onEnable()
    }

    public disable(): void {
        if (!this.enabled) { return }
        this.enabled = false
        this.onDisable()
    }

    public dispose(): void {
        this.disable()
        this.sharedResources.unregisterProvider(this)
        this.onDispose()
    }

    protected abstract onEnable(): void
    protected abstract onDisable(): void
    protected abstract onDispose(): void
    public abstract getConfigurationSection(): string
    protected abstract getCommandArgs(document: vscode.TextDocument): string[]

    protected isSupportedDocument(document: vscode.TextDocument): boolean {
        return document.uri.scheme === "file" &&
            this.getSupportedLanguages().some((filter) =>
                filter.language === document.languageId &&
                (!filter.scheme || filter.scheme === document.uri.scheme)
            )
    }

    /**
     * Parse the Deno configuration file with caching
     */
    protected parseDenoConfig(configPath: string): DenoConfig {
        // Try to get from cache first
        const cached = this.sharedResources.getCachedConfig(configPath)
        if (cached) {
            return cached
        }

        // Not in cache or outdated, read and parse
        const content = fs.readFileSync(configPath, "utf-8")
        let config: DenoConfig

        // Handle both .json and .jsonc files
        if (configPath.endsWith(".jsonc")) {
            config = parseJsonc(content) as DenoConfig
        } else {
            config = JSON.parse(content) as DenoConfig
        }

        // Cache the parsed config
        this.sharedResources.setCachedConfig(configPath, config)
        console.log(`📁 CONFIG: Parsed and cached ${configPath}`)
        return config
    }

    /**
     * Check if a file matches the include/exclude patterns from Deno config
     */
    protected matchesIncludeExclude(fileUri: vscode.Uri, config: DenoConfig): boolean {
        const toolName = this.getConfigurationSection()

        // Get relative path from workspace root for pattern matching
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri)
        const relativePath = workspaceFolder
            ? path.relative(workspaceFolder.uri.fsPath, fileUri.fsPath)
            : fileUri.fsPath

        if (
            contains(relativePath, "node_modules") ||
            contains(relativePath, ".git")
        ) {
            return false
        }

        // Get tool-specific patterns only (no fallback to global patterns)
        let includePatterns: string[] = []
        let excludePatterns: string[] = []

        if (toolName === "formatter" && config.fmt) {
            includePatterns = config.fmt.include || []
            excludePatterns = config.fmt.exclude || []
        } else if (toolName === "linter" && config.lint) {
            includePatterns = config.lint.include || []
            excludePatterns = config.lint.exclude || []
        }

        // If no tool-specific patterns specified, include by default
        if (includePatterns.length === 0 && excludePatterns.length === 0) {
            return true
        }

        // Check exclude patterns first
        for (const pattern of excludePatterns) {
            if (this.matchesPattern(relativePath, pattern)) {
                return false
            }
        }

        // If include patterns exist, file must match at least one
        if (includePatterns.length > 0) {
            return includePatterns.some((pattern) => this.matchesPattern(relativePath, pattern))
        }

        // If only exclude patterns exist and file didn't match any, include it
        return true
    }

    /**
     * Check if a file should be processed based on Deno configuration include/exclude patterns
     * Returns false if the file is excluded, true if it should be processed
     */
    protected shouldProcessFile(documentUri: vscode.Uri): boolean {
        const configPath = this.findDenoConfig(documentUri)
        if (!configPath) {
            return true // If no config found, process the file
        }

        try {
            const config = this.parseDenoConfig(configPath)
            return this.matchesIncludeExclude(documentUri, config)
        } catch (error) {
            console.error(`Error checking Deno config: ${error}`)
            return true // If there's an error, proceed with processing
        }
    }

    /**
     * Check if a file path matches a glob pattern using minimatch
     */
    private matchesPattern(filePath: string, pattern: string): boolean {
        // Normalize paths for consistent comparison
        const normalizedFilePath = path.normalize(filePath)
        const normalizedPattern = path.normalize(pattern)

        try {
            if (pattern.includes("*")) {
                return minimatch(normalizedFilePath, normalizedPattern, {
                    dot: true, // Match files starting with .
                })
            } else {
                return contains(normalizedFilePath, normalizedPattern)
            }
        } catch {
            // If minimatch fails, fall back to simple string matching
            return normalizedFilePath.includes(normalizedPattern)
        }
    }

    public checkIfEnabled(config?: vscode.WorkspaceConfiguration): boolean {
        const configuration = config || vscode.workspace.getConfiguration("deno-tools")
        const enable = configuration.get<boolean | string[] | null>("enable")
        const toolName = this.getConfigurationSection()

        // If explicitly set, use that value
        if (enable !== undefined && enable !== null) {
            if (typeof enable === "boolean") {
                return enable
            }
            return Array.isArray(enable) && enable.includes(toolName)
        }

        // If not set, auto-detect based on config presence
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        return this.hasConfig(workspacePath)
    }

    private hasConfig(workspacePath?: string): boolean {
        if (!workspacePath) {
            // If no workspace, check if any open document has a config in its directory tree
            const activeEditor = vscode.window.activeTextEditor
            if (activeEditor && activeEditor.document.uri.scheme === "file") {
                return this.findConfigInPath(
                    vscode.Uri.file(activeEditor.document.uri.fsPath).fsPath
                        .split("/")
                        .slice(0, -1)
                        .join("/"),
                ) !== null
            }
            return false
        }

        return this.findConfigInPath(workspacePath) !== null
    }

    /**
     * Find configuration file (deno.json or deno.jsonc) for a document with caching
     * Returns the path to the config file or null if not found
     */
    protected findDenoConfig(documentUri: vscode.Uri): string | null {
        const cacheKey = documentUri.toString()

        // Check cache first
        const cached = this.sharedResources.getCachedConfigPath(cacheKey)
        if (cached !== undefined) {
            console.log(`⚡ CACHE: Using cached config path for ${documentUri.fsPath}`)
            return cached
        }

        const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri)
        let configPath: string | null = null

        if (workspaceFolder) {
            const currentDir = path.dirname(documentUri.fsPath)
            const workspaceRoot = workspaceFolder.uri.fsPath

            // First search in project hierarchy
            const projectConfig = this.searchConfigInDirectories(currentDir, workspaceRoot)
            if (projectConfig) {
                configPath = projectConfig
            }
        }

        // Fallback to home directory if not found in project
        if (!configPath) {
            const homeDir = os.homedir()
            configPath = this.findConfigInDirectory(homeDir)
        }

        // Cache the result (including null results to avoid repeated searches)
        this.sharedResources.setCachedConfigPath(cacheKey, configPath)
        console.log(
            `📁 CONFIG PATH: Found and cached ${configPath || "null"} for ${documentUri.fsPath}`,
        )

        return configPath
    }

    /**
     * Synchronous version for quick enable/disable checks
     */
    private findConfigInPath(startPath: string): string | null {
        let currentPath = startPath
        const configFiles = ["deno.json", "deno.jsonc"]

        // Search up the directory tree from the starting path
        while (currentPath !== path.dirname(currentPath)) {
            for (const configFile of configFiles) {
                const configPath = path.join(currentPath, configFile)
                if (fs.existsSync(configPath)) {
                    return configPath
                }
            }
            currentPath = path.dirname(currentPath)
        }

        // Fallback: check user's home directory
        const homeDir = os.homedir()
        for (const configFile of configFiles) {
            const configPath = path.join(homeDir, configFile)
            if (fs.existsSync(configPath)) {
                return configPath
            }
        }

        return null
    }

    /**
     * Search for config files in directories from startDir up to rootDir
     */
    private searchConfigInDirectories(
        startDir: string,
        rootDir: string,
    ): string | null {
        let currentDir = startDir

        while (currentDir.startsWith(rootDir)) {
            const configPath = this.findConfigInDirectory(currentDir)
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

    /**
     * Find config file in a specific directory
     */
    private findConfigInDirectory(directory: string): string | null {
        const configNames = ["deno.json", "deno.jsonc"]

        for (const configName of configNames) {
            const configPath = path.join(directory, configName)
            if (fs.existsSync(configPath)) {
                return configPath
            }
        }

        return null
    }

    /**
     * Get the appropriate file extension for commands based on the document
     * Maps VS Code document types to compatible file extensions
     */
    protected getExtension(document: vscode.TextDocument): string {
        // First try to extract extension from actual filename
        const fileExtension = document.fileName.split(".").pop()?.toLowerCase() || ""

        // If we have a direct file extension, use it
        if (fileExtension) {
            return fileExtension
        }

        // Otherwise map language ID to extension
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
            vue: "vue",
            svelte: "svelte",
            astro: "astro",
        }

        return languageMap[document.languageId] || "ts"
    }

    /**
     * Execute a command for the given document and input
     */
    protected executeCommand(
        document: vscode.TextDocument,
        options: CommandOptions = {},
    ): Promise<{ stdout: string; stderr: string }> {
        const input = document.getText()
        const args = options.args ?? this.getCommandArgs(document)
        const { cwd, cancellationToken, throwOnError = false } = options
        console.log("deno " + args.join(" "))
        const childProcess = spawn("deno", args, { cwd })

        return new Promise((resolve, reject) => {
            const stdoutChunks: Buffer[] = []
            const stderrChunks: Buffer[] = []

            childProcess.stdout?.on("data", (data) => {
                stdoutChunks.push(data)
            })

            childProcess.stderr?.on("data", (data) => {
                stderrChunks.push(data)
            })

            childProcess.on("error", (error) => {
                reject(error)
            })

            childProcess.on("close", (code) => {
                const stdout = Buffer.concat(stdoutChunks).toString()
                const stderr = Buffer.concat(stderrChunks).toString()

                if (throwOnError && code !== 0) {
                    reject(new Error(`Command exited with code ${code}: ${stderr}`))
                } else {
                    resolve({ stdout, stderr })
                }
            })

            // Handle cancellation if token provided (for formatter)
            if (cancellationToken) {
                cancellationToken.onCancellationRequested(() => {
                    childProcess.kill()
                    reject(new Error("Command cancelled"))
                })
            }

            // Send input to stdin
            if (childProcess.stdin) {
                childProcess.stdin.write(input)
                childProcess.stdin.end()
            }
        })
    }
}
