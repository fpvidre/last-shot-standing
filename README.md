# Last Shot Standing

**Cull a photo shoot in rounds. Keep what's left.**

Last Shot Standing is a free photo culling app for Mac and Windows. Import a folder of RAWs, then go through the shoot full screen: press **2** to keep a frame and **1** to reject it. Keepers come back in the next round, and it keeps going around until a round goes by with no rejects. Those are your selects.

When you're done, one click moves the rejects into a `_Rejects` folder inside your shoot. Nothing is ever deleted, and **Put them back** undoes it.

## Download

Get the latest version from the [Releases page](https://github.com/fpvidre/last-shot-standing/releases/latest):

- **Mac:** `Last-Shot-Standing-<version>-universal.dmg` (Apple Silicon and Intel)
- **Windows:** `Last-Shot-Standing-Setup-<version>.exe`

### Updates

The app checks for new versions when it opens. On Windows it downloads them in the background and installs when you quit. On Mac it shows a notice with a **Download** button; install the new version over the old one.

### First launch

The app isn't code-signed yet, so your computer will warn you the first time.

- **Mac:** open the app, click **Done** on the warning, then go to **System Settings › Privacy & Security**, scroll down and click **Open Anyway**. After that it opens normally.
- **Windows:** on the "Windows protected your PC" screen, click **More info**, then **Run anyway**.

## What it does

- **Rounds:** full-screen keep or reject, one frame at a time, until only keepers remain.
- **Side by side:** press **C** to compare two frames. **Tab** switches which one 1 and 2 apply to.
- **Deep zoom:** scroll or pinch to zoom up to 800%, centered on your pointer, or press **Z** or click to jump to 100%. Past 200% you see the real pixels, unsmoothed. The zoom holds on the same spot as you move through a burst.
- **Bursts:** frames shot within a second of each other are grouped, with a dot for each frame in the top bar.
- **Auto-reject skipped:** flip the switch in the top bar and any frame you skip or don't reach is rejected when the round ends, instead of coming back. Sorting moves those frames too. Undo on the round summary puts them back.
- **Pick up later:** progress saves as you go. Import the same folder again to resume where you stopped.
- **Sorting:** rejects (or keepers) move into their own folder along with matching .JPG and .XMP files. A file only moves if its name and size still match the cull.

Supports the embedded previews in Sony (ARW), Canon (CR2, CR3), Nikon (NEF), Fujifilm (RAF), DNG, Olympus, Panasonic and Pentax RAW files, plus JPG.

## Keys

| Key | Action |
| --- | --- |
| 2 | Keep |
| 1 | Reject |
| → / ← | Skip / back |
| Z or Space | Zoom to 100% / back to fit |
| + / − | Zoom in / out a step (up to 800%) |
| Scroll or pinch | Zoom on the spot under your pointer |
| C | Side by side |
| Tab | Switch side |
| Backspace | Undo |
| G | Grid view |
| F | Back to rounds |

## Building it yourself

```bash
npm install
npm start          # run the app
npm test           # check the folder sorting
npm run dist       # build an installer into dist/
```

To publish a new version, change `version` in `package.json` (for example to `1.0.1`) and push to `main`. GitHub Actions builds the Mac and Windows apps and publishes them as release `v1.0.1`.

---

Made by [FPVI Productions](https://fpvi.productions). Fonts: Montserrat (SIL Open Font License) and Ubuntu (Ubuntu Font Licence), included in `app/fonts`.
