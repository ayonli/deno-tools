import * as assert from "assert"
import * as vscode from "vscode"
import { JsxNoUselessFragmentFixProvider } from "../linter/fixes/jsx-no-useless-fragment.ts"

suite("JsxNoUselessFragmentFixProvider Tests", () => {
    let provider: JsxNoUselessFragmentFixProvider

    beforeEach(() => {
        provider = new JsxNoUselessFragmentFixProvider()
    })

    suite("Rule Code Handling", () => {
        test("Should handle jsx-no-useless-fragment diagnostics", () => {
            const diagnostic = createMockDiagnostic("jsx-no-useless-fragment", "Useless fragment")
            assert.strictEqual(provider.canHandle(diagnostic), true)
        })

        test("Should not handle other diagnostics", () => {
            const diagnostic = createMockDiagnostic("no-unused-vars", "Variable is not used")
            assert.strictEqual(provider.canHandle(diagnostic), false)
        })
    })

    suite("Empty Fragment Fixes", () => {
        test("Should remove empty fragment", () => {
            const document = createMockDocument([
                "const foo = <></>;",
            ])

            // Diagnostic range covers <></>
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Empty fragment is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 17) // covers <></>

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Remove useless fragment")

            // Verify the edit removes the fragment entirely
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "")
        })

        test("Should remove empty fragment with whitespace", () => {
            const document = createMockDocument([
                "const foo = <> </>;",
            ])

            // Diagnostic range covers <> </>
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Empty fragment is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 18) // covers <> </>

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should remove entirely since content is just whitespace
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "")
        })
    })

    suite("Single Child Fragment Fixes", () => {
        test("Should remove fragment around single JSX element", () => {
            const document = createMockDocument([
                "const foo = <><div /></>;",
            ])

            // Diagnostic range covers <><div /></>
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Fragment with single child is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 24) // covers <><div /></>

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should replace with just the div
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "<div />")
        })

        test("Should remove fragment around single component", () => {
            const document = createMockDocument([
                "const foo = <><App /></>;",
            ])

            // Diagnostic range covers <><App /></>
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Fragment with single child is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 24) // covers <><App /></>

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should replace with just the component
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "<App />")
        })

        test("Should handle fragment with single text content", () => {
            const document = createMockDocument([
                "const foo = <>text</>;",
            ])

            // Diagnostic range covers <>text</>
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Fragment with single child is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 21) // covers <>text</>

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should replace with just the text
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "text")
        })
    })

    suite("Fragment in JSX Content", () => {
        test("Should remove useless fragment in JSX content", () => {
            const document = createMockDocument([
                "<p>foo <>bar</> baz</p>",
            ])

            // Diagnostic range covers <>bar</>
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Useless fragment in JSX content",
            )
            diagnostic.range = new vscode.Range(0, 6, 0, 14) // covers <>bar</>

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should replace with just the content
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "bar")
        })
    })

    suite("Long-form Fragment Fixes", () => {
        test("Should remove React.Fragment with single child", () => {
            const document = createMockDocument([
                "const foo = <React.Fragment><div /></React.Fragment>;",
            ])

            // Diagnostic range covers the entire React.Fragment
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Fragment with single child is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 52) // covers entire fragment

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should replace with just the div
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "<div />")
        })

        test("Should remove Fragment with single child", () => {
            const document = createMockDocument([
                "const foo = <Fragment><App /></Fragment>;",
            ])

            // Diagnostic range covers the entire Fragment
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Fragment with single child is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 40) // covers entire fragment

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should replace with just the component
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "<App />")
        })

        test("Should remove empty React.Fragment", () => {
            const document = createMockDocument([
                "const foo = <React.Fragment></React.Fragment>;",
            ])

            // Diagnostic range covers the entire empty React.Fragment
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Empty fragment is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 46) // covers entire fragment

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should remove entirely
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "")
        })
    })

    suite("Multi-line Fragment Fixes", () => {
        test("Should handle multi-line fragment with single child", () => {
            const document = createMockDocument([
                "const foo = <>",
                "  <div />",
                "</>;",
            ])

            // Diagnostic range covers the entire multi-line fragment
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Fragment with single child is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 2, 3) // covers entire fragment

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should replace with just the div (preserving whitespace)
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText.trim(), "<div />")
        })
    })

    suite("Edge Cases", () => {
        test("Should return no fixes for invalid fragment syntax", () => {
            const document = createMockDocument([
                "const foo = <> unclosed fragment",
            ])

            const diagnostic = createMockDiagnostic("jsx-no-useless-fragment", "Invalid fragment")
            diagnostic.range = new vscode.Range(0, 12, 0, 32)

            const fixes = provider.createFixes(diagnostic, document)

            // Should not create fixes for malformed fragments
            assert.strictEqual(fixes.length, 0)
        })

        test("Should handle fragment with attributes (React.Fragment)", () => {
            const document = createMockDocument([
                'const foo = <React.Fragment key="test"><div /></React.Fragment>;',
            ])

            // Diagnostic range covers the entire fragment
            const diagnostic = createMockDiagnostic(
                "jsx-no-useless-fragment",
                "Fragment with single child is useless",
            )
            diagnostic.range = new vscode.Range(0, 12, 0, 64) // covers entire fragment

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should still extract the content
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "<div />")
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
