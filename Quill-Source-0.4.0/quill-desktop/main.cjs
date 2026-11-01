const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  nativeTheme,
  Menu,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { Store } = require("./store.cjs");
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    const store = new Store(
      path.join(app.getPath("userData"), "workspace.json"),
    );
    let closing = false;
    const win = new BrowserWindow({
      width: 1400,
      height: 940,
      minWidth: 1000,
      minHeight: 650,
      backgroundColor: "#121212",
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    app.on("second-instance", () => {
      if (win.isMinimized()) win.restore();
      win.focus();
    });
    const own = (event) => {
      if (event.sender !== win.webContents) throw Error("Invalid sender");
    };
    const safeName = (name) =>
      String(name || "Untitled")
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
        .slice(0, 180);
    ipcMain.handle("set-theme", (event, theme) => {
      own(event);
      if (!["light", "dark", "system"].includes(theme))
        throw Error("Invalid theme");
      nativeTheme.themeSource = theme;
      win.setBackgroundColor(
        nativeTheme.shouldUseDarkColors ? "#121212" : "#ffffff",
      );
      return true;
    });
    ipcMain.handle("load", (event) => {
      own(event);
      return store.load();
    });
    ipcMain.handle("save", (event, data) => {
      own(event);
      return store.save(data);
    });
    ipcMain.handle("export", async (event, payload) => {
      own(event);
      if (
        !["html", "txt", "json", "csv", "md"].includes(payload.extension) ||
        typeof payload.text !== "string"
      )
        throw Error("Invalid export");
      const result = await dialog.showSaveDialog(win, {
        defaultPath: safeName(payload.name) + "." + payload.extension,
      });
      if (result.canceled) return false;
      fs.writeFileSync(result.filePath, payload.text, "utf8");
      return true;
    });
    ipcMain.handle("export-binary", async (event, payload) => {
      own(event);
      if (
        typeof payload.data !== "string" ||
        !/^data:[^,]*;base64,/.test(payload.data)
      )
        throw Error("Invalid attachment");
      const result = await dialog.showSaveDialog(win, {
        defaultPath: safeName(payload.name),
      });
      if (result.canceled) return false;
      fs.writeFileSync(
        result.filePath,
        Buffer.from(payload.data.split(",")[1], "base64"),
      );
      return true;
    });
    ipcMain.handle("open-external", async (event, value) => {
      own(event);
      const url = new URL(value);
      if (!["https:", "http:", "mailto:"].includes(url.protocol))
        throw Error("Unsupported link");
      return shell.openExternal(url.href);
    });
    ipcMain.handle("print", async (event) => {
      own(event);
      return new Promise((resolve, reject) =>
        win.webContents.print({ printBackground: false }, (success, reason) =>
          success
            ? resolve(true)
            : reason === "cancelled"
              ? resolve(false)
              : reject(Error(reason)),
        ),
      );
    });
    ipcMain.handle("print-pdf", async (event) => {
      own(event);
      const result = await dialog.showSaveDialog(win, {
        defaultPath: "Document.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }],
      });
      if (result.canceled) return false;
      const pdf = await win.webContents.printToPDF({
        printBackground: false,
        preferCSSPageSize: true,
      });
      fs.writeFileSync(result.filePath, pdf);
      return true;
    });
    win.on("close", (e) => {
      if (!closing) {
        e.preventDefault();
        win.webContents.send("prepare-close");
      }
    });
    ipcMain.on("close-ready", (event) => {
      own(event);
      closing = true;
      win.close();
    });
    win.setMenuBarVisibility(false);
    win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    win.webContents.on("will-navigate", (e) => e.preventDefault());
    win.webContents.session.setPermissionRequestHandler(
      (_wc, _permission, cb) => cb(false),
    );
    win.loadFile("dist/index.html");
  });
app.on("window-all-closed", () => app.quit());
