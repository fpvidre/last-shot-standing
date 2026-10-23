const { app, BrowserWindow, ipcMain, shell, nativeTheme, Menu, net } = require('electron');
const path = require('path');
const { sortFiles, unsortFiles } = require('./sort');

const RELEASES = 'https://github.com/fpvidre/last-shot-standing/releases/latest';

function isNewer(a, b) {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0); }
  return false;
}

// Windows: downloads new versions quietly and installs them on restart.
// Mac: installing automatically needs Apple code signing, so the app checks
// GitHub and offers the new download instead.
async function checkForUpdates(win) {
  if (!app.isPackaged) return;
  const tell = (msg) => { if (!win.isDestroyed()) win.webContents.send('lss:update', msg); };
  if (process.platform === 'win32') {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.on('update-downloaded', (info) => tell({ version: info.version, ready: true }));
      ipcMain.handle('lss:update-install', () => autoUpdater.quitAndInstall());
      await autoUpdater.checkForUpdates();
    } catch {}
    return;
  }
  try {
    const res = await net.fetch('https://api.github.com/repos/fpvidre/last-shot-standing/releases/latest', {
      headers: { 'User-Agent': 'Last-Shot-Standing', Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) return;
    const latest = await res.json();
    const version = String(latest.tag_name || '').replace(/^v/, '');
    if (version && isNewer(version, app.getVersion())) tell({ version, current: app.getVersion(), url: latest.html_url || RELEASES });
  } catch {}
}

function createWindow() {
  nativeTheme.themeSource = 'dark';
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'Last Shot Standing',
    backgroundColor: '#141414',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // Links to websites open in the browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.webContents.once('did-finish-load', () => setTimeout(() => checkForUpdates(win), 3000));
}

ipcMain.handle('lss:open-download', (_e, url) => {
  if (typeof url === 'string' && url.startsWith('https://github.com/fpvidre/last-shot-standing/')) shell.openExternal(url);
});

ipcMain.handle('lss:sort', (_e, job) => sortFiles(job));
ipcMain.handle('lss:unsort', (_e, moves) => unsortFiles(moves));
ipcMain.handle('lss:reveal', (_e, p) => shell.openPath(p));

app.setName('Last Shot Standing');
app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { role: 'appMenu' },
      { role: 'editMenu' },
      { label: 'View', submenu: [{ role: 'togglefullscreen' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }] },
      { role: 'windowMenu' },
    ]));
  } else {
    Menu.setApplicationMenu(null);
  }
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
