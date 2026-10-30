# Clip Librarian

A browser tool for planning live sets in **MPC 3** projects (`.xpj`). Open a project and you see its clip matrix as a grid: rows down the side, tracks across the top, just like on the MPC.

**Open it:** https://rossalexander78-wq.github.io/clip-librarian/

## What it does

- Shows every clip row and track, with track type, MIDI port and channel, and program changes.
- An inspector for each clip shows its notes as a piano roll and a list, plus program changes, CCs and audio.
- Reorder rows by dragging, with ↑/↓ or Alt+arrows. Single or multiple selection with Shift or Cmd/Ctrl.
- Copy, paste and delete rows, with undo and redo.
- Rename rows and clips and change their colours.
- Shows the musical key of each row and clip (a best guess from the notes), an overview of the keys in the set, and which rows mix well together by key (Camelot wheel).
- Reorder tracks.
- **Make a variation** of any clip: change its length, give it new notes in the same key, move it up or down in the key, invert or reverse it, make the rhythm busier, sparser, swung, double or half time, and give it natural velocity. Add it as a new row or replace the clip.
- **New project from these rows**: save just the selected rows as a separate project, to pull parts of a set out for recording.

Your original file is never changed. Saves always go to a new copy named "… Clip Librarian.xpj". Only the parts you edited are rewritten; every other byte of the project is kept as it was.

Everything runs in your browser and the project never leaves your computer.

## Files

- `index.html` is the built app (one self-contained page).
- `src/page.html` holds the interface and app code.
- `src/rows.js` holds the code that reads and rewrites the project file.
- `src/demo.json` is the made-up demo set shown on first open.
- `build.py` puts them together: `python3 build.py` writes `index.html`.

## Notes

Tested with MPC 3.9 projects. Keep a backup of your projects, and check saved copies on the MPC before relying on them in a set.
