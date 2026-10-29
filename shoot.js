// Shoot folders on disk: finding the photos, and keeping a crash-safe save file.
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const SAVE_NAME = '.lastshotstanding.json';
const EXT = new Set(['arw', 'srf', 'sr2', 'cr2', 'cr3', 'crw', 'nef', 'nrw', 'raf', 'dng', 'orf', 'rw2', 'rwl', 'pef', '3fr', 'fff', 'iiq', 'raw', 'x3f', 'jpg', 'jpeg', 'heic', 'heif', 'png', 'webp']);

/** Every supported photo under root, skipping hidden files and the _Rejects folder. */
async function walkShoot(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const d of entries) {
      if (d.name.startsWith('.')) continue;
      const p = path.join(dir, d.name);
      if (d.isDirectory()) { if (d.name !== '_Rejects') await walk(p); continue; }
      if (!d.isFile() || !EXT.has(path.extname(d.name).slice(1).toLowerCase())) continue;
      try {
        const st = await fsp.stat(p);
        out.push({ abs: p, rel: path.relative(root, p).split(path.sep).join('/'), name: d.name, size: st.size });
      } catch {}
    }
  }
  await walk(root);
  return out;
}

/** Write to a temp file, flush it to the disk, then swap it in, so a crash never leaves half a file. */
async function writeAtomic(file, data) {
  const tmp = `${file}.tmp`;
  const fh = await fsp.open(tmp, 'w');
  try { await fh.writeFile(data, 'utf8'); await fh.sync(); } finally { await fh.close(); }
  await fsp.rename(tmp, file);
}

function writeAtomicSync(file, data) {
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeFileSync(fd, data, 'utf8'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}

async function readSave(root) {
  try {
    const d = JSON.parse(await fsp.readFile(path.join(root, SAVE_NAME), 'utf8'));
    return d && d.app === 'Last Shot Standing' ? d : null;
  } catch { return null; }
}

module.exports = { walkShoot, writeAtomic, writeAtomicSync, readSave, SAVE_NAME };
