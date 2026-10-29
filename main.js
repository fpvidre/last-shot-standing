const { app, BrowserWindow, ipcMain, shell, nativeTheme, Menu, net, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const { Readable } = require('stream');
const { sortFiles, unsortFiles } = require('./sort');
const { walkShoot, writeAtomic, writeAtomicSync, readSave, SAVE_NAME } = require('./shoot');

// lss:// reads photo bytes straight from disk, but only inside shoots the user opened.
protocol.registerSchemesAsPrivileged([{ scheme: 'lss', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const roots = new Set();
function allowed(p) {
  const r = path.resolve(p);
  for (const root of roots) if (r === root || r.startsWith(root + path.sep)) return true;
  return false;
}
const statePath = () => path.join(app.getPath('userData'), 'state.json');
function readState() { try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch { return {}; } }
function writeState(s) { try { writeAtomicSync(statePath(), JSON.stringify(s)); } catch {} }

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

// Progress: a save file inside the shoot folder, written safely to disk.
ipcMain.handle('lss:remember', (_e, root) => {
  if (typeof root !== 'string' || !root) return false;
  roots.add(path.resolve(root));
  writeState({ ...readState(), lastRoot: path.resolve(root) });
  return true;
});
ipcMain.handle('lss:last-shoot', async () => {
  const root = readState().lastRoot;
  if (!root) return null;
  try { if (!(await fsp.stat(root)).isDirectory()) return null; } catch { return null; }
  roots.add(path.resolve(root));
  const files = await walkShoot(root);
  return files.length ? { root, name: path.basename(root), files } : null;
});
ipcMain.handle('lss:load-save', (_e, root) => (typeof root === 'string' && allowed(root) ? readSave(root) : null));
ipcMain.handle('lss:save', async (_e, { root, data }) => {
  if (typeof root !== 'string' || typeof data !== 'string' || !allowed(root)) return false;
  try { await writeAtomic(path.join(root, SAVE_NAME), data); return true; } catch { return false; }
});
ipcMain.on('lss:save-sync', (e, { root, data }) => {
  let ok = false;
  if (typeof root === 'string' && typeof data === 'string' && allowed(root)) {
    try { writeAtomicSync(path.join(root, SAVE_NAME), data); ok = true; } catch {}
  }
  e.returnValue = ok;
});

ipcMain.handle('lss:sort', (_e, job) => sortFiles(job));
ipcMain.handle('lss:unsort', (_e, moves) => unsortFiles(moves));
ipcMain.handle('lss:reveal', (_e, p) => shell.openPath(p));

app.setName('Last Shot Standing');
app.whenReady().then(() => {
  protocol.handle('lss', async (req) => {
    const u = new URL(req.url);
    const p = u.searchParams.get('p');
    if (!p || !allowed(p)) return new Response('Not allowed', { status: 403 });
    try {
      const st = await fsp.stat(p);
      const s = u.searchParams.has('s') ? Math.max(0, Number(u.searchParams.get('s'))) : 0;
      const end = u.searchParams.has('e') ? Math.min(st.size, Number(u.searchParams.get('e'))) : st.size;
      const len = Math.max(0, end - s);
      const body = len ? Readable.toWeb(fs.createReadStream(p, { start: s, end: s + len - 1 })) : null;
      return new Response(body, { headers: { 'content-type': u.searchParams.get('t') || 'application/octet-stream', 'content-length': String(len) } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
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
