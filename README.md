# Palmier Pro for Windows 10

**محرر الفيديو المصمم لعصر الذكاء الاصطناعي — نسخة Windows 10**

هذه نسخة محمولة من تطبيق Palmier Pro (الأصلي macOS Swift) تعمل على Windows 10.
تم بناؤها باستخدام Electron + Next.js + Node.js MCP server للحفاظ على نفس
وظائف المحرر وخادم MCP ولوحة الـ Agent.

---

## ما الذي يدعمه هذا التطبيق؟

### محرر الفيديو الكامل
- Timeline متعدد المسارات (فيديو / صوت / نص)
- Preview Panel مع تشغيل حقيقي للفيديو والصوت
- Inspector لتعديل خصائص المقاطع (transform, opacity, speed, fades, text style)
- Media Panel لاستيراد MP4 / MOV / WebM / MP3 / WAV / PNG / JPG
- أدوات: قص (split), حذف, نقل, تقليم (trim), تكبير/تصغير
- اختصارات لوحة المفاتيح: Space للتشغيل, S للقص, Delete للحذف

### خادم MCP (متعدد المنصات)
- يعمل على `http://127.0.0.1:19789/mcp`
- يدعم نفس أدوات macOS الأصلي:
  - `get_timeline`, `get_media`, `inspect_media`
  - `add_clips`, `remove_clips`, `move_clips`, `split_clips`
  - `set_clip_properties`, `ripple_delete_ranges`
  - `add_texts`, `add_captions`, `remove_words`
  - `apply_color`, `apply_effect`, `sync_audio`
  - `export_project`, `set_project_settings`
  - `generate_video`/`image`/`audio` (تتطلب اشتراك Palmier)

### لوحة الـ Agent
- دردشة مدمجة مع مساعد Palmier
- يقترح أوامر MCP لتنفيذها على الـ timeline
- ينسخ رابط MCP بضغطة زر

---

## التشغيل السريع (بدون تثبيت)

### المتطلبات
- Windows 10 (إصدار 1903 أو أحدث) أو Windows 11
- Node.js 18+ (للتشغيل من المصدر فقط) — https://nodejs.org/

### الطريقة 1: النسخة المحمولة (Portables)
1. حمّل `PalmierPro-Windows-1.0.0-Portable.exe`
2. ضعه في أي مجلد
3. شغّله — لا حاجة لأي تثبيت

### الطريقة 2: المثبت (NSIS)
1. حمّل `PalmierPro-Windows-1.0.0-x64.exe`
2. شغّله واتبع خطوات التثبيت
3. اختصار سيُضاف لسطح المكتب وقائمة ابدأ

---

## ربط مع Claude / Cursor / Codex

### Claude Code
```bash
claude mcp add --transport http palmier-pro http://127.0.0.1:19789/mcp
```

### Codex
```bash
codex mcp add palmier-pro --url http://127.0.0.1:19789/mcp
```

### Cursor
أضف هذا إلى `~/.cursor/mcp.json`:
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
أضف إلى `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "palmier-pro": {
      "url": "http://127.0.0.1:19789/mcp"
    }
  }
}
```

---

## البناء من المصدر (للمطورين)

```bash
# 1. استنسخ المستودع
git clone https://github.com/palmier-io/palmier-pro.git
cd palmier-pro

# 2. ثبّت الـ dependencies للمشروع الأمامي
npm install

# 3. ثبّت Electron
cd electron
npm install
cd ..

# 4. على Windows: شغّل build-windows.bat
electron\build-windows.bat
```

الناتج سيكون في `electron\release\`:
- `PalmierPro-Windows-1.0.0-x64.exe` — NSIS installer
- `PalmierPro-Windows-1.0.0-Portable.exe` — portable build

---

## اختصارات لوحة المفاتيح

| الاختصار | الوظيفة |
|----------|---------|
| `Space` | تشغيل / إيقاف |
| `S` | قص المقطع عند رأس التشغيل |
| `Delete` / `Backspace` | حذف المقطع المحدد |
| `Ctrl+N` | مشروع جديد |
| `Ctrl+O` | فتح مشروع |
| `Ctrl+S` | حفظ المشروع |
| `Ctrl+E` | تصدير |

---

## الاختلافات عن نسخة macOS

| الميزة | macOS (الأصلي) | Windows (هذه النسخة) |
|--------|----------------|---------------------|
| اللغة | Swift 6.2 | TypeScript / Node.js |
| الواجهة | SwiftUI + AppKit | Next.js + React + Tailwind |
| معالجة الفيديو | AVFoundation | FFmpeg (يُحمّل منفصلاً) |
| GPU shaders | Metal | (يُترك لـ FFmpeg) |
| Transcription | على الجهاز (Speech framework) | عبر MCP خارجي |
| Visual search | على الجهاز (SigLIP2) | غير مُضمّن |
| Generative AI | متطلب اشتراك | متطلب اشتراك |
| MCP server | Swift MCP SDK | Node.js HTTP (نفس المنفذ 19789) |

---

## استكشاف الأخطاء

### التطبيق لا يفتح
- تأكد من تثبيت Node.js 18+ على الأقل
- على Windows 10، تأكد من تفعيل Windows Update (إصدار 1903+)
- شغّل التطبيق كمسؤول لمرة واحدة إذا لم يفتح

### MCP server لا يعمل
- تحقق أن المنفذ 19789 غير مستخدم: `netstat -ano | findstr :19789`
- أعد تشغيل التطبيق
- افتح المتصفح على `http://127.0.0.1:19789/health` — يجب أن ترى `{"ok":true,...}`

### Claude/Cursor لا يتصل
- تأكد أن التطبيق يعمل (MCP server يبدأ معه)
- تأكد أن رابط MCP هو `http://127.0.0.1:19789/mcp` وليس https
- أعد تشغيل Claude/Cursor بعد إضافة الـ MCP

### التصدير لا يُنتج ملف فيديو
- التصدير يحتاج FFmpeg — حمّله من https://ffmpeg.org/download.html
- ضع `ffmpeg.exe` بجانب `PalmierPro.exe` أو أضفه إلى PATH

---

## الترخيص
GPLv3 — نفس ترخيص المشروع الأصلي.
Copyright (C) 2026 Palmier, Inc.
