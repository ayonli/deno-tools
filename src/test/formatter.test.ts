import * as assert from "assert"
import type * as vscode from "vscode"
import { DocumentFormattingEditProvider } from "../formatter.ts"

suite("Formatter Unit Tests", () => {
    let formatter: DocumentFormattingEditProvider

    beforeEach(() => {
        formatter = new DocumentFormattingEditProvider()
    })

    suite("Extension Detection Logic", () => {
        test("Should detect TypeScript extensions correctly", () => {
            // Test various TypeScript file extensions
            const testCases = [
                { fileName: "test.ts", expected: "ts" },
                { fileName: "component.tsx", expected: "tsx" },
                { fileName: "module.mts", expected: "mts" },
                { fileName: "legacy.cts", expected: "cts" },
            ]

            testCases.forEach(({ fileName, expected }) => {
                const result = getExtensionForTest(formatter, fileName, "typescript")
                assert.strictEqual(result, expected, `${fileName} should map to ${expected}`)
            })
        })

        test("Should detect JavaScript extensions correctly", () => {
            const testCases = [
                { fileName: "test.js", expected: "js" },
                { fileName: "component.jsx", expected: "jsx" },
                { fileName: "module.mjs", expected: "mjs" },
                { fileName: "legacy.cjs", expected: "cjs" },
            ]

            testCases.forEach(({ fileName, expected }) => {
                const result = getExtensionForTest(formatter, fileName, "javascript")
                assert.strictEqual(result, expected, `${fileName} should map to ${expected}`)
            })
        })

        test("Should detect YAML extensions correctly", () => {
            const testCases = [
                { fileName: "config.yml", expected: "yml" },
                { fileName: "docker-compose.yaml", expected: "yaml" },
            ]

            testCases.forEach(({ fileName, expected }) => {
                const result = getExtensionForTest(formatter, fileName, "yaml")
                assert.strictEqual(result, expected, `${fileName} should map to ${expected}`)
            })
        })

        test("Should handle unknown extensions with language fallback", () => {
            // Test file without extension or unknown extension
            const result = getExtensionForTest(formatter, "unknown.xyz", "typescript")
            assert.strictEqual(result, "ts", "Should fallback to language mapping")
        })

        test("Should detect web technology extensions", () => {
            const testCases = [
                { fileName: "style.css", expected: "css" },
                { fileName: "style.scss", expected: "scss" },
                { fileName: "style.sass", expected: "sass" },
                { fileName: "style.less", expected: "less" },
                { fileName: "index.html", expected: "html" },
            ]

            testCases.forEach(({ fileName, expected }) => {
                const result = getExtensionForTest(formatter, fileName, "css")
                assert.strictEqual(result, expected, `${fileName} should map to ${expected}`)
            })
        })

        test("Should detect data format extensions", () => {
            const testCases = [
                { fileName: "package.json", expected: "json" },
                { fileName: "tsconfig.jsonc", expected: "jsonc" },
                { fileName: "README.md", expected: "md" },
                { fileName: "query.sql", expected: "sql" },
            ]

            testCases.forEach(({ fileName, expected }) => {
                const result = getExtensionForTest(formatter, fileName, "json")
                assert.strictEqual(result, expected, `${fileName} should map to ${expected}`)
            })
        })
    })

    suite("Language ID Fallback Logic", () => {
        test("Should map language IDs correctly when extension detection fails", () => {
            const testCases = [
                { languageId: "typescript", expected: "ts" },
                { languageId: "typescriptreact", expected: "tsx" },
                { languageId: "javascript", expected: "js" },
                { languageId: "javascriptreact", expected: "jsx" },
                { languageId: "json", expected: "json" },
                { languageId: "jsonc", expected: "jsonc" },
                { languageId: "yaml", expected: "yaml" },
                { languageId: "markdown", expected: "md" },
                { languageId: "html", expected: "html" },
                { languageId: "css", expected: "css" },
                { languageId: "scss", expected: "scss" },
                { languageId: "sass", expected: "sass" },
                { languageId: "less", expected: "less" },
                { languageId: "sql", expected: "sql" },
            ]

            testCases.forEach(({ languageId, expected }) => {
                const result = getExtensionForTest(formatter, "unknown", languageId)
                assert.strictEqual(
                    result,
                    expected,
                    `Language ID ${languageId} should map to ${expected}`,
                )
            })
        })

        test("Should default to ts for unknown language IDs", () => {
            const result = getExtensionForTest(formatter, "unknown", "unknown")
            assert.strictEqual(result, "ts", "Unknown language should default to ts")
        })
    })

    suite("Exclude Pattern Logic", () => {
        test("Should support getRelativePath method", () => {
            // Test that the getRelativePath method is accessible
            // deno-lint-ignore no-explicit-any
            const formatterAny = formatter as any
            assert.strictEqual(
                typeof formatterAny.getRelativePath,
                "function",
                "getRelativePath should be a function",
            )
        })
    })
})

// Helper function to test the private getExtension method
// This uses reflection to access the private method for testing
function getExtensionForTest(
    formatter: DocumentFormattingEditProvider,
    fileName: string,
    languageId: string,
): string {
    // Create a mock document
    const mockDocument = {
        fileName: fileName,
        languageId: languageId,
    } as vscode.TextDocument

    // Access the private method through type assertion
    // Note: This is a testing technique to access private methods
    // deno-lint-ignore no-explicit-any
    const formatterAny = formatter as any
    return formatterAny.getExtension(mockDocument)
}
