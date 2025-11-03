# Deno Tools

[![Version](https://img.shields.io/vscode-marketplace/v/ayonli.deno-tools)](https://marketplace.visualstudio.com/items?itemName=ayonli.deno-tools)
[![Downloads](https://img.shields.io/vscode-marketplace/d/ayonli.deno-tools)](https://marketplace.visualstudio.com/items?itemName=ayonli.deno-tools)
[![Rating](https://img.shields.io/vscode-marketplace/r/ayonli.deno-tools)](https://marketplace.visualstudio.com/items?itemName=ayonli.deno-tools)

**Use Deno tools, such as formatter and linter, without the baggage of Deno LSP.**

Deno Tools is a lightweight VS Code extension that provides Deno's powerful formatting and linting capabilities without requiring the full Deno Language Server Protocol (LSP). Perfect for projects that want to leverage Deno's excellent tooling while maintaining flexibility in their development setup.

## ✨ Features

### 🎨 **Smart Code Formatting**

- **Built-in Integration**: Format documents using VS Code's standard formatting commands (Format Document, Format Selection)
- **Automatic Configuration**: Respects `deno.json` and `deno.jsonc` configuration files
- **Multi-Language Support**: Supports TypeScript, JavaScript, JSX, TSX, JSON, JSONC, Markdown, HTML, CSS, SCSS, Sass, Less, Vue, Svelte, Astro, YAML, and SQL
- **Format on Save**: Works seamlessly with VS Code's format-on-save feature

### 🔍 **Advanced Linting**

- **Real-time Diagnostics**: Live linting with configurable debouncing to avoid interruption while typing
- **Smart Configuration**: Automatically finds and uses `deno.json`/`deno.jsonc` config files in your project hierarchy
- **Auto-fixes**: Intelligent code fixes with the "Fix Current File" command
- **Comprehensive Rules**: Supports all Deno lint rules with detailed diagnostics and helpful hints

### 🛠 **Developer-Friendly Commands**

- **Toggle Formatter**: Quickly enable/disable Deno formatting (`Deno Tools: Toggle Deno Formatter`)
- **Toggle Linter**: Quickly enable/disable Deno linting (`Deno Tools: Toggle Deno Linter`)
- **Fix Current File**: Apply all available auto-fixes to the current file (`Deno Tools: Fix Current File`)

## 🚀 Quick Start

1. **Install Deno**: Make sure [Deno](https://deno.land/) is installed on your system
2. **Install Extension**: Install "Deno Tools" from the VS Code marketplace
3. **Start Coding**: The extension automatically activates when you open supported file types

### Basic Usage

```typescript
// Open any TypeScript/JavaScript file
// Use Ctrl+Shift+I (Cmd+Shift+I on macOS) to format
// Linting diagnostics appear automatically as you type

// Create a deno.json file for custom configuration:
{
  "fmt": {
    "lineWidth": 100,
    "indentWidth": 2,
    "singleQuote": true
  },
  "lint": {
    "rules": {
      "tags": ["recommended"]
    }
  }
}
```

## ⚙️ Configuration

This extension provides several configuration options accessible via VS Code settings:

| Setting                          | Default | Description                                                                |
| -------------------------------- | ------- | -------------------------------------------------------------------------- |
| `deno-tools.formatter.enabled`   | `true`  | Enable Deno formatting for supported file types                            |
| `deno-tools.linter.enabled`      | `true`  | Enable Deno linting for TypeScript and JavaScript files                    |
| `deno-tools.linter.lintOnChange` | `true`  | Enable linting while typing (disable to only lint on save/manual triggers) |
| `deno-tools.linter.debounceMs`   | `1500`  | Debounce delay in milliseconds for linting after document changes          |

### Deno Configuration

The extension automatically detects and uses your project's Deno configuration:

- Searches for `deno.json` or `deno.jsonc` files
- Starts from the current file's directory and searches up to the workspace root
- Respects all Deno formatting and linting configuration options

Example `deno.json`:

```json
{
    "fmt": {
        "lineWidth": 120,
        "indentWidth": 4,
        "semiColons": false,
        "singleQuote": true,
        "proseWrap": "preserve"
    },
    "lint": {
        "include": ["src/"],
        "exclude": ["build/", "dist/"],
        "rules": {
            "tags": ["recommended"],
            "exclude": ["no-unused-vars"]
        }
    }
}
```

## 🎯 Supported Languages

| Language   | Formatting | Linting | File Extensions                   |
| ---------- | ---------- | ------- | --------------------------------- |
| TypeScript | ✅         | ✅      | `.ts`, `.tsx`, `.mts`, `.cts`     |
| JavaScript | ✅         | ✅      | `.js`, `.jsx`, `.mjs`, `.cjs`     |
| JSON       | ✅         | ❌      | `.json`, `.jsonc`                 |
| Markdown   | ✅         | ❌      | `.md`                             |
| HTML       | ✅         | ❌      | `.html`                           |
| CSS        | ✅         | ❌      | `.css`, `.scss`, `.sass`, `.less` |
| Vue        | ✅         | ❌      | `.vue`                            |
| Svelte     | ✅         | ❌      | `.svelte`                         |
| Astro      | ✅         | ❌      | `.astro`                          |
| YAML       | ✅         | ❌      | `.yml`, `.yaml`                   |
| SQL        | ✅         | ❌      | `.sql`                            |

## 📋 Commands

Access these commands via the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command                             | Description                                        |
| ----------------------------------- | -------------------------------------------------- |
| `Deno Tools: Toggle Deno Formatter` | Enable or disable Deno formatting                  |
| `Deno Tools: Toggle Deno Linter`    | Enable or disable Deno linting                     |
| `Deno Tools: Fix Current File`      | Apply all available auto-fixes to the current file |

## 📝 Usage Tips

### Formatting

- Use standard VS Code formatting shortcuts: `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (macOS)
- Right-click and select "Format Document" or "Format Selection"
- Enable "Format on Save" in VS Code settings for automatic formatting

### Linting

- Diagnostics appear automatically as you type (with configurable debouncing)
- Hover over underlined issues to see detailed information and quick fixes
- Use "Fix Current File" to apply all available auto-fixes at once
- Linting respects your `deno.json` configuration for included/excluded files and rules

### Performance

- Adjust `deno-tools.linter.debounceMs` if linting feels too intrusive while typing
- Disable `deno-tools.linter.lintOnChange` to only lint on save and manual triggers
- The extension is lightweight and doesn't include the full Deno LSP overhead

## 🔧 Requirements

- **Deno**: Must be installed and available in your system PATH
- **VS Code**: Version 1.97.0 or higher
- **Operating System**: Windows, macOS, or Linux

## 🆚 Comparison with Deno LSP

| Feature          | Deno Tools | Deno LSP |
| ---------------- | ---------- | -------- |
| Formatting       | ✅         | ✅       |
| Linting          | ✅         | ✅       |
| Type Checking    | ❌         | ✅       |
| IntelliSense     | ❌         | ✅       |
| Import Maps      | ❌         | ✅       |
| Go to Definition | ❌         | ✅       |
| Resource Usage   | Low        | High     |
| Setup Complexity | Minimal    | Complex  |
| Configuration    | Simple     | Advanced |

**Choose Deno Tools when:**

- You want lightweight Deno tooling without LSP overhead
- You're using other TypeScript language servers
- You only need formatting and linting capabilities
- You want simple, zero-configuration setup
- You need compatibility with older VS Code versions (1.97.0+)

**Choose Deno LSP when:**

- You need full TypeScript IntelliSense and type checking
- You're building a pure Deno project
- You need advanced Deno-specific features like import maps

## 🐛 Known Issues

- **Deno Installation Required**: The extension requires Deno to be installed and accessible via PATH
- **Large File Performance**: Very large files (>10MB) may experience slower formatting/linting
- **Windows Path Issues**: Ensure Deno is properly added to your Windows PATH environment variable

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Deno Tools"
4. Click Install

### From Command Line

```bash
code --install-extension ayonli.deno-tools
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## 📄 License

This extension is licensed under the MIT License.

---

**Enjoy coding with Deno Tools! 🦕**
