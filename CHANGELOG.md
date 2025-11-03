# Changelog

All notable changes to the "D#### Technical Details

- **Exceptional Compatibility**: Supports VS Code 1.97.0 and newer (wider compatibility than most extensions)
- Requires Deno installation in system PATH
- Built with TypeScript and proven VS Code extension APIs
- Comprehensive error handling and user feedback
- Extensible architecture for future tool additionsols" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-11-03

### 🎉 Initial Release

#### Added

- **Smart Code Formatting**
  - Built-in VS Code formatting integration (Format Document, Format Selection)
  - Automatic `deno.json` and `deno.jsonc` configuration detection
  - Multi-language support: TypeScript, JavaScript, JSX, TSX, JSON, JSONC, Markdown, HTML, CSS, SCSS, Sass, Less, Vue, Svelte, Astro, YAML, and SQL
  - Format on save compatibility

- **Advanced Linting**
  - Real-time diagnostics with configurable debouncing
  - Smart configuration file detection (searches up directory tree)
  - Auto-fix capabilities for supported lint rules
  - Comprehensive Deno lint rule support with detailed diagnostics

- **Developer Commands**
  - `Deno Tools: Toggle Deno Formatter` - Enable/disable formatting
  - `Deno Tools: Toggle Deno Linter` - Enable/disable linting
  - `Deno Tools: Fix Current File` - Apply all available auto-fixes

- **Configuration Options**
  - `deno-tools.formatter.enabled` - Control formatter activation
  - `deno-tools.linter.enabled` - Control linter activation
  - `deno-tools.linter.lintOnChange` - Enable/disable live linting
  - `deno-tools.linter.debounceMs` - Configurable typing debounce delay

#### Features

- **Lightweight Design**: No Deno LSP overhead, just the tools you need
- **Zero Configuration**: Works out of the box with sensible defaults
- **Project-Aware**: Automatically detects and respects project Deno configuration
- **Performance Optimized**: Debounced linting and efficient file processing
- **Framework Support**: First-class support for Vue, Svelte, and Astro components

#### Technical Details

- Minimum VS Code version: 1.105.0
- Requires Deno installation in system PATH
- Built with TypeScript and modern VS Code extension APIs
- Comprehensive error handling and user feedback
- Extensible architecture for future tool additions

---

**Note**: This extension focuses on providing Deno's formatting and linting tools without the complexity and resource usage of the full Deno LSP. Perfect for developers who want Deno's excellent tooling in a lightweight package.
