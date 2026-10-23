// Moves culled frames (and same-name companions like .JPG / .XMP) into a folder.
// Nothing is ever deleted. A frame only moves if its size still matches the cull.
const fs = require('fs/promises');
const path = require('path');

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

async function uniqueTarget(dest, name) {
  let target = path.join(dest, name);
  const { name: stem, ext } = path.parse(name);
  let n = 2;
  while (await exists(target)) target = path.join(dest, `${stem}_${n++}${ext}`);
  return target;
}

async function moveOne(from, to) {
  try {
    await fs.rename(from, to);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    await fs.copyFile(from, to);
    await fs.unlink(from);
  }
}

/**
 * @param {{files: {path: string, size: number}[], root: string, destName: string}} job
 * @returns {Promise<{frames:number, moved:number, missing:number, dest:string, moves:{from:string,to:string}[]}>}
 */
async function sortFiles({ files, root, destName }) {
  const dest = path.join(root, destName);
  await fs.mkdir(dest, { recursive: true });
  const moves = [];
  let frames = 0, missing = 0;
  for (const f of files) {
    let st;
    try { st = await fs.stat(f.path); } catch { missing++; continue; }
    if (!st.isFile() || st.size !== f.size) { missing++; continue; }
    frames++;
    const dir = path.dirname(f.path);
    const fileName = path.basename(f.path);
    const stem = path.parse(fileName).name;
    const siblings = (await fs.readdir(dir)).filter((n) => path.parse(n).name === stem || n.startsWith(fileName + '.'));
    for (const n of siblings) {
      const from = path.join(dir, n);
      if (path.resolve(path.dirname(from)) === path.resolve(dest)) continue;
      const to = await uniqueTarget(dest, n);
      await moveOne(from, to);
      moves.push({ from, to });
    }
  }
  if (!moves.length) { try { await fs.rmdir(dest); } catch {} }
  return { frames, moved: moves.length, missing, dest, moves };
}

/** Puts files back where they came from. */
async function unsortFiles(moves) {
  let restored = 0;
  for (const m of [...moves].reverse()) {
    if (await exists(m.from)) continue;
    try { await moveOne(m.to, m.from); restored++; } catch {}
  }
  for (const d of new Set(moves.map((m) => path.dirname(m.to)))) { try { await fs.rmdir(d); } catch {} }
  return { restored };
}

module.exports = { sortFiles, unsortFiles };
