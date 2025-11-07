# Changelog

All notable changes to the "Deno Tools" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2025-11-08

### 🔧 Enhanced

#### Linting Improvements

- **Quick fix for `camelcase` rule**: Added automatic fix to rename snake_case identifiers to camelCase following Deno's suggestions.
- **Quick fix for `constructor-super` rule**: Added automatic fix to remove invalid `super()` calls in constructors.
- **Quick fix for `jsx-no-comment-text-nodes` rule**: Added automatic fix to wrap JSX block comments (`/* ... */`) in curly braces to prevent them from being rendered as text nodes.

## [0.1.2] - 2025-11-06

### 🎨 Enhanced

#### Formatter Improvements

- **Respect `fmt.exclude` patterns**: The formatter now properly respects `fmt.exclude` patterns from `deno.json`/`deno.jsonc` configuration files instead of silently ignoring them.
- **User-friendly exclusion warnings**: When attempting to format a file excluded by `fmt.exclude` patterns, the extension shows a clear warning message explaining why the file wasn't formatted.
- **Configurable warning behavior**: Added `deno-tools.formatter.warnOnExclude` setting (default: `true`) to control whether to show warnings for excluded files. Users can disable warnings via a "Don't show again" option.
- **Consistent exclusion logic**: Refactored exclusion checking logic to the base class, ensuring both formatter and linter handle include/exclude patterns consistently.

### ⚡ Performance

#### Major Performance Optimizations

- **Intelligent config caching**: Implemented smart caching for `deno.json`/`deno.jsonc` files to avoid repeated file reads and parsing during formatting/linting operations.
- **Configuration path caching**: Added intelligent caching for config file path lookups to eliminate repeated directory tree traversals.
- **File system monitoring**: Added file watcher to automatically invalidate cache when configuration files are created, modified, or deleted.
- **Batched document processing**: Re-linting on enable now processes documents in small batches with delays to prevent UI blocking.
- **Debounced config changes**: Added debouncing to configuration change handlers to prevent rapid re-initialization.

### 🔧 Technical Improvements

- **Reduced I/O operations**: Configuration files are now read only once per modification, significantly improving performance for frequent formatting/linting actions.
- **Reduced file system calls**: Config path searches are now cached and only performed once per document until invalidated.
- **Memory efficiency**: Cache tracks file modification times to ensure configs are always up-to-date while minimizing disk I/O.
- **Improved error handling**: Enhanced graceful fallback when configuration files cannot be read.
- **Smoother UX**: Large numbers of open documents are processed gradually to maintain editor responsiveness.
- **Smart cache invalidation**: Both config content and path caches are properly invalidated when files change.
- **Debug logging**: Added cache hit/miss logging for performance monitoring and debugging.

## [0.1.1] - 2025-11-05

### 🔧 Enhanced

#### Linting Improvements

- **Auto-ignore system directories**: The linter now automatically ignores `node_modules` and `.git` directories, improving performance and reducing unnecessary diagnostics.
- **Enhanced quick fix for `no-explicit-any`**: Added "Remove type assertion" action when the `no-explicit-any` rule is violated, providing more precise refactoring options.

## [0.1.0] - 2025-11-03

### 🎉 Initial Release

#### Added

- **Code Formatting**
  - Built-in VS Code formatting integration (Format Document, Format Selection, Format on Save, etc.).
  - Multi-language support: TypeScript, JavaScript, JSX, TSX, JSON, JSONC, Markdown, HTML, CSS, SCSS, Sass, Less, Vue, Svelte, Astro, YAML, and SQL.

- **Linting**
  - Real-time diagnostics with hint.
  - Quick fix actions for various rules.
  - Respect `include` and `exclude` settings in `deno.json`.

- **Commands**
  - `Deno Tools: Fix Current File` - Apply all available auto-fixes.

- **Configuration Options**
  - `deno-tools.enable` - Enable Deno tools. Can be `true` (all tools), `false` (no tools), or an
    array of specific tools: `['formatter', 'linter']`. When not set (`null`), automatically enables
    if `deno.json`/`deno.jsonc` is found.
  - `deno-tools.linter.lintOnChange` - Enable linting while typing (disable to only lint on save/manual triggers)
  - `deno-tools.linter.debounceMs` - Debounce delay in milliseconds for linting after document changes (higher values = less interruption while typing)
  - `deno-tools.linter.severity` Default `error`, set to `warning` or `info` for VS Code to provide informative diagnostics but the rules are not enforced in CI pipelines.

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
