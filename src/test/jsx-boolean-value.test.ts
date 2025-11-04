import * as assert from "assert"
import * as vscode from "vscode"
import { JsxBooleanValueFixProvider } from "../linter/fixes/jsx-boolean-value.ts"

suite("JsxBooleanValueFixProvider Tests", () => {
    let provider: JsxBooleanValueFixProvider

    beforeEach(() => {
        provider = new JsxBooleanValueFixProvider()
    })

    suite("Rule Code Handling", () => {
        test("Should handle jsx-boolean-value diagnostics", () => {
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            assert.strictEqual(provider.canHandle(diagnostic), true)
        })

        test("Should not handle other diagnostics", () => {
            const diagnostic = createMockDiagnostic("no-unused-vars", "Variable is not used")
            assert.strictEqual(provider.canHandle(diagnostic), false)
        })
    })

    suite("Fix Generation", () => {
        test("Should create fix to simplify boolean attribute with {true}", () => {
            const document = createMockDocument([
                "const foo = <Foo isFoo={true} />;",
            ])

            // Diagnostic range covers {true}
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 27) // covers {true}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Simplify JSX boolean attribute")

            // Verify the edit removes ={true}
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            // Should remove from = to end of {true}
            assert.strictEqual(change.range.start.character, 20) // position of =
            assert.strictEqual(change.range.end.character, 27) // end of {true}
            assert.strictEqual(change.newText, "")
        })

        test("Should handle attributes with spaces around equals", () => {
            const document = createMockDocument([
                "const foo = <Foo isFoo = {true} />;",
            ])

            // Diagnostic range covers {true}
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            diagnostic.range = new vscode.Range(0, 25, 0, 31) // covers {true}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit removes = {true} including spaces
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            // Should remove from = to end of {true}
            assert.strictEqual(change.range.start.character, 21) // position of =
            assert.strictEqual(change.range.end.character, 31) // end of {true}
        })

        test("Should handle multi-line JSX", () => {
            const document = createMockDocument([
                "const foo = <Foo",
                "  isFoo={true}",
                "/>;",
            ])

            // Diagnostic range covers {true} on second line
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            diagnostic.range = new vscode.Range(1, 8, 1, 14) // covers {true}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit removes ={true}
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            // Should remove from = to end of {true} on line 1
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.start.character, 7) // position of =
            assert.strictEqual(change.range.end.line, 1)
            assert.strictEqual(change.range.end.character, 14) // end of {true}
        })

        test("Should handle camelCase attribute names", () => {
            const document = createMockDocument([
                "const foo = <Foo isReallyFoo={true} />;",
            ])

            // Diagnostic range covers {true}
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            diagnostic.range = new vscode.Range(0, 29, 0, 35) // covers {true}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit works with camelCase
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.character, 28) // position of =
            assert.strictEqual(change.range.end.character, 35) // end of {true}
        })

        test("Should handle kebab-case attribute names", () => {
            const document = createMockDocument([
                "const foo = <Foo data-is-foo={true} />;",
            ])

            // Diagnostic range covers {true}
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            diagnostic.range = new vscode.Range(0, 29, 0, 35) // covers {true}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit works with kebab-case (note: this might not match our current regex)
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)
        })

        test("Should return no fixes if diagnostic range doesn't contain {true}", () => {
            const document = createMockDocument([
                "const foo = <Foo isFoo={false} />;",
            ])

            // Diagnostic range covers {false} instead of {true}
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 28) // covers {false}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 0)
        })

        test("Should return no fixes if no equals sign found", () => {
            const document = createMockDocument([
                "const foo = <Foo isFoo />;",
            ])

            // Invalid diagnostic range
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            diagnostic.range = new vscode.Range(0, 21, 0, 23)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 0)
        })

        test("Should handle complex JSX with multiple attributes", () => {
            const document = createMockDocument([
                'const foo = <Foo className="test" isFoo={true} disabled={false} />;',
            ])

            // Diagnostic range covers {true} for isFoo attribute
            const diagnostic = createMockDiagnostic(
                "jsx-boolean-value",
                "Boolean attribute should be simplified",
            )
            diagnostic.range = new vscode.Range(0, 41, 0, 47) // covers {true}

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify only the specific attribute is modified
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            // Should only remove ={true} from isFoo, leaving other attributes intact
            assert.strictEqual(change.range.start.character, 40) // position of = in isFoo
            assert.strictEqual(change.range.end.character, 47) // end of {true}
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

            // Multi-line selection (simplified for testing)
            return lines.slice(startLine, endLine + 1).join("\n")
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
