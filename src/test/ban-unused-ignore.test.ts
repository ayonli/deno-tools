import * as assert from "assert"
import * as vscode from "vscode"
import { BanUnusedIgnoreFixProvider } from "../linter/fixes/ban-unused-ignore.ts"

suite("BanUnusedIgnoreFixProvider Tests", () => {
    let provider: BanUnusedIgnoreFixProvider

    beforeEach(() => {
        provider = new BanUnusedIgnoreFixProvider()
    })

    suite("Rule Code Handling", () => {
        test("Should handle ban-unused-ignore diagnostics", () => {
            const diagnostic = createMockDiagnostic(
                "ban-unused-ignore",
                'Ignore for code "no-explicit-any" was not used',
            )
            assert.strictEqual(provider.canHandle(diagnostic), true)
        })

        test("Should not handle other diagnostics", () => {
            const diagnostic = createMockDiagnostic("no-unused-vars", "Variable is not used")
            assert.strictEqual(provider.canHandle(diagnostic), false)
        })
    })

    suite("Unused Rule Extraction", () => {
        test("Should extract unused rule from various message formats", () => {
            const testCases = [
                {
                    message: 'Ignore for code "no-explicit-any" was not used',
                    expected: "no-explicit-any",
                },
                { message: "Unused ignore for rule 'prefer-const'", expected: "prefer-const" },
                {
                    message: "Rule 'no-unused-vars' in ignore comment was not used",
                    expected: "no-unused-vars",
                },
                { message: 'Ignore directive for "ban-types" is unused', expected: "ban-types" },
                { message: "Unused ignore: 'eqeqeq'", expected: "eqeqeq" },
            ]

            testCases.forEach(({ message, expected }) => {
                const result = extractUnusedRuleFromMessageForTest(provider, message)
                assert.strictEqual(
                    result,
                    expected,
                    `Should extract '${expected}' from: ${message}`,
                )
            })
        })

        test("Should extract unused rule from diagnostic hint", () => {
            const diagnostic = createMockDiagnostic("ban-unused-ignore", "Some general message")
            // Add hint in related information
            diagnostic.relatedInformation = [
                {
                    location: new vscode.Location(
                        vscode.Uri.file("/test.ts"),
                        new vscode.Range(0, 0, 0, 10),
                    ),
                    message: 'Hint: Ignore for code "no-explicit-any" was not used',
                },
            ]

            const result = extractUnusedRuleFromDiagnosticForTest(provider, diagnostic)
            assert.strictEqual(result, "no-explicit-any")
        })

        test("Should return null for messages without unused rule", () => {
            const result = extractUnusedRuleFromMessageForTest(provider, "Some other error message")
            assert.strictEqual(result, null)
        })
    })

    suite("Ignore Comment Detection", () => {
        test("Should detect ignore comment with unused rule", () => {
            const testCases = [
                "// deno-lint-ignore no-explicit-any",
                "    // deno-lint-ignore no-unused-vars no-explicit-any prefer-const",
                "// deno-lint-ignore-file no-explicit-any",
                "\t// deno-lint-ignore-file no-unused-vars no-explicit-any",
            ]

            testCases.forEach((text) => {
                const result = isIgnoreCommentWithRuleForTest(provider, text, "no-explicit-any")
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
                const result = isIgnoreCommentWithRuleForTest(provider, text, "no-explicit-any")
                assert.strictEqual(result, false, `Should not detect rule in: ${text}`)
            })
        })
    })

    suite("Fix Generation", () => {
        test("Should create fix to remove unused rule from single-rule comment", () => {
            const document = createMockDocument([
                "// deno-lint-ignore no-explicit-any",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unused-ignore",
                'Ignore for code "no-explicit-any" was not used',
            )
            diagnostic.range = new vscode.Range(0, 0, 0, 30)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]
            assert.strictEqual(fix.title, "Remove unused ignore rule 'no-explicit-any'")

            // Verify the edit removes the entire comment line
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.range.start.line, 0)
            assert.strictEqual(change.range.end.line, 1) // Should include newline
        })

        test("Should create fix to remove unused rule from multi-rule comment", () => {
            const document = createMockDocument([
                "// deno-lint-ignore no-unused-vars no-explicit-any prefer-const",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unused-ignore",
                'Ignore for code "no-explicit-any" was not used',
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
                "// deno-lint-ignore-file no-explicit-any no-unused-vars",
                "",
                "const x: any = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unused-ignore",
                'Ignore for code "no-explicit-any" was not used',
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
            assert.strictEqual(change.newText, "// deno-lint-ignore-file no-unused-vars")
        })

        test("Should handle indented comments", () => {
            const document = createMockDocument([
                "function test() {",
                "    // deno-lint-ignore no-explicit-any prefer-const",
                "    const x = 1",
                "}",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unused-ignore",
                'Ignore for code "no-explicit-any" was not used',
            )
            diagnostic.range = new vscode.Range(1, 0, 1, 30)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit preserves indentation
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(change.newText, "    // deno-lint-ignore prefer-const")
        })

        test("Should return no fixes if unused rule not found in diagnostic", () => {
            const document = createMockDocument([
                "// deno-lint-ignore no-unused-vars",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic("ban-unused-ignore", "Some other message")
            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 0)
        })

        test("Should return no fixes if ignore comment not found", () => {
            const document = createMockDocument([
                "// Some other comment",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unused-ignore",
                'Ignore for code "no-explicit-any" was not used',
            )
            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 0)
        })

        test("Should handle multiple rules and remove only the unused one", () => {
            const document = createMockDocument([
                "// deno-lint-ignore no-unused-vars no-explicit-any prefer-const ban-types",
                "const x = 1",
            ])

            const diagnostic = createMockDiagnostic(
                "ban-unused-ignore",
                'Ignore for code "prefer-const" was not used',
            )
            diagnostic.range = new vscode.Range(0, 0, 0, 30)

            const fixes = provider.createFixes(diagnostic, document)

            assert.strictEqual(fixes.length, 1)
            const fix = fixes[0]

            // Verify the edit removes only the unused rule
            assert.ok(fix.edit)
            const changes = fix.edit.get(document.uri)
            assert.strictEqual(changes.length, 1)

            const change = changes[0]
            assert.strictEqual(
                change.newText,
                "// deno-lint-ignore no-unused-vars no-explicit-any ban-types",
            )
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
function extractUnusedRuleFromMessageForTest(
    provider: BanUnusedIgnoreFixProvider,
    message: string,
): string | null {
    // deno-lint-ignore no-explicit-any
    const providerAny = provider as any
    return providerAny.extractUnusedRuleFromMessage(message)
}

function extractUnusedRuleFromDiagnosticForTest(
    provider: BanUnusedIgnoreFixProvider,
    diagnostic: vscode.Diagnostic,
): string | null {
    // deno-lint-ignore no-explicit-any
    const providerAny = provider as any
    return providerAny.extractUnusedRuleFromDiagnostic(diagnostic)
}

function isIgnoreCommentWithRuleForTest(
    provider: BanUnusedIgnoreFixProvider,
    text: string,
    rule: string,
): boolean {
    // deno-lint-ignore no-explicit-any
    const providerAny = provider as any
    return providerAny.isIgnoreCommentWithRule(text, rule)
}
