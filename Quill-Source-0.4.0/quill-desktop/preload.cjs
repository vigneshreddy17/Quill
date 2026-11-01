const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  onClose: (cb) => ipcRenderer.on("prepare-close", () => cb()),
  closeReady: () => ipcRenderer.send("close-ready"),
  setTheme: (theme) => ipcRenderer.invoke("set-theme", theme),
  load: () => ipcRenderer.invoke("load"),
  save: (data) => ipcRenderer.invoke("save", data),
  export: (data) => ipcRenderer.invoke("export", data),
  exportBinary: (data) => ipcRenderer.invoke("export-binary", data),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  print: () => ipcRenderer.invoke("print"),
  printPDF: () => ipcRenderer.invoke("print-pdf"),
});
