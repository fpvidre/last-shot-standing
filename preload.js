const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('lss', {
  desktop: true,
  platform: process.platform,
  pathFor: (file) => { try { return webUtils.getPathForFile(file) || ''; } catch { return ''; } },
  sort: (job) => ipcRenderer.invoke('lss:sort', job),
  unsort: (moves) => ipcRenderer.invoke('lss:unsort', moves),
  reveal: (p) => ipcRenderer.invoke('lss:reveal', p),
});
