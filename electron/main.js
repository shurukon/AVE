/**
 * Palmier Pro for Windows — Electron main process.
 *
 * Responsibilities:
 *   1. Spawn the bundled MCP HTTP server (Node.js) on port 19789.
 *   2. Open a BrowserWindow that loads the Next.js renderer (dev: localhost:3000,
 *      production: the static export bundled inside the app).
 *   3. Wire native menu, file dialogs, and FFmpeg-based export IPC.
 *
 * The MCP server is a child Node process so it inherits our runtime — no
 * need to ship a separate node binary. On Windows we use `process.execPath`
 * with ELECTRON_RUN_AS_NODE to launch it.
 */

const {
  app,
  BrowserWindow,
  Menu,
  shell,
  ipcMain,
  dialog,
} = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");

const isDev = process.env.NODE_ENV === "development" || !!process.env.PALMIER_DEV;
const MCP_PORT = Number(process.env.PALMIER_MCP_PORT) || 19789;

let mainWindow = null;
let mcpProcess = null;

// ---------------------------------------------------------------------------
// MCP server lifecycle
// ---------------------------------------------------------------------------

function isPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(true))
      .once("listening", () => {
        tester.close(() => resolve(false));
      })
      .listen(port, "127.0.0.1");
  });
}

async function startMcpServer() {
  // If something is already on the port, assume it's our server (or another MCP
  // server) and just reuse it. We don't want to crash on double-launch.
  if (await isPortInUse(MCP_PORT)) {
    console.log(`[main] Port ${MCP_PORT} already in use — assuming MCP server is up.`);
    return;
  }

  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "mcp-server", "server.js")
    : path.join(__dirname, "..", "mcp-server", "server.js");

  if (!fs.existsSync(serverPath)) {
    console.warn(`[main] MCP server not found at ${serverPath}`);
    return;
  }

  // Use Electron's own node runtime to run the MCP server
  const env = { ...process.env, PALMIER_MCP_PORT: String(MCP_PORT) };
  mcpProcess = spawn(process.execPath, [serverPath], {
    env: { ...env, ELECTRON_RUN_AS_NODE: "1" },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  mcpProcess.stdout?.on("data", (d) =>
    process.stdout.write(`[mcp] ${d.toString()}`),
  );
  mcpProcess.stderr?.on("data", (d) =>
    process.stderr.write(`[mcp:err] ${d.toString()}`),
  );
  mcpProcess.on("exit", (code) =>
    console.log(`[main] MCP server exited with code ${code}`),
  );

  console.log(`[main] MCP server started on port ${MCP_PORT}`);
}

function stopMcpServer() {
  if (!mcpProcess) return;
  try {
    mcpProcess.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  mcpProcess = null;
}

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: "#0a0a0c",
    title: "Palmier Pro",
    titleBarStyle: process.platform === "win32" ? "default" : "hiddenInset",
    autoHideMenuBar: false,
    icon: path.join(__dirname, "icons", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "renderer", "index.html");
    mainWindow.loadFile(indexPath);
  }

  // Open external links in the user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Project",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.send("menu:new-project"),
        },
        {
          label: "Open Project…",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const r = await dialog.showOpenDialog(mainWindow, {
              title: "Open Palmier Project",
              filters: [{ name: "Palmier Project", extensions: ["json"] }],
              properties: ["openFile"],
            });
            if (!r.canceled && r.filePaths[0]) {
              mainWindow?.webContents.send("menu:open-project", r.filePaths[0]);
            }
          },
        },
        {
          label: "Save Project…",
          accelerator: "CmdOrCtrl+S",
          click: () => mainWindow?.webContents.send("menu:save-project"),
        },
        { type: "separator" },
        {
          label: "Export…",
          accelerator: "CmdOrCtrl+E",
          click: () => mainWindow?.webContents.send("menu:export"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ].filter(Boolean),
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { type: "separator" },
        {
          label: "Split at Playhead",
          accelerator: "S",
          click: () => mainWindow?.webContents.send("menu:split"),
        },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "MCP Instructions",
          click: () => mainWindow?.webContents.send("menu:mcp-help"),
        },
        {
          label: "Keyboard Shortcuts",
          click: () => mainWindow?.webContents.send("menu:shortcuts"),
        },
        { type: "separator" },
        {
          label: "Open Source on GitHub",
          click: () =>
            shell.openExternal("https://github.com/palmier-io/palmier-pro"),
        },
        {
          label: "About Palmier Pro",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "About Palmier Pro",
              message: "Palmier Pro for Windows",
              detail:
                "v1.0.0\n\nThe video editor built for AI.\nA Windows 10 port of the macOS Swift app.\n\nMCP server: http://127.0.0.1:19789/mcp\n\nCopyright (C) 2026 Palmier, Inc.\nLicensed under GPLv3.",
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------
// IPC: file dialogs, FFmpeg spawn
// ---------------------------------------------------------------------------

ipcMain.handle("dialog:openMedia", async () => {
  const r = await dialog.showOpenDialog(mainWindow, {
    title: "Import Media",
    filters: [
      { name: "Media", extensions: ["mp4", "mov", "webm", "mkv", "mp3", "wav", "png", "jpg", "jpeg", "gif"] },
    ],
    properties: ["openFile", "multiSelections"],
  });
  if (r.canceled) return [];
  return r.filePaths;
});

ipcMain.handle("dialog:saveProject", async () => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: "Save Palmier Project",
    defaultPath: "project.palmier.json",
    filters: [{ name: "Palmier Project", extensions: ["json"] }],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle("dialog:exportVideo", async () => {
  const r = await dialog.showSaveDialog(mainWindow, {
    title: "Export Video",
    defaultPath: "output.mp4",
    filters: [
      { name: "MP4 Video", extensions: ["mp4"] },
      { name: "WebM Video", extensions: ["webm"] },
      { name: "QuickTime Movie", extensions: ["mov"] },
    ],
  });
  return r.canceled ? null : r.filePath;
});

ipcMain.handle("fs:writeFile", async (_e, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, "utf8");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("fs:readFile", async (_e, filePath) => {
  try {
    return { ok: true, content: fs.readFileSync(filePath, "utf8") };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("mcp:port", () => MCP_PORT);

// Spawn FFmpeg (bundled or system) to actually render a project.
// In v1 we only return the command; running it requires shipping ffmpeg.exe.
ipcMain.handle("ffmpeg:run", async (_e, args) => {
  // Try to use a bundled ffmpeg.exe first, then fall back to system ffmpeg
  const candidates = [
    app.isPackaged
      ? path.join(process.resourcesPath, "ffmpeg", "ffmpeg.exe")
      : path.join(__dirname, "ffmpeg", "ffmpeg.exe"),
    "ffmpeg", // system PATH
  ];
  let exe = null;
  for (const c of candidates) {
    try {
      fs.accessSync(c, fs.constants.X_OK);
      exe = c;
      break;
    } catch {
      /* try next */
    }
  }
  if (!exe) {
    return {
      ok: false,
      error:
        "FFmpeg not found. Install FFmpeg (https://ffmpeg.org/download.html) and add it to your PATH, or drop ffmpeg.exe next to PalmierPro.exe.",
    };
  }
  return new Promise((resolve) => {
    const p = spawn(exe, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) =>
      resolve({ ok: code === 0, code, stdout, stderr }),
    );
    p.on("error", (e) => resolve({ ok: false, error: e.message }));
  });
});

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  await startMcpServer();
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopMcpServer();
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  stopMcpServer();
});
