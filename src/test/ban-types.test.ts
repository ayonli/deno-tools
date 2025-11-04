import * as assert from "assert"
import * as vscode from "vscode"
import { BanTypesFixProvider } from "../linter/fixes/ban-types.ts"

suite("BanTypes Fix Provider Tests", () => {
    let provider: BanTypesFixProvider

    beforeEach(() => {
        provider = new BanTypesFixProvider()
    })

    test("Should handle ban-types rule code", () => {
        assert.ok(provider.ruleCodes.includes("ban-types"))
    })

    test("Should replace Boolean with boolean", async () => {
        const mockDocument = await createMockDocument("Boolean")
        const diagnostic = createMockDiagnostic("ban-types", "Use `boolean` instead", [0, 0, 0, 7])

        const fixes = provider.createFixes(diagnostic, mockDocument)

        assert.strictEqual(fixes.length, 1)
        assert.strictEqual(fixes[0].title, "Replace 'Boolean' with 'boolean'")

        const edit = fixes[0].edit!
        const changes = edit.get(mockDocument.uri)
        assert.ok(changes)
        assert.strictEqual(changes.length, 1)
        assert.strictEqual(changes[0].newText, "boolean")
    })

    test("Should replace String with string", async () => {
        const mockDocument = await createMockDocument("String")
        const diagnostic = createMockDiagnostic("ban-types", "Use `string` instead", [0, 0, 0, 6])

        const fixes = provider.createFixes(diagnostic, mockDocument)

        assert.strictEqual(fixes.length, 1)
        assert.strictEqual(fixes[0].title, "Replace 'String' with 'string'")

        const edit = fixes[0].edit!
        const changes = edit.get(mockDocument.uri)
        assert.ok(changes)
        assert.strictEqual(changes.length, 1)
        assert.strictEqual(changes[0].newText, "string")
    })

    test("Should replace Number with number", async () => {
        const mockDocument = await createMockDocument("Number")
        const diagnostic = createMockDiagnostic("ban-types", "Use `number` instead", [0, 0, 0, 6])

        const fixes = provider.createFixes(diagnostic, mockDocument)

        assert.strictEqual(fixes.length, 1)
        assert.strictEqual(fixes[0].title, "Replace 'Number' with 'number'")

        const edit = fixes[0].edit!
        const changes = edit.get(mockDocument.uri)
        assert.ok(changes)
        assert.strictEqual(changes.length, 1)
        assert.strictEqual(changes[0].newText, "number")
    })

    test("Should replace Symbol with symbol", async () => {
        const mockDocument = await createMockDocument("Symbol")
        const diagnostic = createMockDiagnostic("ban-types", "Use `symbol` instead", [0, 0, 0, 6])

        const fixes = provider.createFixes(diagnostic, mockDocument)

        assert.strictEqual(fixes.length, 1)
        assert.strictEqual(fixes[0].title, "Replace 'Symbol' with 'symbol'")

        const edit = fixes[0].edit!
        const changes = edit.get(mockDocument.uri)
        assert.ok(changes)
        assert.strictEqual(changes.length, 1)
        assert.strictEqual(changes[0].newText, "symbol")
    })

    test("Should replace Function with explicit function signature", async () => {
        const mockDocument = await createMockDocument("Function")
        const diagnostic = createMockDiagnostic(
            "ban-types",
            "Define the function shape explicitly",
            [0, 0, 0, 8],
        )

        const fixes = provider.createFixes(diagnostic, mockDocument)

        assert.strictEqual(fixes.length, 1)
        assert.strictEqual(
            fixes[0].title,
            "Replace 'Function' with '(...args: unknown[]) => unknown'",
        )

        const edit = fixes[0].edit!
        const changes = edit.get(mockDocument.uri)
        assert.ok(changes)
        assert.strictEqual(changes.length, 1)
        assert.strictEqual(changes[0].newText, "(...args: unknown[]) => unknown")
    })

    test("Should replace Object with object", async () => {
        const mockDocument = await createMockDocument("Object")
        const diagnostic = createMockDiagnostic("ban-types", "use `object` instead", [0, 0, 0, 6])

        const fixes = provider.createFixes(diagnostic, mockDocument)

        assert.strictEqual(fixes.length, 1)
        assert.strictEqual(fixes[0].title, "Replace 'Object' with 'object'")

        const edit = fixes[0].edit!
        const changes = edit.get(mockDocument.uri)
        assert.ok(changes)
        assert.strictEqual(changes.length, 1)
        assert.strictEqual(changes[0].newText, "object")
    })

    test("Should replace {} with Record<string, never>", async () => {
        const mockDocument = await createMockDocument("{}")
        const diagnostic = createMockDiagnostic(
            "ban-types",
            "use `Record<PropertyKey, never>` instead",
            [0, 0, 0, 2],
        )

        const fixes = provider.createFixes(diagnostic, mockDocument)

        assert.strictEqual(fixes.length, 1)
        assert.strictEqual(fixes[0].title, "Replace '{}' with 'Record<string, never>'")

        const edit = fixes[0].edit!
        const changes = edit.get(mockDocument.uri)
        assert.ok(changes)
        assert.strictEqual(changes.length, 1)
        assert.strictEqual(changes[0].newText, "Record<string, never>")
    })

    test("Should return empty array for unrecognized ban-types", async () => {
        const mockDocument = await createMockDocument("SomeType")
        const diagnostic = createMockDiagnostic("ban-types", "Some other hint", [0, 0, 0, 8])

        const fixes = provider.createFixes(diagnostic, mockDocument)

        assert.strictEqual(fixes.length, 0)
    })

    test("Should not handle non-ban-types diagnostics", () => {
        const diagnostic = createMockDiagnostic("other-rule", "Some message", [0, 0, 0, 5])

        assert.ok(!provider.canHandle(diagnostic))
    })
})

// Helper function to create mock VS Code documents
async function createMockDocument(content: string): Promise<vscode.TextDocument> {
    return await vscode.workspace.openTextDocument({
        language: "typescript",
        content: content,
    })
}

// Helper function to create mock diagnostics
function createMockDiagnostic(
    code: string,
    hint: string,
    range: [number, number, number, number],
): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(
        new vscode.Range(range[0], range[1], range[2], range[3]),
        "Test message",
        vscode.DiagnosticSeverity.Error,
    )

    diagnostic.code = code

    // Add hint as related information
    diagnostic.relatedInformation = [
        new vscode.DiagnosticRelatedInformation(
            new vscode.Location(
                vscode.Uri.file("/test"),
                new vscode.Range(0, 0, 0, 0),
            ),
            `💡 ${hint}`,
        ),
    ]

    return diagnostic
}
