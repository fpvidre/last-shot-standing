const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('lss', {
  desktop: true,
  platform: process.platform,
  pathFor: (file) => { try { return webUtils.getPathForFile(file) || ''; } catch { return ''; } },
  sort: (job) => ipcRenderer.invoke('lss:sort', job),
  unsort: (moves) => ipcRenderer.invoke('lss:unsort', moves),
  reveal: (p) => ipcRenderer.invoke('lss:reveal', p),
  onUpdate: (cb) => ipcRenderer.on('lss:update', (_e, info) => cb(info)),
  openDownload: (url) => ipcRenderer.invoke('lss:open-download', url),
  installUpdate: () => ipcRenderer.invoke('lss:update-install'),
});
