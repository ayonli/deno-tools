import * as assert from "assert"
import * as vscode from "vscode"
import { BanUnknownRuleCodeFixProvider } from "../linter/fixes/ban-unknown-rule-code.ts"

suite("BanUnknownRuleCodeFixProvider Tests", () => {
    let provider: BanUnknownRuleCodeFixProvider

    beforeEach(() => {
        provider = new BanUnknownRuleCodeFixProvider()
    })

    suite("Rule Code Handling", () => {
        test("Should handle ban-unknown-rule-code diagnostics", () => {
            const diagnostic = createMockDiagnostic(
                "ban-unknown-rule-code",
                "Unknown rule 'invalid-rule'",
            )
            assert.strictEqual(provider.canHandle(diagnostic), true)
        })

        test("Should not handle other diagnostics", () => {
            const diagnostic = createMockDiagnostic("no-unused-vars", "Variable is not used")
            assert.strictEqual(provider.canHandle(diagnostic), false)
        })
    })

    suite("Unknown Rule Extraction", () => {
        test("Should extract unknown rule from various message formats", () => {
            const testCases = [
                { message: "Unknown rule 'invalid-rule'", expected: "invalid-rule" },
                { message: "Rule 'some-rule' is not recognized", expected: "some-rule" },
                { message: "'bad-rule' is not a valid lint rule", expected: "bad-rule" },
                { message: "Unknown lint rule: 'test-rule'", expected: "test-rule" },
                { message: "Invalid rule: 'fake-rule'", expected: "fake-rule" },
            ]

            testCases.forEach(({ message, expected }) => {
                const result = extractUnknownRuleForTest(provider, message)
                assert.strictEqual(
                    result,
                    expected,
                    `Should extract '${expected}' from: ${message}`,
                )
            })
        })

        test("Should return null for messages without unknown rule", () => {
            const result = extractUnknownRuleForTest(provider, "Some other error message")
            assert.strictEqual(result, null)
        })
    })

    suite("Ignore Comment Detection", () => {
        test("Should detect ignore comment with unknown rule", () => {
            const testCases = [
                "// deno-lint-ignore invalid-rule",
                "    // deno-lint-ignore no-unused-vars invalid-rule prefer-const",
                "// deno-lint-ignore-file invalid-rule",
                "\t// deno-lint-ignore-file no-explicit-any invalid-rule",
            ]

            testCases.forEach((text) => {
                const result = isIgnoreCommentWithRuleForTest(provider, text, "invalid-rule")
                assert.strictEqual(result, true, `Should detect rule in: ${text}`)
            })
        })

        test("Should not detect rule when not present", () => {
            const testCases = [
                "// deno-lint-ignore no-unused-vars",
                "// deno-lint-ignore-file prefer-const",
                "// Some other comment",
                "",
            ]

            testCases.forEach((text) => {
                const result = isIgnoreCommentWithRuleForTest(provider, text, "invalid-rule")
                assert.strictEqual(result, false, `Should not detect rule in: ${text}`)
            })
        })
    })

    suite("Fix Generation", () => {
        test("Should create fix to remove unknown rule from single-rule comment", () => {
            const document = createMockDocument([
                "// deno-lint-ignore invalid-rule",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unknown-rule-code",
                "Unknown rule 'invalid-rule'",
            )
            diagnostic.range = new vscode.Range(0, 0, 0, 30)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Remove unknown rule 'invalid-rule' from ignore comment")

            // Verify the edit removes the entire comment line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 0)
            assert.strictEqual(change.range.end.line, 1) // Should include newline
        })

        test("Should create fix to remove unknown rule from multi-rule comment", () => {
            const document = createMockDocument([
                "// deno-lint-ignore no-unused-vars invalid-rule prefer-const",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unknown-rule-code",
                "Unknown rule 'invalid-rule'",
            )
            diagnostic.range = new vscode.Range(0, 0, 0, 30)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit keeps valid rules
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "// deno-lint-ignore no-unused-vars prefer-const")
        })

        test("Should handle file-level ignore comments", () => {
            const document = createMockDocument([
                "// deno-lint-ignore-file invalid-rule no-explicit-any",
                "",
                "const x: any = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unknown-rule-code",
                "Unknown rule 'invalid-rule'",
            )
            diagnostic.range = new vscode.Range(0, 0, 0, 30)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit keeps valid rules
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "// deno-lint-ignore-file no-explicit-any")
        })

        test("Should return no fixes if unknown rule not found", () => {
            const document = createMockDocument([
                "// Some comment",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic("ban-unknown-rule-code", "Some other message")
            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 0)
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

// Helper functions to access private methods for testing
function extractUnknownRuleForTest(
    provider: BanUnknownRuleCodeFixProvider,
    message: string,
): string | null {
    // deno-lint-ignore no-explicit-any
    const providerAny = provider as any
    return providerAny.extractUnknownRuleFromMessage(message)
}

function isIgnoreCommentWithRuleForTest(
    provider: BanUnknownRuleCodeFixProvider,
    text: string,
    rule: string,
): boolean {
    // deno-lint-ignore no-explicit-any
    const providerAny = provider as any
    return providerAny.isIgnoreCommentWithRule(text, rule)
}
