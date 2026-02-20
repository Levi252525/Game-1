# Tiny Platformer

A browser platformer built with plain HTML, CSS, and JavaScript.

## Play locally

1. Open `index.html` in your browser.
2. Press **Start** to begin.
3. Move with **Arrow Left/Right** or **A / D**.
4. Jump / double jump with **Arrow Up**, **W**, or **Space**.
5. Press **Enter** to pause/resume.
6. Press **R** to restart your run.

## Game features

- **10 levels** from easy to hard.
- **Moving enemies** that damage health on contact.
- **Checkpoints** that update your respawn location.
- **Lives + health** system.
- **Game-over retry from current level** instead of level 1.
- **Double jump** for tighter platform sections.
- **Level-clear GIF playback** between levels.
- **Persistent best score** saved in `localStorage`.

## Goal

- Collect every coin in the current level.
- Reach the flag to move to the next level.
- Clear all 10 levels to win the run.

## Change game assets

This project now loads art files from the `assets/` folder.

Replace these files to re-skin the game:

- `assets/background.png` (or `background.gif` / `background.webp` / `background.jpg`)
- `assets/player.svg`
- `assets/platform.svg`
- `assets/coin.svg`
- `assets/flag.svg`

You can also use `PNG`, `JPG`, or `WebP` with the same base names.
Example: upload `assets/player.png` and it will be used automatically.

The game currently auto-detects your uploaded `assets/Isopoly_01.gif` and uses it as the background.
