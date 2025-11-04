import * as assert from "assert"
import * as vscode from "vscode"
import { NoDebuggerFixProvider } from "../linter/fixes/no-debugger.ts"

suite("NoDebuggerFixProvider Tests", () => {
    let provider: NoDebuggerFixProvider

    beforeEach(() => {
        provider = new NoDebuggerFixProvider()
    })

    suite("Rule Code Handling", () => {
        test("Should handle no-debugger diagnostics", () => {
            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            assert.strictEqual(provider.canHandle(diagnostic), true)
        })

        test("Should not handle other diagnostics", () => {
            const diagnostic = createMockDiagnostic("no-unused-vars", "Variable is not used")
            assert.strictEqual(provider.canHandle(diagnostic), false)
        })
    })

    suite("Debugger Statement Removal", () => {
        test("Should remove standalone debugger statement with semicolon", () => {
            const document = createMockDocument([
                "function test() {",
                "    debugger;",
                '    console.log("after");',
                "}",
            ])

            // Diagnostic range covers debugger;
            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(1, 4, 1, 13) // covers debugger;

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Remove debugger statement")

            // Verify the edit removes the entire line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.end.line, 2) // Should include newline
            assert.strictEqual(change.newText, "")
        })

        test("Should remove standalone debugger statement without semicolon", () => {
            const document = createMockDocument([
                "function test() {",
                "    debugger",
                '    console.log("after");',
                "}",
            ])

            // Diagnostic range covers debugger
            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(1, 4, 1, 12) // covers debugger

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit removes the entire line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.end.line, 2) // Should include newline
        })

        test("Should remove debugger from same line as other code", () => {
            const document = createMockDocument([
                "function test() {",
                "    const x = 1; debugger; console.log(x);",
                "}",
            ])

            // Diagnostic range covers debugger;
            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(1, 17, 1, 26) // covers debugger;

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should only remove the debugger statement, not the whole line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            // Should remove debugger; and trailing space
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.start.character, 17) // start of debugger
            assert.strictEqual(change.range.end.character, 27) // end of debugger; + space
        })

        test("Should handle debugger at beginning of line with other code", () => {
            const document = createMockDocument([
                "function test() {",
                '    debugger; console.log("test");',
                "}",
            ])

            // Diagnostic range covers debugger;
            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(1, 4, 1, 13) // covers debugger;

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should only remove debugger; and trailing space
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.character, 4) // start of debugger
            assert.strictEqual(change.range.end.character, 14) // end of debugger; + space
        })

        test("Should handle debugger with different indentation", () => {
            const document = createMockDocument([
                "if (condition) {",
                "        debugger;",
                "    }",
            ])

            // Diagnostic range covers debugger;
            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(1, 8, 1, 17) // covers debugger;

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should remove the entire line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.end.line, 2) // Should include newline
        })

        test("Should handle debugger in arrow function", () => {
            const document = createMockDocument([
                "const fn = () => {",
                "  debugger",
                "  return 42",
                "}",
            ])

            // Diagnostic range covers debugger
            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(1, 2, 1, 10) // covers debugger

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should remove the entire line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.end.line, 2)
        })

        test("Should handle multiple debugger statements", () => {
            const document = createMockDocument([
                "function test() {",
                "    debugger;",
                "    const x = 1;",
                "    debugger;",
                "    return x;",
                "}",
            ])

            // Test first debugger
            const diagnostic1 = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic1.range = new vscode.Range(1, 4, 1, 13) // first debugger;

            const fixes1 = provider.createFixes(diagnostic1, document)
            assert.strictEqual(fixes1.length, 1)

            // Test second debugger
            const diagnostic2 = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic2.range = new vscode.Range(3, 4, 3, 13) // second debugger;

            const fixes2 = provider.createFixes(diagnostic2, document)
            assert.strictEqual(fixes2.length, 1)
        })
    })

    suite("Edge Cases", () => {
        test("Should handle debugger as only content in file", () => {
            const document = createMockDocument([
                "debugger;",
            ])

            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(0, 0, 0, 9) // covers debugger;

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should remove the entire line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)
        })

        test("Should handle debugger with comments on same line", () => {
            const document = createMockDocument([
                "function test() {",
                "    debugger; // TODO: remove this",
                "    return 42;",
                "}",
            ])

            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(1, 4, 1, 13) // covers debugger;

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should only remove debugger; part, not the comment
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.character, 4) // start of debugger
            // Should remove debugger; and trailing space before comment
            assert.ok(change.range.end.character > 13) // should include space after semicolon
        })

        test("Should fallback to diagnostic range if debugger not found in line", () => {
            const document = createMockDocument([
                "function test() {",
                "    // some other code here",
                "}",
            ])

            // Simulate a diagnostic with wrong range (edge case)
            const diagnostic = createMockDiagnostic(
                "no-debugger",
                "Debugger statement should not be used",
            )
            diagnostic.range = new vscode.Range(1, 4, 1, 10) // some random range

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should use diagnostic range as fallback
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.start.character, 4)
            assert.strictEqual(change.range.end.character, 10)
        })
    })
})

// Helper functions for testing
function createMockDiagnostic(code: string, message: string): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 10),
        message,
        vscode.DiagnosticSeverity.Error,
    )
    diagnostic.code = code
    return diagnostic
}

function createMockDocument(lines: string[]): vscode.TextDocument {
    const content = lines.join("\n")
    return {
        uri: vscode.Uri.file("/test.ts"),
        fileName: "/test.ts",
        languageId: "typescript",
        lineCount: lines.length,
        getText: (range?: vscode.Range) => {
            if (!range) { return content }
            const startLine = range.start.line
            const endLine = range.end.line
            const startChar = range.start.character
            const endChar = range.end.character

            if (startLine === endLine) {
                return lines[startLine]?.substring(startChar, endChar) || ""
            }

            return content
        },
        lineAt: (line: number) => ({
            text: lines[line] || "",
            range: new vscode.Range(line, 0, line, lines[line]?.length || 0),
            rangeIncludingLineBreak: new vscode.Range(line, 0, line + 1, 0),
            firstNonWhitespaceCharacterIndex: lines[line]?.search(/\S/) || 0,
            isEmptyOrWhitespace: !lines[line] || lines[line].trim() === "",
        }),
    } as vscode.TextDocument
}
