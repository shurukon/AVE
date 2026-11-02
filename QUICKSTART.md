# Palmier Pro for Windows 10 — Quick Start

## التشغيل السريع (3 خطوات)

1. **ثبّت Node.js 18+** من https://nodejs.org/ (إذا لم يكن مثبتاً)
2. **فك ضغط** `PalmierPro-Windows-1.0.0.zip` في أي مجلد
3. **شغّل** `start.bat` (نقر مزدوج)

سيفتح هذا المتصفح على `http://localhost:3000` تلقائياً.

## ماذا سيحدث عند التشغيل؟

- سيتم تثبيت الـ dependencies تلقائياً (لمرة واحدة فقط، يستغرق 2-3 دقائق)
- سيبدأ خادم MCP على المنفذ 19789
- سيبدأ خادم الويب على المنفذ 3000
- سيفتح المتصفح على التطبيق

## ربط مع Claude / Cursor / Codex

بعد تشغيل التطبيق، اربط مساعدك الذكي بخادم MCP:

### Claude Code
```bash
claude mcp add --transport http palmier-pro http://127.0.0.1:19789/mcp
```

### Cursor
أضف إلى `~/.cursor/mcp.json`:
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

## اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|----------|---------|
| `Space` | تشغيل / إيقاف |
| `S` | قص المقطع |
| `Delete` | حذف المقطع |
| `Ctrl+S` | حفظ المشروع |
| `Ctrl+E` | تصدير |

## بناء نسخة .exe (اختياري)

إذا أردت إنشاء مثبت Windows (.exe)، شغّل من داخل مجلد `electron/`:
```
build-windows.bat
```

الناتج سيكون في `electron/release/`:
- `PalmierPro-Windows-1.0.0-x64.exe` — NSIS installer
- `PalmierPro-Windows-1.0.0-Portable.exe` — portable build

## استكشاف الأخطاء

**المتصفح لا يفتح تلقائياً؟** افتح `http://localhost:3000` يدوياً.

**منفذ 3000 مستخدم؟** عدّل `package.json` → `scripts.dev` إلى `next dev -p 3001`.

**MCP server لا يعمل؟** تحقق من `http://127.0.0.1:19789/health` — يجب أن ترى `{"ok":true}`.

**أخطاء تثبيت npm؟** شغّل `npm install` يدوياً في المجلد الجذر.

## الدعم
- GitHub: https://github.com/palmier-io/palmier-pro
- Discord: https://discord.com/invite/SMVW6pKYmg
- الترخيص: GPLv3
