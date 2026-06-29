# Palmier Pro for Windows — Portable .exe

## التحميل المباشر

**[PalmierPro-Windows-1.0.0-Portable.exe](./PalmierPro-Windows-1.0.0-Portable.exe)** (83 MB)

## كيفية الاستخدام

### 1. التشغيل
- حمّل ملف `PalmierPro-Windows-1.0.0-Portable.exe`
- ضعه في أي مجلد (مثل سطح المكتب)
- **انقر مزدوجاً لتشغيله** — لا يحتاج تثبيت

### 2. ما يحدث عند التشغيل
عند فتح الـ .exe:
1. **يستخرج نفسه** تلقائياً إلى مجلد مؤقت (بضغطة واحدة)
2. **يبدأ خادم MCP** على `http://127.0.0.1:19789/mcp` في الخلفية
3. **يبدأ خادم الويب** على `http://localhost:3000` في الخلفية
4. **يفتح نافذة المحرر** — جاهز للاستخدام الفوري
5. **يظهر أيقونة في شريط المهام** (system tray) — تبقى تعمل في الخلفية

### 3. الاستخدام المباشر (Manual Editing)
- استخدم المحرر كأي محرر فيديو: استورد ملفات، أضف مقاطع للـ timeline، عدّل الألوان، أضف نصوصاً، صدّر الفيديو
- كل التعديلات تظهر **live** في نافذة المعاينة (Preview)

### 4. الاستخدام عبر MCP (Agent-Driven)
- اربط Claude Code / Cursor / Codex بخادم MCP:
  ```
  http://127.0.0.1:19789/mcp
  ```
- اطلب من المساعد إجراء تعديلات: "أضف نصاً"، "اقسم المقطع"، "طبّق LUT دافئ"
- **شاهد التعديلات تظهر live** في نافذة المحرر أثناء عمل المساعد

### 5. التشغيل في الخلفية (System Tray)
- عند إغلاق نافذة المحرر (X)، **لا يتوقف التطبيق** — بل يختفي إلى شريط المهام
- خادم MCP **يستمر في العمل** في الخلفية على المنفذ 19789
- هذا يتيح لـ Claude/Cursor مواصلة العمل على المشروع حتى بدون نافذة المحرر مفتوحة

### 6. الإيقاف الكامل
- **انقر يميناً** على أيقونة Palmier Pro في شريط المهام
- اختر **"Quit"** — هذا يوقف الخوادم ويغلق التطبيق بالكامل

## قائمة شريط المهام (Tray Menu)

| الخيار | الوظيفة |
|-------|---------|
| **Show Editor** | إظهار نافذة المحرر |
| **MCP Server: http://127.0.0.1:19789/mcp** | عرض حالة الخادم (معطّل للنسخ) |
| **Copy MCP URL** | نسخ رابط MCP للحافظة |
| **Open in Browser** | فتح المحرر في المتصفح |
| **About Palmier Pro** | معلومات التطبيق |
| **Quit** | إيقاف كامل (يوقف الخوادم) |

## ربط MCP مع المساعدات

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

### Codex
```bash
codex mcp add palmier-pro --url http://127.0.0.1:19789/mcp
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

## المتطلبات
- Windows 10 (إصدار 1903+) أو Windows 11
- **لا حاجة لتثبيت Node.js** — كل شيء مضمّن في الـ .exe
- **لا حاجة لتثبيت أي شيء** — التطبيق محمول بالكامل

## الميزات

### محرر الفيديو الكامل
- Timeline متعدد المسارات (فيديو / صوت / نص)
- Preview مع تشغيل حقيقي + scopes (Histogram / Waveform / Vectorscope)
- Inspector مع color grading (3 color wheels + curves + 20 effects)
- Media Panel مع folders وdrag-drop
- اختصارات لوحة مفاتيح كاملة

### خادم MCP (42 أداة)
- 40 أداة عامة (مطابقة 100% لنسخة macOS الأصلية)
- 2 أداة داخلية للمزامنة
- يدعم: get_timeline, add_clips, add_texts, apply_color, apply_effect, export_project, وغيرها

### Undo/Redo
- تاريخ كامل (up to 50 snapshots)
- Ctrl+Z / Ctrl+Shift+Z

### لوحة الـ Agent
- دردشة مدمجة مع مساعد Palmier
- اقتراحات سياقية
- عرض حالة MCP live

## استكشاف الأخطاء

**التطبيق لا يفتح؟**
- انتظر 30 ثانية — أول تشغيل يستغرق وقتاً للاستخراج
- تحقق من Task Manager أن `PalmierPro.exe` يعمل

**MCP server لا يعمل؟**
- تحقق من `http://127.0.0.1:19789/health` في المتصفح
- أعد تشغيل التطبيق من شريط المهام (Quit ثم أعد فتح الـ .exe)

**المنفذ 3000 أو 19789 مستخدم؟**
- أوقف أي تطبيق آخر يستخدم هذه المنافذ
- أو: شغّل التطبيق من موجه الأوامر مع متغيرات بيئة:
  ```
  set PALMIER_WEB_PORT=3001
  set PALMIER_MCP_PORT=19790
  PalmierPro-Windows-1.0.0-Portable.exe
  ```

## الترخيص
GPLv3 — Copyright (C) 2026 Palmier, Inc.
