import * as vscode from 'vscode';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';
import process from 'node:process';

// Supported languages for Deno linting
// Deno lint supports TypeScript and JavaScript files
export const LINTING_SUPPORTED_LANGUAGES = [
    // TypeScript variants (.ts files)
    { scheme: 'file', language: 'typescript' },
    // TypeScript React (.tsx files)  
    { scheme: 'file', language: 'typescriptreact' },
    // JavaScript variants (.js files)
    { scheme: 'file', language: 'javascript' },
    // JavaScript React (.jsx files)
    { scheme: 'file', language: 'javascriptreact' },
    // Sometimes VS Code uses these alternative IDs
    { scheme: 'file', language: 'ts' },
    { scheme: 'file', language: 'tsx' },
    { scheme: 'file', language: 'js' },
    { scheme: 'file', language: 'jsx' },
] as const;

interface DenoLintMessage {
    range: {
        start: { line: number; col: number };
        end: { line: number; col: number };
    };
    filename: string;
    message: string;
    code: string;
    hint?: string;
    docs?: string;
}

export class DenoLintingProvider {
    private diagnosticsCollection: vscode.DiagnosticCollection;
    private outputChannel: vscode.OutputChannel;
    private lintingEnabled: boolean = true;

    constructor() {
        this.diagnosticsCollection = vscode.languages.createDiagnosticCollection('deno-rules-linter');
        this.outputChannel = vscode.window.createOutputChannel('Deno Rules');
    }

    public enable(): void {
        this.lintingEnabled = true;
    }

    public disable(): void {
        this.lintingEnabled = false;
        this.diagnosticsCollection.clear();
    }

    public dispose(): void {
        this.diagnosticsCollection.dispose();
        this.outputChannel.dispose();
    }

    public async lintDocument(document: vscode.TextDocument): Promise<void> {
        // Skip non-file documents (output channels, terminals, etc.)
        if (document.uri.scheme !== 'file') {
            return;
        }
        
        // Skip VS Code internal files and output channels
        if (document.fileName.includes('extension-output') || 
            document.fileName.includes('vscode-') ||
            document.languageId === 'Log' ||
            document.languageId === 'log' ||
            document.fileName.includes('#')) {
            return;
        }
        
        const fileExt = document.fileName.split('.').pop() || 'unknown';
        const logMessage = `🔍 Checking document ${document.fileName} (.${fileExt}, language: ${document.languageId})`;
        console.log(`DENO LINTER: ${logMessage}`);
        this.outputChannel.appendLine(logMessage);
        
        if (!this.lintingEnabled) {
            const message = '⏭️ Linting disabled, skipping';
            console.log(`DENO LINTER: ${message}`);
            this.outputChannel.appendLine(message);
            return;
        }
        
        if (!this.isLintingSupported(document)) {
            const message = `⏭️ Language ${document.languageId} not supported, skipping`;
            console.log(`DENO LINTER: ${message}`);
            this.outputChannel.appendLine(message);
            return;
        }

        try {
            const message1 = '🦕 Running Deno lint...';
            console.log(`DENO LINTER: ${message1}`);
            this.outputChannel.appendLine(message1);
            
            const diagnostics = await this.runDenoLint(document);
            
            const message2 = `� Found ${diagnostics.length} diagnostics`;
            console.log(`DENO LINTER: ${message2}`);
            this.outputChannel.appendLine(message2);
            
            this.outputChannel.appendLine(`🎯 Setting diagnostics for URI: ${document.uri.toString()}`);
            this.diagnosticsCollection.set(document.uri, diagnostics);
            this.outputChannel.appendLine(`📝 Diagnostics collection now has ${diagnostics.length} items for this document`);
            
            // Verify the diagnostics were set
            const setDiagnostics = this.diagnosticsCollection.get(document.uri);
            this.outputChannel.appendLine(`🔍 Verification: Retrieved ${setDiagnostics ? setDiagnostics.length : 0} diagnostics from collection`);
            
            if (diagnostics.length > 0) {
                const message3 = `✅ Set ${diagnostics.length} diagnostics for ${document.fileName}`;
                this.outputChannel.appendLine(message3);
                vscode.window.showInformationMessage(`Deno lint found ${diagnostics.length} issues in ${document.fileName}`);
                this.outputChannel.show(); // Show the output channel when there are issues
            }
        } catch (error) {
            const errorMessage = `❌ ERROR: ${error}`;
            console.error(`DENO LINTER: ${errorMessage}`);
            this.outputChannel.appendLine(errorMessage);
            this.outputChannel.show();
            vscode.window.showErrorMessage(`Deno linting failed: ${error}`);
            // Clear diagnostics on error to avoid stale results
            this.diagnosticsCollection.clear();
        }
    }

    private isLintingSupported(document: vscode.TextDocument): boolean {
        const supported = LINTING_SUPPORTED_LANGUAGES.some(
            (lang) => lang.language === document.languageId
        );
        
        const fileExt = document.fileName.split('.').pop() || 'unknown';
        this.outputChannel.appendLine(`🔤 Language Detection:`);
        this.outputChannel.appendLine(`   File: ${document.fileName}`);
        this.outputChannel.appendLine(`   Extension: .${fileExt}`);
        this.outputChannel.appendLine(`   Detected Language ID: "${document.languageId}"`);
        this.outputChannel.appendLine(`   Expected for .${fileExt}: ${this.getExpectedLanguageForExtension(fileExt)}`);
        this.outputChannel.appendLine(`   Supported Languages: ${LINTING_SUPPORTED_LANGUAGES.map(l => `"${l.language}"`).join(', ')}`);
        this.outputChannel.appendLine(`   Is Supported: ${supported}`);
        
        return supported;
    }

    private getExpectedLanguageForExtension(ext: string): string {
        const mapping = {
            'ts': 'typescript',
            'tsx': 'typescriptreact', 
            'js': 'javascript',
            'jsx': 'javascriptreact'
        };
        return mapping[ext as keyof typeof mapping] || 'unknown';
    }

    private async runDenoLint(document: vscode.TextDocument): Promise<vscode.Diagnostic[]> {
        const text = document.getText();
        this.outputChannel.appendLine(`📄 Document content (${text.length} chars):`);
        this.outputChannel.appendLine(`   First 200 chars: ${text.substring(0, 200).replace(/\n/g, '\\n')}`);
        
        const args = await this.buildDenoLintArgs(document);
        this.outputChannel.appendLine(`🔧 Deno args: ${args.join(' ')}`);

        // Get the workspace folder for proper working directory
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();
        
        this.outputChannel.appendLine(`📁 Working directory: ${cwd}`);
        
        const denoProcess = spawn('deno', args, { cwd });
        const { stdout, stderr } = await this.executeProcess(denoProcess, text);

        this.outputChannel.appendLine(`🦕 Deno process completed:`);
        this.outputChannel.appendLine(`   stdout length: ${stdout.length}`);
        this.outputChannel.appendLine(`   stderr length: ${stderr.length}`);
        if (stderr) {
            this.outputChannel.appendLine(`   stderr content: ${stderr}`);
        }
        if (stdout) {
            this.outputChannel.appendLine(`   stdout preview: ${stdout.substring(0, 300)}`);
        }

        if (stderr && !stdout) {
            // If there's only stderr and no stdout, it's likely an error
            throw new Error(`Deno lint error: ${stderr}`);
        }

        return this.parseLintOutput(stdout, document);
    }

    private async buildDenoLintArgs(document: vscode.TextDocument): Promise<string[]> {
        const args = ['lint', '--json'];

        // Look for deno.json configuration
        const configPath = await this.findDenoConfig(document.uri);
        if (configPath) {
            args.push('--config', configPath);
        }

        args.push('-'); // Read from stdin

        return args;
    }

    private async findDenoConfig(documentUri: vscode.Uri): Promise<string | null> {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
        if (!workspaceFolder) {
            return null;
        }

        const currentDir = path.dirname(documentUri.fsPath);
        const workspaceRoot = workspaceFolder.uri.fsPath;

        return await this.searchConfigInDirectories(currentDir, workspaceRoot);
    }

    private async searchConfigInDirectories(startDir: string, rootDir: string): Promise<string | null> {
        let currentDir = startDir;

        while (currentDir.startsWith(rootDir)) {
            const configPath = await this.findConfigInDirectory(currentDir);
            if (configPath) {
                return configPath;
            }

            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                break; // Reached filesystem root
            }
            currentDir = parentDir;
        }

        return null;
    }

    private async findConfigInDirectory(directory: string): Promise<string | null> {
        const configNames = ['deno.json', 'deno.jsonc'];

        for (const configName of configNames) {
            const configPath = path.join(directory, configName);
            if (await this.fileExists(configPath)) {
                return configPath;
            }
        }

        return null;
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    private executeProcess(
        process: ReturnType<typeof spawn>,
        input: string
    ): Promise<{ stdout: string; stderr: string }> {
        let stdout = '';
        let stderr = '';

        process.stdout?.on('data', (data: Buffer) => {
            stdout += data.toString();
        });

        process.stderr?.on('data', (data: Buffer) => {
            stderr += data.toString();
        });

        process.stdin?.write(input);
        process.stdin?.end();

        return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
            process.on('close', (code: number) => {
                if (code !== 0 && !stdout) {
                    // Only reject if there's an error AND no JSON output
                    reject(new Error(`Deno lint exited with code ${code}: ${stderr}`));
                } else {
                    resolve({ stdout, stderr });
                }
            });

            process.on('error', reject);
        });
    }

    private parseLintOutput(output: string, document: vscode.TextDocument): vscode.Diagnostic[] {
        if (!output.trim()) {
            return []; // No lint issues
        }

        try {
            const lintResult = JSON.parse(output);
            const diagnostics = lintResult.diagnostics || [];
            return diagnostics.map((msg: DenoLintMessage) => this.convertToDiagnostic(msg, document));
        } catch (error) {
            console.error('Failed to parse Deno lint JSON output:', error);
            console.error('Raw output:', output);
            return [];
        }
    }

    private convertToDiagnostic(msg: DenoLintMessage, document: vscode.TextDocument): vscode.Diagnostic {
        // Log the raw message for debugging
        this.outputChannel.appendLine(`🔧 Converting diagnostic: ${msg.code} - ${msg.message}`);
        this.outputChannel.appendLine(`   Range: (${msg.range.start.line}, ${msg.range.start.col}) to (${msg.range.end.line}, ${msg.range.end.col})`);
        
        // Convert 0-based Deno positions to VS Code positions
        const startPos = new vscode.Position(
            Math.max(0, msg.range.start.line),
            Math.max(0, msg.range.start.col)
        );
        const endPos = new vscode.Position(
            Math.max(0, msg.range.end.line),
            Math.max(0, msg.range.end.col)
        );

        const range = new vscode.Range(startPos, endPos);
        this.outputChannel.appendLine(`   VS Code Range: (${startPos.line}, ${startPos.character}) to (${endPos.line}, ${endPos.character})`);
        
        const diagnostic = new vscode.Diagnostic(
            range,
            msg.message,
            this.getSeverity(msg.code)
        );

        diagnostic.code = msg.code;
        diagnostic.source = 'Deno Rules';

        // Add additional information
        if (msg.hint) {
            diagnostic.relatedInformation = [
                new vscode.DiagnosticRelatedInformation(
                    new vscode.Location(document.uri, range),
                    `Hint: ${msg.hint}`
                )
            ];
        }

        this.outputChannel.appendLine(`✅ Created diagnostic: ${diagnostic.source} - ${diagnostic.message} (severity: ${diagnostic.severity})`);
        
        return diagnostic;
    }

    private getSeverity(code: string): vscode.DiagnosticSeverity {
        // Most Deno lint rules are errors, but some could be warnings
        // You can customize this based on specific rule codes
        const warningRules = [
            'no-unused-vars',
            'prefer-const',
            'no-explicit-any'
        ];

        return warningRules.includes(code) 
            ? vscode.DiagnosticSeverity.Warning 
            : vscode.DiagnosticSeverity.Error;
    }
}

// Code Action Provider for Deno lint fixes
export class DenoCodeActionProvider implements vscode.CodeActionProvider {
    public provideCodeActions(
        document: vscode.TextDocument,
        _range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.CodeAction[] {
        const actions: vscode.CodeAction[] = [];

        // Process diagnostics from Deno Rules
        const denoLintDiagnostics = context.diagnostics.filter(
            diag => diag.source === 'Deno Rules'
        );

        for (const diagnostic of denoLintDiagnostics) {
            const codeAction = this.createCodeActionForDiagnostic(diagnostic, document);
            if (codeAction) {
                actions.push(codeAction);
            }
        }

        return actions;
    }

    private createCodeActionForDiagnostic(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument
    ): vscode.CodeAction | null {
        const code = diagnostic.code as string;

        switch (code) {
            case 'no-unused-vars':
                return this.createUnusedVarsFix(diagnostic, document);
            case 'prefer-const':
                return this.createPreferConstFix(diagnostic, document);
            default:
                return this.createGenericFix(diagnostic, code);
        }
    }

    private createUnusedVarsFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Prefix with underscore to indicate intentional',
            vscode.CodeActionKind.QuickFix
        );

        const range = diagnostic.range;
        const text = document.getText(range);
        
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, range, `_${text}`);
        
        action.edit = edit;
        action.diagnostics = [diagnostic];

        return action;
    }

    private createPreferConstFix(
        diagnostic: vscode.Diagnostic,
        document: vscode.TextDocument
    ): vscode.CodeAction {
        const action = new vscode.CodeAction(
            'Change to const',
            vscode.CodeActionKind.QuickFix
        );

        const range = diagnostic.range;
        const lineText = document.lineAt(range.start.line).text;
        const letMatch = lineText.match(/(\s*)let(\s+)/);
        
        if (letMatch) {
            const fullRange = new vscode.Range(
                range.start.line,
                letMatch.index!,
                range.start.line,
                letMatch.index! + letMatch[0].length
            );
            
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, fullRange, `${letMatch[1]}const${letMatch[2]}`);
            
            action.edit = edit;
            action.diagnostics = [diagnostic];
        }

        return action;
    }

    private createGenericFix(diagnostic: vscode.Diagnostic, code: string): vscode.CodeAction {
        const action = new vscode.CodeAction(
            `View Deno lint documentation for ${code}`,
            vscode.CodeActionKind.QuickFix
        );

        const docsUrl = `https://docs.deno.com/lint/rules/${code}`;
        
        action.command = {
            command: 'vscode.open',
            title: 'Open Documentation',
            arguments: [vscode.Uri.parse(docsUrl)]
        };

        action.diagnostics = [diagnostic];

        return action;
    }
}
