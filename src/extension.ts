// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DenoDocumentFormattingEditProvider, SUPPORTED_LANGUAGES } from './formatter';
import { DenoLintingProvider, DenoCodeActionProvider, LINTING_SUPPORTED_LANGUAGES } from './linter';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('🚀 DENO RULES EXTENSION: Starting activation...');
  vscode.window.showInformationMessage('🦕 Deno Rules extension is activating...');

  // Register the document formatting provider for supported languages
  const formattingProvider = vscode.languages.registerDocumentFormattingEditProvider(
    SUPPORTED_LANGUAGES,
    new DenoDocumentFormattingEditProvider(),
  );

  // Initialize Deno linting provider
  const lintingProvider = new DenoLintingProvider();
  
  // Register code action provider for lint fixes
  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    LINTING_SUPPORTED_LANGUAGES,
    new DenoCodeActionProvider(),
    {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix]
    }
  );

  // Get configuration for debounce timing
  const config = vscode.workspace.getConfiguration('denoRules');
  const debounceMs = config.get<number>('linting.debounceMs', 500);

  // Set up document change listeners for real-time linting
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    // Only process actual files, not output channels or internal VS Code documents
    if (event.document.uri.scheme === 'file' && 
        !event.document.fileName.includes('extension-output') &&
        !event.document.fileName.includes('#') &&
        event.document.languageId !== 'Log' &&
        event.document.languageId !== 'log') {
      console.log(`📝 EXTENSION: Document changed: ${event.document.fileName} (${event.document.languageId})`);
      if (event.document && config.get<boolean>('linting.enabled', true)) {
        // Debounce linting to avoid excessive calls
        setTimeout(() => {
          lintingProvider.lintDocument(event.document);
        }, debounceMs);
      }
    }
  });

  // Lint document when opened
  const documentOpenListener = vscode.workspace.onDidOpenTextDocument((document) => {
    // Only process actual files, not output channels or internal VS Code documents
    if (document.uri.scheme === 'file' && 
        !document.fileName.includes('extension-output') &&
        !document.fileName.includes('#') &&
        document.languageId !== 'Log' &&
        document.languageId !== 'log') {
      console.log(`📂 EXTENSION: Document opened: ${document.fileName} (${document.languageId})`);
      lintingProvider.lintDocument(document);
    }
  });

  // Lint document when saved
  const documentSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
    if (config.get<boolean>('linting.enabled', true)) {
      lintingProvider.lintDocument(document);
    }
  });

  // Register commands
  const toggleLintingCommand = vscode.commands.registerCommand('denoRules.toggleLinting', () => {
    const currentConfig = vscode.workspace.getConfiguration('denoRules');
    const currentEnabled = currentConfig.get<boolean>('linting.enabled', true);
    
    currentConfig.update('linting.enabled', !currentEnabled, vscode.ConfigurationTarget.Workspace);
    
    if (!currentEnabled) {
      lintingProvider.enable();
      vscode.window.showInformationMessage('Deno linting enabled');
      // Lint all open documents
      vscode.workspace.textDocuments.forEach(document => {
        lintingProvider.lintDocument(document);
      });
    } else {
      lintingProvider.disable();
      vscode.window.showInformationMessage('Deno linting disabled');
    }
  });

  const lintCurrentFileCommand = vscode.commands.registerCommand('denoRules.lintCurrentFile', () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      console.log(`🎯 EXTENSION: Manual lint command for ${activeEditor.document.fileName} (${activeEditor.document.languageId})`);
      lintingProvider.lintDocument(activeEditor.document);
      vscode.window.showInformationMessage('Linting current file with Deno...');
    } else {
      vscode.window.showWarningMessage('No active file to lint');
    }
  });

  // Listen for configuration changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('denoRules.linting.enabled')) {
      const newConfig = vscode.workspace.getConfiguration('denoRules');
      const isEnabled = newConfig.get<boolean>('linting.enabled', true);
      
      if (isEnabled) {
        lintingProvider.enable();
        // Re-lint all open documents
        vscode.workspace.textDocuments.forEach(document => {
          lintingProvider.lintDocument(document);
        });
      } else {
        lintingProvider.disable();
      }
    }
  });

  // Register all providers and listeners
  context.subscriptions.push(
    formattingProvider,
    lintingProvider,
    codeActionProvider,
    documentChangeListener,
    documentOpenListener,
    documentSaveListener,
    toggleLintingCommand,
    lintCurrentFileCommand,
    configChangeListener
  );

  // Lint all currently open documents if linting is enabled
  console.log(`📋 EXTENSION: Found ${vscode.workspace.textDocuments.length} open documents`);
  if (config.get<boolean>('linting.enabled', true)) {
    vscode.workspace.textDocuments.forEach(document => {
      // Only lint actual files
      if (document.uri.scheme === 'file' && 
          !document.fileName.includes('extension-output') &&
          !document.fileName.includes('#') &&
          document.languageId !== 'Log' &&
          document.languageId !== 'log') {
        console.log(`🔄 EXTENSION: Linting existing document: ${document.fileName} (${document.languageId})`);
        lintingProvider.lintDocument(document);
      }
    });
  }

  console.log('✅ DENO RULES EXTENSION: Successfully activated with formatting and linting!');
  vscode.window.showInformationMessage('✅ Deno Rules extension activated! Linting: ' + (config.get<boolean>('linting.enabled', true) ? 'enabled' : 'disabled'));
}

// This method is called when your extension is deactivated
export function deactivate() {}
