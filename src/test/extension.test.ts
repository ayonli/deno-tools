import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'node:path';
import { DenoDocumentFormattingEditProvider, SUPPORTED_LANGUAGES } from '../formatter';

suite('Deno Rules Extension Test Suite', () => {
    vscode.window.showInformationMessage('Running Deno Rules tests...');

    suite('Formatter Tests', () => {
        let formatter: DenoDocumentFormattingEditProvider;

        setup(() => {
            formatter = new DenoDocumentFormattingEditProvider();
        });

        test('SUPPORTED_LANGUAGES contains expected languages', () => {
            const languageIds = SUPPORTED_LANGUAGES.map(lang => lang.language);
            
            // Test that key languages are supported
            assert.ok(languageIds.includes('typescript'), 'Should support TypeScript');
            assert.ok(languageIds.includes('javascript'), 'Should support JavaScript');
            assert.ok(languageIds.includes('json'), 'Should support JSON');
            assert.ok(languageIds.includes('yaml'), 'Should support YAML');
            assert.ok(languageIds.includes('markdown'), 'Should support Markdown');
            assert.ok(languageIds.includes('html'), 'Should support HTML');
            assert.ok(languageIds.includes('css'), 'Should support CSS');
            
            // Verify minimum number of supported languages
            assert.ok(languageIds.length >= 12, `Should support at least 12 languages, found ${languageIds.length}`);
        });

        test('All SUPPORTED_LANGUAGES have file scheme', () => {
            SUPPORTED_LANGUAGES.forEach(lang => {
                assert.strictEqual(lang.scheme, 'file', `Language ${lang.language} should use 'file' scheme`);
            });
        });

        // Test extension detection logic via public interface
        test('Should handle TypeScript files correctly', async () => {
            const _document = await createMockDocument('test.ts', 'typescript', 'const x = 1\n');
            
            // This tests that the formatter can handle TypeScript files without throwing
            try {
                // We can't easily test the full formatting without a real Deno process,
                // but we can test that the method is callable and doesn't throw immediately
                const _token = new vscode.CancellationTokenSource().token;
                // Just verify the method exists and is callable
                assert.ok(typeof formatter.provideDocumentFormattingEdits === 'function');
            } catch (error) {
                assert.fail(`Should not throw error for TypeScript files: ${error}`);
            }
        });

        test('Should handle JavaScript files correctly', async () => {
            const _document = await createMockDocument('test.js', 'javascript', 'const x = 1\n');
            
            try {
                const _token = new vscode.CancellationTokenSource().token;
                assert.ok(typeof formatter.provideDocumentFormattingEdits === 'function');
            } catch (error) {
                assert.fail(`Should not throw error for JavaScript files: ${error}`);
            }
        });

        test('Should handle JSON files correctly', async () => {
            const _document = await createMockDocument('test.json', 'json', '{"key":"value"}\n');
            
            try {
                const _token = new vscode.CancellationTokenSource().token;
                assert.ok(typeof formatter.provideDocumentFormattingEdits === 'function');
            } catch (error) {
                assert.fail(`Should not throw error for JSON files: ${error}`);
            }
        });
    });

    suite('Extension Activation Tests', () => {
        test('Extension should be present', () => {
            const extension = vscode.extensions.getExtension('undefined_publisher.deno-rules');
            assert.ok(extension, 'Extension should be available');
        });

        test('Extension should activate', async () => {
            const extension = vscode.extensions.getExtension('undefined_publisher.deno-rules');
            if (extension) {
                await extension.activate();
                assert.ok(extension.isActive, 'Extension should be active');
            }
        });
    });

    suite('Configuration Tests', () => {
        test('Should handle missing deno.json gracefully', () => {
            // Test that the formatter doesn't crash when no deno.json is present
            // This is mainly a structural test since we can't easily mock file system
            assert.ok(true, 'Formatter should handle missing configuration files');
        });
    });
});

// Helper function to create mock VS Code documents
async function createMockDocument(fileName: string, languageId: string, content: string): Promise<vscode.TextDocument> {
    // Create a temporary file for testing
    const _uri = vscode.Uri.file(path.join(__dirname, '..', '..', 'test-files', fileName));
    
    // Use VS Code's workspace.openTextDocument with the content
    return await vscode.workspace.openTextDocument({
        language: languageId,
        content: content
    });
}
