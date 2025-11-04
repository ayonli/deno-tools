import * as assert from "assert"
import * as vscode from "vscode"
import { BanUntaggedIgnoreFixProvider } from "../linter/fixes/ban-untagged-ignore.ts"

suite("BanUntaggedIgnoreFixProvider Tests", () => {
    let provider: BanUntaggedIgnoreFixProvider

    beforeEach(() => {
        provider = new BanUntaggedIgnoreFixProvider()
    })

    suite("Rule Code Handling", () => {
        test("Should handle ban-untagged-ignore diagnostics", () => {
            const diagnostic = createMockDiagnostic(
                "ban-untagged-ignore",
                "Bare deno-lint-ignore comment",
            )
            assert.strictEqual(provider.canHandle(diagnostic), true)
        })

        test("Should not handle other diagnostics", () => {
            const diagnostic = createMockDiagnostic("no-unused-vars", "Variable is not used")
            assert.strictEqual(provider.canHandle(diagnostic), false)
        })
    })

    suite("Bare Ignore Comment Detection", () => {
        test("Should detect bare deno-lint-ignore comments", () => {
            const testCases = [
                "// deno-lint-ignore",
                "//deno-lint-ignore",
                "   // deno-lint-ignore   ",
                "\t//\tdeno-lint-ignore\t",
            ]

            testCases.forEach((text) => {
                const result = isBareIgnoreCommentForTest(provider, text)
                assert.strictEqual(result, true, `Should detect bare ignore in: "${text}"`)
            })
        })

        test("Should not detect comments with rules or file-level ignores", () => {
            const testCases = [
                "// deno-lint-ignore no-unused-vars",
                "// deno-lint-ignore-file prefer-const",
                "// deno-lint-ignore-file", // This is legal without rules
                "// deno-lint-ignore no-explicit-any prefer-const",
                "// Some other comment",
                "",
                "// deno-lint-ignore-next-line",
            ]

            testCases.forEach((text) => {
                const result = isBareIgnoreCommentForTest(provider, text)
                assert.strictEqual(result, false, `Should not detect rules in: "${text}"`)
            })
        })
    })

    suite("Fix Generation", () => {
        test("Should create fix to remove bare deno-lint-ignore comment", () => {
            const document = createMockDocument([
                "// deno-lint-ignore",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-untagged-ignore",
                "Bare deno-lint-ignore comment",
            )
            diagnostic.range = new vscode.Range(0, 0, 0, 20)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Remove bare 'deno-lint-ignore' comment")

            // Verify the edit removes the entire comment line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 0)
            assert.strictEqual(change.range.end.line, 1) // Should include newline
            assert.strictEqual(change.newText, "")
        })

        test("Should handle indented bare ignore comments", () => {
            const document = createMockDocument([
                "function test() {",
                "    // deno-lint-ignore",
                "    const x = 1",
                "}",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-untagged-ignore",
                "Bare deno-lint-ignore comment",
            )
            diagnostic.range = new vscode.Range(1, 0, 1, 25)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit removes the entire indented comment line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 1)
            assert.strictEqual(change.range.end.line, 2)
        })

        test("Should return no fixes if bare ignore comment not found", () => {
            const document = createMockDocument([
                "// deno-lint-ignore no-unused-vars", // Not bare - has a rule
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-untagged-ignore",
                "Bare deno-lint-ignore comment",
            )
            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 0)
        })

        test("Should handle multiple lines and find correct bare comment", () => {
            const document = createMockDocument([
                "// Some other comment",
                "// deno-lint-ignore no-unused-vars", // Not bare
                "// deno-lint-ignore", // This is bare
                "const x = 1",
                "// Another comment",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-untagged-ignore",
                "Bare deno-lint-ignore comment",
            )
            diagnostic.range = new vscode.Range(2, 0, 2, 20)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Should find and remove the bare comment on line 2
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 2)
            assert.strictEqual(change.range.end.line, 3)
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
        uri: vscode.Uri.file("/test.ts"),
        fileName: "/test.ts",
        languageId: "typescript",
        lineCount: lines.length,
        getText: () => content,
        lineAt: (line: number) => ({
            text: lines[line] || "",
            range: new vscode.Range(line, 0, line, lines[line]?.length || 0),
            rangeIncludingLineBreak: new vscode.Range(line, 0, line + 1, 0),
            firstNonWhitespaceCharacterIndex: lines[line]?.search(/\S/) || 0,
            isEmptyOrWhitespace: !lines[line] || lines[line].trim() === "",
        }),
    } as vscode.TextDocument
}

// Helper function to access private methods for testing
function isBareIgnoreCommentForTest(provider: BanUntaggedIgnoreFixProvider, text: string): boolean {
    // deno-lint-ignore no-explicit-any
    const providerAny = provider as any
    return providerAny.isBareIgnoreComment(text)
}
