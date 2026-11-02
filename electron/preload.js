/**
 * Palmier Pro — preload script.
 *
 * Exposes a tiny, well-typed `palmier` API to the renderer:
 *   - dialog.openMedia()          → string[] (absolute paths)
 *   - dialog.saveProject()        → string | null
 *   - dialog.exportVideo()        → string | null
 *   - fs.writeFile(path, content) → { ok: boolean }
 *   - fs.readFile(path)           → { ok: boolean, content?: string }
 *   - mcp.port()                  → number
 *   - ffmpeg.run(args)            → { ok, stdout, stderr }
 *   - menu events via EventTarget (menu:new-project, menu:save-project, ...)
 *
 * Nothing else from Node is reachable — contextIsolation stays on.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("palmier", {
  dialog: {
    openMedia: () => ipcRenderer.invoke("dialog:openMedia"),
    saveProject: () => ipcRenderer.invoke("dialog:saveProject"),
    exportVideo: () => ipcRenderer.invoke("dialog:exportVideo"),
  },
  fs: {
    writeFile: (p, c) => ipcRenderer.invoke("fs:writeFile", p, c),
    readFile: (p) => ipcRenderer.invoke("fs:readFile", p),
  },
  mcp: {
    port: () => ipcRenderer.invoke("mcp:port"),
  },
  ffmpeg: {
    run: (args) => ipcRenderer.invoke("ffmpeg:run", args),
  },
  onMenu: (channel, cb) => {
    const valid = [
      "menu:new-project",
      "menu:open-project",
      "menu:save-project",
      "menu:export",
      "menu:split",
      "menu:mcp-help",
      "menu:shortcuts",
    ];
    if (!valid.includes(channel)) return;
    ipcRenderer.on(channel, (_e, payload) => cb(payload));
  },
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
});
