// Checks the folder sorting: matching files move with their companions, changed files stay, undo restores.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { sortFiles, unsortFiles } = require('../sort');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lss-'));
  const card = path.join(root, 'DCIM', '100MSDCF');
  fs.mkdirSync(card, { recursive: true });
  const write = (n, body) => { fs.writeFileSync(path.join(card, n), body); return path.join(card, n); };
  const a = write('DSC0001.ARW', 'raw-one');
  write('DSC0001.JPG', 'jpg-one');
  write('DSC0001.ARW.xmp', 'xmp-one');
  const b = write('DSC0002.ARW', 'raw-two');
  const c = write('DSC0003.ARW', 'raw-three');

  const res = await sortFiles({
    root, destName: '_Rejects',
    files: [{ path: a, size: 7 }, { path: b, size: 7 }, { path: c, size: 999 }],
  });
  assert.strictEqual(res.frames, 2, 'two frames match');
  assert.strictEqual(res.missing, 1, 'the changed frame is left alone');
  assert.strictEqual(res.moved, 4, 'raw, jpg and xmp of frame 1 plus frame 2');
  assert.ok(fs.existsSync(path.join(root, '_Rejects', 'DSC0001.JPG')));
  assert.ok(fs.existsSync(c), 'frame 3 stays put');

  const undo = await unsortFiles(res.moves);
  assert.strictEqual(undo.restored, 4);
  assert.ok(fs.existsSync(a) && fs.existsSync(b));
  assert.ok(!fs.existsSync(path.join(root, '_Rejects')), 'empty _Rejects folder is removed');

  fs.rmSync(root, { recursive: true, force: true });
  console.log('sort tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
