# Palmier Pro for Windows

**The video editor built for AI.**

## ⬇️ Download

**[Download PalmierPro-Windows-1.0.0-Portable.exe](https://github.com/shurukon/AVE/releases/download/v1.0.0/PalmierPro-Windows-1.0.0-Portable.exe)** (80 MB)

No installation required — just double-click and run.

## 🚀 Quick Start

1. Download the `.exe` file from the link above
2. Double-click to run
3. The editor opens automatically on `http://localhost:3000`
4. MCP server starts on `http://127.0.0.1:19789/mcp`
5. An icon appears in your system tray

## 🔗 Connect your AI Agent

### Claude Code
```bash
claude mcp add --transport http palmier-pro http://127.0.0.1:19789/mcp
```

### Cursor
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "palmier-pro": {
      "type": "http",
      "url": "http://127.0.0.1:19789/mcp"
    }
  }
}
```

### Claude Desktop
```json
{
  "mcpServers": {
    "palmier-pro": {
      "url": "http://127.0.0.1:19789/mcp"
    }
  }
}
```

## 🖥️ System Tray

- Closing the editor window **does not stop the app** — it minimizes to the system tray
- The MCP server **keeps running** in the background on port 19789
- This lets Claude/Cursor continue working on your project even without the editor window open
- To fully quit: **right-click** the tray icon → **Quit**

## ✨ Features

- **Full video editor**: timeline, preview, inspector, media panel
- **42 MCP tools** (100% match with macOS original)
- **System tray** integration for background operation
- **Undo/Redo** (Ctrl+Z / Ctrl+Shift+Z)
- **Color grading**: 3 color wheels, curves, 20 effects
- **Built-in agent chat** panel
- **No Node.js or installation required** — everything is bundled

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play/Pause |
| `S` | Split at playhead |
| `Delete` | Delete clip |
| `V` | Select tool |
| `B` | Razor tool |
| `R` | Ripple Trim |
| `I` / `O` | Mark In/Out |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save project |
| `Ctrl+E` | Export |
| `Home` / `End` | Jump to start/end |
| `←` / `→` | Step one frame |

## 📋 System Requirements

- Windows 10 (version 1903+) or Windows 11
- 2 GB free RAM
- No other software required

## 📄 License

GPLv3 — Copyright (C) 2026 Palmier, Inc.
