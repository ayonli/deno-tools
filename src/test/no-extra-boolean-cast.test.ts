import * as assert from "assert"
import * as vscode from "vscode"
import { NoExtraBooleanCastFixProvider } from "../linter/fixes/no-extra-boolean-cast.ts"

suite("NoExtraBooleanCastFixProvider Tests", () => {
    let provider: NoExtraBooleanCastFixProvider

    beforeEach(() => {
        provider = new NoExtraBooleanCastFixProvider()
    })

    suite("Rule Code Handling", () => {
        test("Should handle no-extra-boolean-cast diagnostics", () => {
            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant double negation",
            )
            assert.strictEqual(provider.canHandle(diagnostic), true)
        })

        test("Should not handle other diagnostics", () => {
            const diagnostic = createMockDiagnostic("no-unused-vars", "Variable is not used")
            assert.strictEqual(provider.canHandle(diagnostic), false)
        })
    })

    suite("Double Bang (!!) Removal", () => {
        test("Should remove !! from conditional", () => {
            const document = createMockDocument([
                "if (!!value) {",
                '    console.log("truthy");',
                "}",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant double negation",
            )
            diagnostic.range = new vscode.Range(0, 4, 0, 6) // !!

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Remove unnecessary boolean cast")

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 0)
            assert.strictEqual(change.range.start.character, 4) // start of !!
            assert.strictEqual(change.range.end.character, 6) // end of !!
            assert.strictEqual(change.newText, "")
        })

        test("Should remove !! with following whitespace", () => {
            const document = createMockDocument([
                "const result = !!   value;",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant double negation",
            )
            diagnostic.range = new vscode.Range(0, 15, 0, 17) // !!

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.character, 15) // start of !!
            assert.strictEqual(change.range.end.character, 20) // end of !! + spaces
        })

        test("Should remove !! in return statement", () => {
            const document = createMockDocument([
                "function test() {",
                "    return !!obj.property;",
                "}",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant double negation",
            )
            diagnostic.range = new vscode.Range(1, 11, 1, 13) // !!

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.start.character, 11)
            assert.strictEqual(change.range.end.character, 13)
        })

        test("Should remove !! in complex expression", () => {
            const document = createMockDocument([
                "const isValid = !!user && !!user.name;",
            ])

            // Test first !!
            const diagnostic1 = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant double negation",
            )
            diagnostic1.range = new vscode.Range(0, 16, 0, 18) // first !!

            const fixes1 = provider.createFixes(diagnostic1, document)
            assert.strictEqual(fixes1.length, 1)

            // Test second !!
            const diagnostic2 = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant double negation",
            )
            diagnostic2.range = new vscode.Range(0, 26, 0, 28) // second !!

            const fixes2 = provider.createFixes(diagnostic2, document)
            assert.strictEqual(fixes2.length, 1)
        })
    })

    suite("Boolean() Constructor Removal", () => {
        test("Should remove Boolean() wrapper from simple variable", () => {
            const document = createMockDocument([
                "if (Boolean(value)) {",
                '    console.log("truthy");',
                "}",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant Boolean constructor",
            )
            diagnostic.range = new vscode.Range(0, 4, 0, 18) // Boolean(value)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Remove unnecessary boolean cast")

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 0)
            assert.strictEqual(change.range.start.character, 4) // start of Boolean
            assert.strictEqual(change.range.end.character, 18) // end of Boolean(value)
            assert.strictEqual(change.newText, "value")
        })

        test("Should remove Boolean() with whitespace", () => {
            const document = createMockDocument([
                "const result = Boolean( value );",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant Boolean constructor",
            )
            diagnostic.range = new vscode.Range(0, 15, 0, 32) // Boolean( value )

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, " value ")
        })

        test("Should remove Boolean() from property access", () => {
            const document = createMockDocument([
                "return Boolean(obj.property);",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant Boolean constructor",
            )
            diagnostic.range = new vscode.Range(0, 7, 0, 28) // Boolean(obj.property)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "obj.property")
        })

        test("Should handle nested parentheses in Boolean()", () => {
            const document = createMockDocument([
                "const result = Boolean((x && y) || z);",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant Boolean constructor",
            )
            diagnostic.range = new vscode.Range(0, 15, 0, 37) // Boolean((x && y) || z)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "(x && y) || z")
        })

        test("Should handle Boolean() with function call inside", () => {
            const document = createMockDocument([
                "if (Boolean(func())) {",
                "    doSomething();",
                "}",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant Boolean constructor",
            )
            diagnostic.range = new vscode.Range(0, 4, 0, 20) // Boolean(func())

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "func()")
        })

        test("Should handle Boolean() with nested function calls", () => {
            const document = createMockDocument([
                "const isValid = Boolean(getData(getId()));",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant Boolean constructor",
            )
            diagnostic.range = new vscode.Range(0, 16, 0, 41) // Boolean(getData(getId()))

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "getData(getId())")
        })
    })

    suite("Edge Cases", () => {
        test("Should handle fallback when Boolean pattern not found", () => {
            const document = createMockDocument([
                "const result = something;",
            ])

            // Simulate incorrect diagnostic range
            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant boolean cast",
            )
            diagnostic.range = new vscode.Range(0, 15, 0, 24) // "something"

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should fallback to diagnostic range
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.character, 15)
            assert.strictEqual(change.range.end.character, 24)
        })

        test("Should handle malformed Boolean() without closing paren", () => {
            const document = createMockDocument([
                "const result = Boolean(value;",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant Boolean constructor",
            )
            diagnostic.range = new vscode.Range(0, 15, 0, 28) // Boolean(value

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should fallback to diagnostic range when no matching paren found
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)
        })

        test("Should handle empty Boolean()", () => {
            const document = createMockDocument([
                "const result = Boolean();",
            ])

            const diagnostic = createMockDiagnostic(
                "no-extra-boolean-cast",
                "Redundant Boolean constructor",
            )
            diagnostic.range = new vscode.Range(0, 15, 0, 24) // Boolean()

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "") // empty content
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
