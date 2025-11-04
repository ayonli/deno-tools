import * as assert from "assert"
import * as vscode from "vscode"
import { JsxCurlyBracesFixProvider } from "../linter/fixes/jsx-curly-braces.ts"

suite("JsxCurlyBracesFixProvider Tests", () => {
    let provider: JsxCurlyBracesFixProvider

    beforeEach(() => {
        provider = new JsxCurlyBracesFixProvider()
    })

    suite("Rule Code Handling", () => {
        test("Should handle jsx-curly-braces diagnostics", () => {
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "Curly braces usage inconsistent",
            )
            assert.strictEqual(provider.canHandle(diagnostic), true)
        })

        test("Should not handle other diagnostics", () => {
            const diagnostic = createMockDiagnostic("no-unused-vars", "Variable is not used")
            assert.strictEqual(provider.canHandle(diagnostic), false)
        })
    })

    suite("Add Braces Fixes", () => {
        test("Should add braces around JSX element in attribute", () => {
            const document = createMockDocument([
                "const foo = <Foo bar=<div /> />;",
            ])

            // Diagnostic range covers <div />
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "JSX element should be wrapped in braces",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 28) // covers <div />

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Add curly braces around JSX expression")

            // Verify the edit adds braces
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "{<div />}")
        })

        test("Should handle complex JSX elements", () => {
            const document = createMockDocument([
                'const foo = <Foo component=<MyComponent prop="value" /> />;',
            ])

            // Diagnostic range covers the JSX element
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "JSX element should be wrapped in braces",
            )
            diagnostic.range = new vscode.Range(0, 27, 0, 50) // covers <MyComponent prop="value" />

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit adds braces around complex element
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, '{<MyComponent prop="value" />}')
        })
    })

    suite("Remove Braces Fixes", () => {
        test("Should remove braces around string literal in attribute", () => {
            const document = createMockDocument([
                'const foo = <Foo str={"hello"} />;',
            ])

            // Diagnostic range covers {"hello"}
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "Unnecessary braces around string",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 30) // covers {"hello"}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Remove unnecessary curly braces")

            // Verify the edit removes braces and quotes
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "hello")
        })

        test("Should remove braces around single quotes string", () => {
            const document = createMockDocument([
                "const foo = <Foo str={'hello'} />;",
            ])

            // Diagnostic range covers {'hello'}
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "Unnecessary braces around string",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 30) // covers {'hello'}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit removes braces and quotes
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "hello")
        })

        test("Should remove braces around template literal", () => {
            const document = createMockDocument([
                "const foo = <Foo str={`hello`} />;",
            ])

            // Diagnostic range covers {`hello`}
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "Unnecessary braces around string",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 30) // covers {`hello`}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit removes braces and backticks
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "hello")
        })

        test("Should remove braces around string in JSX content", () => {
            const document = createMockDocument([
                'const foo = <div>{"hello"}</div>;',
            ])

            // Diagnostic range covers {"hello"}
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "Unnecessary braces around string",
            )
            diagnostic.range = new vscode.Range(0, 17, 0, 26) // covers {"hello"}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit removes braces and quotes
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "hello")
        })
    })

    suite("Edge Cases", () => {
        test("Should handle whitespace around braces", () => {
            const document = createMockDocument([
                'const foo = <Foo str={ "hello" } />;',
            ])

            // Diagnostic range covers { "hello" }
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "Unnecessary braces around string",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 32) // covers { "hello" }

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should still work with whitespace
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "hello")
        })

        test("Should return no fixes for expressions that need braces", () => {
            const document = createMockDocument([
                "const foo = <Foo str={variable} />;",
            ])

            // Diagnostic range covers {variable} - this should NOT be fixed
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "Expression requires braces",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 31) // covers {variable}

            const fixes = provider.createFixes(diagnostic, document)

            // Should not create fixes for variables/expressions that need braces
            assert.strictEqual(fixes.length, 0)
        })

        test("Should return no fixes for non-JSX content", () => {
            const document = createMockDocument([
                'const str = "hello";',
            ])

            const diagnostic = createMockDiagnostic("jsx-curly-braces", "Something else")
            diagnostic.range = new vscode.Range(0, 12, 0, 19) // covers "hello"

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 0)
        })

        test("Should handle multi-line JSX", () => {
            const document = createMockDocument([
                "const foo = <Foo",
                "  component=<div>",
                "    content",
                "  </div>",
                "/>;",
            ])

            // Diagnostic range covers the JSX element across multiple lines
            const diagnostic = createMockDiagnostic(
                "jsx-curly-braces",
                "JSX element should be wrapped in braces",
            )
            diagnostic.range = new vscode.Range(1, 12, 3, 8) // covers <div>...</div>

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should add braces around multi-line JSX
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.ok(change.newText.startsWith("{<div>"))
            assert.ok(change.newText.endsWith("</div>}"))
        })
    })
})

// Helper functions for testing
function createMockDiagnostic(code: string, message: string): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
        new vscode.Range(0, 0, 0, 10),
        message,
        vscode.DiagnosticSeverity.Warning,
    )
    diagnostic.code = code
    return diagnostic
}

function createMockDocument(lines: string[]): vscode.TextDocument {
    const content = lines.join("\n")
    return {
        uri: vscode.Uri.file("/test.tsx"),
        fileName: "/test.tsx",
        languageId: "typescriptreact",
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

            // Multi-line selection
            const selectedLines = lines.slice(startLine, endLine + 1)
            if (selectedLines.length === 0) { return "" }

            selectedLines[0] = selectedLines[0].substring(startChar)
            selectedLines[selectedLines.length - 1] = selectedLines[selectedLines.length - 1]
                .substring(0, endChar)

            return selectedLines.join("\n")
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
