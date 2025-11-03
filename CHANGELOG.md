# Changelog

All notable changes to the "Deno Tools" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-03

### 🎉 Initial Release

#### Added

- **Code Formatting**
  - Built-in VS Code formatting integration (Format Document, Format Selection, Format on Save, etc.).
  - Multi-language support: TypeScript, JavaScript, JSX, TSX, JSON, JSONC, Markdown, HTML, CSS, SCSS, Sass, Less, Vue, Svelte, Astro, YAML, and SQL.

- **Linting**
  - Real-time diagnostics with hint
  - Quick fix actions for various rules

- **Commands**
  - `Deno Tools: Fix Current File` - Apply all available auto-fixes.

- **Configuration Options**
  - `deno-tools.enable` - Control how the tools are enabled (boolean or array); auto-detects Deno projects when unset.
  - `deno-tools.linter.lintOnChange` - Enable/disable live linting.
  - `deno-tools.linter.debounceMs` - Configurable typing debounce delay when `lintOnChange` is enabled.

#### Features

- **Lightweight Design**: No Deno LSP overhead, just the tools you need.
- **Smart Auto-Detection**: Automatically enables when `deno.json` or `deno.jsonc` files are found in the project or user's home directory; remains disabled otherwise unless explicitly configured.
- **Project-Aware**: Automatically detects and respects project Deno configuration (`deno.json` or `deno.jsonc`).
- **Performance Optimized**: Debounced linting and efficient file processing.

#### Technical Details

- Minimum VS Code version: 1.97.0.
- Requires Deno installation in system PATH.
- Built with TypeScript and modern VS Code extension APIs.
- Comprehensive error handling and user feedback.
- Extensible architecture for future tool additions.

---

**Note**: This extension focuses on providing Deno's formatting and linting tools without the complexity and resource usage of the full Deno LSP. Perfect for developers who want Deno's excellent tooling in a lightweight package.
